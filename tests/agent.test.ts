import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, type TreasuryRule } from "../lib/agent";
import { toAtomic, fromAtomic, parseRay, withAttributionTag, edgeBps, effectiveRate } from "../lib/units";
import { isQuoteExpired, type FirmQuote } from "../lib/textile";

const rule: TreasuryRule = { keepPct: 30, minEdgeBps: 25, sellDecimals: 6, buyDecimals: 6 };
const ray = (n: number) => (BigInt(Math.round(n * 1e6)) * 10n ** 21n).toString(); // n with 6dp precision

test("atomic conversion round-trips", () => {
  assert.equal(toAtomic("12.5", 6), "12500000");
  assert.equal(toAtomic("0.000001", 6), "1");
  assert.equal(fromAtomic("12500000", 6), "12.5");
  assert.equal(fromAtomic("1000000", 6), "1");
  assert.throws(() => toAtomic("1.0000001", 6));
});

test("RAY parsing", () => {
  assert.equal(parseRay((15n * 10n ** 26n).toString()), 1.5);
  assert.equal(parseRay(ray(1550)), 1550);
});

test("edge bps", () => {
  assert.equal(edgeBps(1555, 1550), 32);
  assert.equal(edgeBps(1540, 1550), -65);
});

test("attribution suffix appending", () => {
  assert.equal(withAttributionTag("0xabcd", "12ef"), "0xabcd12ef");
  assert.equal(withAttributionTag("0xabcd"), "0xabcd");
  assert.equal(withAttributionTag("0xabcd", "0x12EF"), "0xabcd12ef");
  assert.throws(() => withAttributionTag("0xabcd", "xyz"));
});

test("rule: executes when edge >= threshold, keeps reserve", () => {
  const d = decide({ rule, sellBalanceAtomic: "100000000", quoteRateRay: ray(1555), benchmarkRate: 1550 });
  assert.equal(d.action, "execute");
  assert.equal(d.convertAmountAtomic, "70000000"); // 70% of 100
  assert.equal(d.keepAmountAtomic, "30000000");
});

test("rule: waits when edge below threshold", () => {
  const d = decide({ rule, sellBalanceAtomic: "100000000", quoteRateRay: ray(1551), benchmarkRate: 1550 });
  assert.equal(d.action, "wait");
});

test("rule: due date forces execution even at negative edge", () => {
  const d = decide({ rule: { ...rule, dueDate: "2026-01-01" }, sellBalanceAtomic: "100000000", quoteRateRay: ray(1500), benchmarkRate: 1550, now: new Date("2026-06-01") });
  assert.equal(d.action, "execute");
});

test("rule: no_quote waits; empty convertible waits", () => {
  assert.equal(decide({ rule, sellBalanceAtomic: "100000000", quoteRateRay: null, benchmarkRate: 1550 }).action, "wait");
  assert.equal(decide({ rule: { ...rule, keepPct: 100 }, sellBalanceAtomic: "100000000", quoteRateRay: ray(1600), benchmarkRate: 1550 }).action, "wait");
});

test("quote expiry honours expiresAt", () => {
  const q: FirmQuote = { rfqId: "x", status: "quoted", quote: { sellAmount: "1", buyAmount: "1", rateRay: "1", expiresAt: "2026-01-01T00:00:30.000Z" } };
  assert.equal(isQuoteExpired(q, new Date("2026-01-01T00:00:31Z").getTime()), true);
  assert.equal(isQuoteExpired(q, new Date("2026-01-01T00:00:10Z").getTime()), false);
});

test("effective rate from atomic amounts (live-shaped preview)", () => {
  // Shape of a real Celo preview on 2026-10-22: sell 100 USDT (6dp) -> buy 136172.729228 cNGN (6dp)
  const r = effectiveRate("100000000", "136172729228", 6, 6);
  assert.ok(Math.abs(r - 1361.72729228) < 1e-6);
});
