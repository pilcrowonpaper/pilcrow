const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
	theme: {
		screens: {
			xs: "475px",
			...defaultTheme.screens
		},
		extend: {
			colors: {
				main: "#2d7fe3",
				zinc: {
					80: "#f7f7f7",
					450: "#85858f"
				}
			},
			fontSize: {
				"1.5xl": ["1.375rem", "1.75rem"],
				"2.5xl": ["1.75rem", "2rem"],
				"4.5xl": "2.5rem",
				"code-sm": "0.825rem",
				"code-base": "0.925rem",
				"code-lg": "1.12rem",
				"code-xl": "1.2rem",
				"code-2xl": "1.45rem",
				"code-3xl": "1.825rem",
				"code-4xl": "2.15rem",
				"code-5xl": "2.9rem"
			}
		}
	},
	plugins: []
};
