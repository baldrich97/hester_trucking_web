/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  /** Preflight resets `button { background-color: transparent }`, which can beat MUI contained styles in the cascade. MUI `CssBaseline` already normalizes layout. */
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
