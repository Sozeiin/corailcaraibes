
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			screens: {
				'xs': '475px',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				marine: {
					50: '207 100% 97%',   // hsl equivalent of #f0f9ff
					100: '204 100% 94%',  // hsl equivalent of #e0f2fe
					200: '204 100% 86%',  // hsl equivalent of #bae6fd
					300: '204 100% 73%',  // hsl equivalent of #7dd3fc
					400: '199 95% 59%',   // hsl equivalent of #38bdf8
					500: '199 89% 48%',   // hsl equivalent of #0ea5e9
					600: '200 98% 39%',   // hsl equivalent of #0284c7
					700: '201 96% 32%',   // hsl equivalent of #0369a1
					800: '201 90% 27%',   // hsl equivalent of #075985
					900: '202 80% 24%',   // hsl equivalent of #0c4a6e
				},
				ocean: {
					50: '180 100% 97%',   // hsl equivalent of #ecfeff
					100: '185 96% 90%',   // hsl equivalent of #cffafe
					200: '186 94% 82%',   // hsl equivalent of #a5f3fc
					300: '187 85% 70%',   // hsl equivalent of #67e8f9
					400: '187 85% 53%',   // hsl equivalent of #22d3ee
					500: '188 83% 42%',   // hsl equivalent of #06b6d4
					600: '188 83% 35%',   // hsl equivalent of #0891b2
					700: '192 82% 31%',   // hsl equivalent of #0e7490
					800: '194 70% 27%',   // hsl equivalent of #155e75
					900: '196 64% 24%',   // hsl equivalent of #164e63
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-in': {
					'0%': {
						transform: 'translateX(-100%)'
					},
					'100%': {
						transform: 'translateX(0)'
					}
				},
				'wave': {
					'0%, 100%': {
						transform: 'rotate(0deg)'
					},
					'50%': {
						transform: 'rotate(3deg)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'slide-in': 'slide-in 0.3s ease-out',
				'wave': 'wave 2s ease-in-out infinite'
			},
			fontFamily: {
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
