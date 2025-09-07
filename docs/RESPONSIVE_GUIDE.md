# Responsive Utilities Guide

This project includes several utility classes to help build tablet-friendly layouts between 768px and 1024px.

## Typography
- `.h1-responsive` – `clamp(18px, 2.2vw, 22px)` with `line-height:1.3`
- `.h2-responsive` – `clamp(16px, 2vw, 20px)` with `line-height:1.35`
- `.h3-responsive` – `clamp(14px, 1.8vw, 18px)` with `line-height:1.4`

Apply these classes to heading elements to keep titles readable on tablets.

## Spacing
Use the existing spacing helpers:
- `.p-responsive`, `.px-responsive`, `.py-responsive`
- `.gap-responsive`, `.space-y-responsive`

These utilities provide `16–24px` padding and `12–24px` gaps across breakpoints.

## Components
- Buttons and inputs now enforce a minimum touch target of `44px`.
- Tables are wrapped in `overflow-x-auto` with sticky headers for horizontal scrolling.
- The sidebar collapses into a drawer on screens under `1024px`.

Use Tailwind `md:` and `lg:` prefixes for tablet portrait and landscape adjustments respectively.
