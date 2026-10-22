import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}","./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink:"#070b12", panel:"#0c1320", edge:"#1c2a44", mint:"#35e0b0", gold:"#f5c04e", muted:"#8fa3bf" }, fontFamily: { sans: ["Inter","system-ui","sans-serif"], mono: ["ui-monospace","SFMono-Regular","monospace"] } } },
  plugins: [],
};
export default config;
