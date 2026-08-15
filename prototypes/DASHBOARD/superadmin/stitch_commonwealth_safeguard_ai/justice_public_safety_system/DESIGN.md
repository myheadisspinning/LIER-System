---
name: Justice & Public Safety System
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
  on-surface-variant: '#434750'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737781'
  outline-variant: '#c3c6d1'
  surface-tint: '#395f98'
  primary: '#002753'
  on-primary: '#ffffff'
  primary-container: '#0f3d75'
  on-primary-container: '#85a9e8'
  inverse-primary: '#a9c7ff'
  secondary: '#1d4ed8'
  on-secondary: '#ffffff'
  secondary-container: '#4069f2'
  on-secondary-container: '#fffbff'
  tertiary: '#002e28'
  on-tertiary: '#ffffff'
  tertiary-container: '#00463e'
  on-tertiary-container: '#20bcaa'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#a9c7ff'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#1d477f'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b7c4ff'
  on-secondary-fixed: '#001551'
  on-secondary-fixed-variant: '#0039b5'
  tertiary-fixed: '#71f8e4'
  tertiary-fixed-dim: '#4fdbc8'
  on-tertiary-fixed: '#00201c'
  on-tertiary-fixed-variant: '#005048'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
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
    fontSize: 16px
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
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
---

## Brand & Style
The design system is engineered for law enforcement and high-stakes incident reporting, prioritizing clarity, authority, and rapid information processing. The aesthetic follows a **Modern Corporate** movement—blending the structured reliability of enterprise software with the breathable, functional minimalism found in modern productivity tools.

The interface must evoke a sense of calm and precision. It utilizes a vast amount of whitespace to reduce cognitive load during critical decision-making. High-contrast typography and subtle elevation ensure that the hierarchy of information is immediately apparent, even in high-pressure environments.

## Colors
The palette is rooted in a deep Navy Blue (`#0F3D75`) to establish institutional trust and authority. Royal Blue serves as the functional primary for interactive elements and call-to-actions, while Teal is used sparingly for data visualization and secondary highlights.

- **Primary (Navy):** Used for persistent navigation, headers, and structural elements.
- **Secondary (Royal):** Used for primary buttons, active states, and links.
- **Accent (Teal):** Used for non-critical information badges and data trends.
- **Background:** A cool-toned off-white (`#F8FAFC`) separates the UI from the standard pure white of content cards.
- **Semantic Colors:** Strict adherence to Green (Success), Amber (Warning), and Red (Danger) for incident priority levels and system status.

## Typography
This design system employs a dual-font strategy. **Plus Jakarta Sans** is used for headings to provide a modern, approachable, yet professional character. Its slightly wider apertures improve readability at a distance. 

**Inter** is the workhorse for all body copy, data tables, and forms. It is selected for its exceptional legibility in dense information environments and its neutral, systematic tone. 

- **Weight Usage:** Use `600` for primary emphasis in UI labels and `400` for long-form report text.
- **Scaling:** Headlines shift significantly on mobile to ensure content remains the focus without excessive scrolling.

## Layout & Spacing
The layout relies on a **Fixed Grid** system for desktop (max-width 1440px) to ensure data density remains consistent across professional monitors. 

- **Grid:** 12-column layout with 24px gutters.
- **Rhythm:** An 8px linear scale (referenced as `base * n`) governs all padding and margins. 
- **Mobile:** Content reflows to a single column with 16px side margins. 
- **Dashboards:** Use a "Masonry-lite" card approach where widgets span 3, 6, or 12 columns depending on data complexity.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** and **Ambient Shadows**. 

- **Surface 0:** The main background (`#F8FAFC`).
- **Surface 1:** White cards (`#FFFFFF`) with a subtle 1px border in `#E2E8F0`.
- **Shadows:** Use a "Soft Lift" shadow for interactive cards: `0px 4px 12px rgba(15, 61, 117, 0.05)`. 
- **Active State:** Elements like hovered cards or open modals use a more pronounced, diffused shadow to indicate focus and priority. 
- **Overlays:** Modals use a background blur (12px) on the backdrop to maintain context while focusing the user on the task at hand.

## Shapes
The shape language is "Rounded-Industrial." Standard UI elements like inputs and buttons use a **0.5rem (8px)** radius. 

- **Cards:** Use a specific **12px** radius to soften the enterprise feel.
- **Badges/Chips:** Use a fully rounded (pill) shape to differentiate them from interactive buttons.
- **Checkboxes:** Unlike standard square boxes, these use a **4px** radius to align with the overall soft-geometric theme.

## Components
- **Buttons:** Primary buttons use Royal Blue with white text. Ghost buttons use a Navy border for secondary actions.
- **Data Tables:** High-density rows (48px height) with light grey dividers. The header row uses a subtle Navy tint (`#F1F5F9`) with `label-md` typography.
- **Status Badges:** Use a "Light Fill" style. For example, a "High Priority" badge has a light red background with bold red text.
- **Input Fields:** 1px border in `#CBD5E1`. On focus, the border transitions to Royal Blue with a 2px outer glow.
- **Toggle Switches:** Used for system settings (e.g., "Active Patrol"). The track should be Neutral Grey when off and Royal Blue when on.
- **Incident Cards:** Should include a 4px vertical accent bar on the left edge, colored by the priority/semantic status of the incident.
- **Navigation:** A vertical sidebar in Navy Blue with high-contrast white icons and text for top-level navigation.