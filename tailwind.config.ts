import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          muted: "hsl(var(--destructive-muted))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          muted: "hsl(var(--success-muted))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          muted: "hsl(var(--warning-muted))",
        },
        brand: {
          DEFAULT: "hsl(var(--brand))",
          foreground: "hsl(var(--brand-foreground))",
          ink: "hsl(var(--brand-ink))",
          strong: "hsl(var(--brand-strong))",
          muted: "hsl(var(--brand-muted))",
        },
        "chart-ink": "hsl(var(--chart-ink))",
        espresso: {
          DEFAULT: "hsl(var(--espresso))",
          foreground: "hsl(var(--espresso-foreground))",
        },
        amber: {
          DEFAULT: "hsl(var(--amber))",
          foreground: "hsl(var(--amber-foreground))",
          deep: "hsl(var(--amber-deep))",
        },
        /* The two logo colours as full ramps. Prefer the semantic tokens
           above; reach for these when a shade has no semantic name yet. */
        ink: {
          950: "hsl(var(--ink-950))",
          900: "hsl(var(--ink-900))",
          800: "hsl(var(--ink-800))",
          700: "hsl(var(--ink-700))",
          600: "hsl(var(--ink-600))",
          500: "hsl(var(--ink-500))",
          400: "hsl(var(--ink-400))",
          300: "hsl(var(--ink-300))",
        },
        rust: {
          800: "hsl(var(--rust-800))",
          700: "hsl(var(--rust-700))",
          600: "hsl(var(--rust-600))",
          500: "hsl(var(--rust-500))",
          400: "hsl(var(--rust-400))",
          300: "hsl(var(--rust-300))",
          200: "hsl(var(--rust-200))",
          100: "hsl(var(--rust-100))",
        },
        beige: {
          DEFAULT: "hsl(var(--beige))",
          deep: "hsl(var(--beige-deep))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        bento: "1.5rem",      /* 24px — standard bento card */
        "bento-lg": "1.75rem", /* 28px — outer / hero cards */
        "2xl": "1.25rem",
        xl: "1rem",
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
      /* Warm elevation, tinted with the logo brown rather than black, so a
         raised surface reads as paper warming instead of a grey haze. The
         values live in globals.css so dark mode can deepen them. */
      boxShadow: {
        xs: "var(--shadow-xs)",
        soft: "var(--shadow-sm)",
        card: "var(--shadow-sm)",
        lift: "var(--shadow-md)",
        float: "var(--shadow-lg)",
        pop: "var(--shadow-pop)",
        glow: "0 0 0 1px hsl(var(--brand) / 0.25)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.42s cubic-bezier(0.22,1,0.36,1)",
      },
    },
  },
  plugins: [animate],
};

export default config;
