import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				glow: 'hsl(var(--primary-glow))',
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
  				glow: 'hsl(var(--accent-glow))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			accent: 'var(--shadow-accent)',
  			elegant: '0 10px 30px -10px hsl(var(--primary) / 0.3)',
  			glow: '0 0 40px hsl(var(--primary-glow) / 0.4)',
  			premium: '0 20px 50px -12px hsl(var(--primary) / 0.25), 0 8px 16px -8px hsl(var(--primary) / 0.3)',
  			soft: '0 2px 8px -1px hsl(var(--foreground) / 0.1), 0 1px 2px -1px hsl(var(--foreground) / 0.06)',
  			depth: '0 4px 12px -2px hsl(var(--foreground) / 0.15), 0 2px 4px -2px hsl(var(--foreground) / 0.1)',
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		},
  		backgroundImage: {
  			'gradient-primary': 'var(--gradient-primary)',
  			'gradient-accent': 'var(--gradient-accent)',
  			'gradient-success': 'var(--gradient-success)'
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
  			'slide-in-left': {
  				'0%': {
  					transform: 'translateX(-100%)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateX(0)',
  					opacity: '1'
  				}
  			},
  			'slide-in-right': {
  				'0%': {
  					transform: 'translateX(100%)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateX(0)',
  					opacity: '1'
  				}
  			},
  			'slide-out-left': {
  				'0%': {
  					transform: 'translateX(0)',
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'translateX(-100%)',
  					opacity: '0'
  				}
  			},
  			'slide-out-right': {
  				'0%': {
  					transform: 'translateX(0)',
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'translateX(100%)',
  					opacity: '0'
  				}
  			},
  			'slide-up': {
  				'0%': {
  					transform: 'translateY(100%)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'slide-down': {
  				'0%': {
  					transform: 'translateY(-100%)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			'fade-out': {
  				'0%': {
  					opacity: '1'
  				},
  				'100%': {
  					opacity: '0'
  				}
  			},
  			'scale-in': {
  				'0%': {
  					transform: 'scale(0.95)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			'scale-out': {
  				'0%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				},
  				'100%': {
  					transform: 'scale(0.95)',
  					opacity: '0'
  				}
  			},
  			'bounce-in': {
  				'0%': {
  					transform: 'scale(0.8)',
  					opacity: '0'
  				},
  				'50%': {
  					transform: 'scale(1.05)'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			'float': {
  				'0%, 100%': {
  					transform: 'translateY(0px) translateX(0px)'
  				},
  				'25%': {
  					transform: 'translateY(-20px) translateX(10px)'
  				},
  				'50%': {
  					transform: 'translateY(-10px) translateX(-10px)'
  				},
  				'75%': {
  					transform: 'translateY(-15px) translateX(5px)'
  				}
  			},
  			'bounce-x': {
  				'0%, 100%': {
  					transform: 'translateX(0)'
  				},
  				'50%': {
  					transform: 'translateX(5px)'
  				}
  			},
  			'wiggle': {
  				'0%, 100%': {
  					transform: 'rotate(-3deg)'
  				},
  				'50%': {
  					transform: 'rotate(3deg)'
  				}
  			},
  			'shake': {
  				'0%, 100%': {
  					transform: 'translateX(0)'
  				},
  				'10%, 30%, 50%, 70%, 90%': {
  					transform: 'translateX(-5px)'
  				},
  				'20%, 40%, 60%, 80%': {
  					transform: 'translateX(5px)'
  				}
  			},
  			'spin-slow': {
  				'0%': {
  					transform: 'rotate(0deg)'
  				},
  				'100%': {
  					transform: 'rotate(360deg)'
  				}
  			},
  			'pulse-glow': {
  				'0%, 100%': {
  					boxShadow: '0 0 10px var(--primary-glow)'
  				},
  				'50%': {
  					boxShadow: '0 0 20px var(--primary-glow)'
  				}
  			},
  			'zoom-in': {
  				'0%': {
  					transform: 'scale(0)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			'flip': {
  				'0%': {
  					transform: 'rotateY(0deg)'
  				},
  				'100%': {
  					transform: 'rotateY(180deg)'
  				}
  			},
  			'bounce-subtle': {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-2px)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'slide-in-left': 'slide-in-left 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  			'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  			'slide-out-left': 'slide-out-left 0.3s ease-in-out',
  			'slide-out-right': 'slide-out-right 0.3s ease-in-out',
  			'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  			'slide-down': 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'fade-out': 'fade-out 0.3s ease-in',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'scale-out': 'scale-out 0.2s ease-in',
  			'bounce-in': 'bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  			'float': 'float 3s ease-in-out infinite',
  			'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
  			'bounce-x': 'bounce-x 1s ease-in-out infinite',
  			'wiggle': 'wiggle 0.5s ease-in-out infinite',
  			'shake': 'shake 0.5s ease-in-out',
  			'spin-slow': 'spin-slow 3s linear infinite',
  			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
  			'zoom-in': 'zoom-in 0.3s ease-out',
  			'flip': 'flip 0.6s ease-in-out',
  			'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite'
  		},
  		transitionTimingFunction: {
  			smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  			bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			serif: [
  				'Lora',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'Space Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
