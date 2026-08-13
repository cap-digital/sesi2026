import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./components/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--page)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        brand: "var(--brand)",
        brandDeep: "var(--brand-deep)",
        accent: "var(--accent)",
        ink: "var(--ink)",
        ink2: "var(--ink-2)",
        muted: "var(--muted)",
        grid: "var(--grid)",
        hairline: "var(--line)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px -12px rgba(16,24,40,0.10)",
        float:
          "0 2px 6px rgba(16,24,40,0.06), 0 18px 40px -16px rgba(16,24,40,0.22)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up .28s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
