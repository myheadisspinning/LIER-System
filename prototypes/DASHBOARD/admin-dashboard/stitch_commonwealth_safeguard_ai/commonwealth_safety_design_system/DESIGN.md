---
name: Tactical Command
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#261a00'
  on-tertiary-container: '#a87d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#ffdfa0'
  tertiary-fixed-dim: '#f9bd22'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
  sidebar-bg: '#0f172a'
  surface-bg: '#f8fafc'
  border-subtle: '#e2e8f0'
  success-green: '#22c55e'
  error-red: '#ef4444'
  warning-amber: '#f59e0b'
  text-on-dark: '#cbd5e1'
typography:
  display-lg:
    fontFamily: Poppins
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Poppins
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
    fontFamily: Poppins
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.025em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  caps-xs:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  gutter: 24px
  margin-desktop: 40px
  sidebar-width: 256px
---

## Brand & Style
The brand personality is **authoritative, high-performance, and mission-critical**. Designed for the "Commonwealth Command Center," the UI evokes a sense of urgent reliability and surgical precision. 

The style is **Modern Corporate with a Tactical Edge**. It utilizes a deep navy and slate foundation (Commonly found in defense or government software) punctuated by vibrant "action" colors like high-visibility blue and alert red. The interface maintains a strict, clean density, favoring information richness over excessive whitespace. It feels like a digital cockpit where every pixel serves a functional purpose, utilizing subtle borders and tonal layering to organize complex data streams.

## Colors
The palette is rooted in a professional, high-contrast spectrum.
- **Primary (#0f172a):** A deep "Slate 950" used for sidebars and primary navigation, providing a grounded, serious anchor.
- **Secondary (#2563eb):** A "Vivid Blue" reserved for primary actions, active states, and tactical highlights.
- **Tertiary (#f9bd22):** A "Caution Yellow" used for pending states and highlighting areas requiring human verification.
- **Neutral (#64748b):** A mid-tone grey used for metadata, borders, and secondary text.

The system uses **Tonal Intent**: Green signifies "On Duty/Optimal," Blue signifies "AI/Optimized," and Red signifies "Active Incident/Critical Error." Backgrounds remain a very clean white (#ffffff) or light slate (#f8fafc) to maintain legibility.

## Typography
Typography is split between **Poppins** for brand-level headlines and **Inter** for all functional data.
- **Poppins** is used for the logo and main section headers to provide a clean, modern geometric feel.
- **Inter** handles the heavy lifting for data density. It is the primary workhorse for tables, logs, and status readouts.
- **Tactical Labels:** A specialized "caps-xs" style is used for metadata and eyebrow text (e.g., "CORE OPERATIONS"), ensuring information hierarchy is maintained without cluttering the screen.
- **Weight Strategy:** Utilize Bold (700) for navigation elements and Semibold (600) for section headers. Regular (400) is used for body copy to maximize readability in data-heavy modules.

## Layout & Spacing
The layout follows a **Fluid Grid with Fixed Sidebar** model. 
- **The Sidebar** is fixed at 256px (w-64), creating a permanent navigational anchor.
- **Main Content** uses a 12-column responsive grid system.
- **Gutters** are set to a consistent 24px (1.5rem) to provide enough breathing room between high-density data cards.
- **Section Margins:** Desktop layouts utilize a generous 40px margin around the main container to separate the command dashboard from the fixed navigation edges.
- **Information Density:** Vertical spacing within cards is tight (base 8px) to maximize "above the fold" data visibility.

## Elevation & Depth
Depth is conveyed through **Low-Contrast Outlines and Tonal Layers** rather than heavy shadows.
- **Base Layer:** Background is neutral light slate (#f8fafc).
- **Surface Layer:** White cards (#ffffff) use a subtle 1px border (#e2e8f0).
- **Interactive Depth:** Hover states on table rows and sidebar links use low-opacity backgrounds (e.g., `white/5` or `slate-50`) rather than lifting the element.
- **Shadows:** Minimal usage. When applied (e.g., the Quick Dispatch button), a multi-layered, soft shadow (shadow-2xl) is used to indicate an element that exists in the highest Z-space.
- **Z-Index Strategy:** The sidebar and header are treated as fixed "structural" layers with an RLS (Row Level Security) bar acting as a status footing at the bottom of the viewport.

## Shapes
The shape language is **Softly Squared**, striking a balance between professional rigidity and modern approachability.
- **Standard Cards:** Use 0.75rem (rounded-xl) for a distinct, containerized look.
- **Buttons & Inputs:** Use 0.375rem (rounded-lg) for a more compact, tool-like appearance.
- **Active Indicators:** Vertical accent bars on the left of cards and sidebar items have fully rounded caps (rounded-full) but remain narrow to act as visual cues rather than shapes.
- **Status Pills:** Utilize fully rounded (pill-shaped) geometry to distinguish "tags" from "buttons."

## Components
- **Primary Action (Quick Dispatch):** A circular FAB (Floating Action Button) in the secondary color with a 4px white border to ensure visibility over any background.
- **Data Cards:** Every card must have a consistent padding of 24px and should include a "Tactical Eyebrow" (10px Bold Caps) for categorization.
- **Status Badges:** Compact pills with light background tints (e.g., Green 50) and dark text (Green 600) for maximum contrast and quick scanning.
- **Tables:** No vertical lines. Use horizontal 1px `slate-50` dividers only. Headers should be 10px uppercase with high tracking.
- **Inputs:** Search fields use a subtle grey background (#f1f5f9) and include left-aligned icons to reduce visual weight compared to standard outlined fields.
- **Sidebar Navigation:** Multi-line items with a primary label and secondary 10px description to aid user orientation.