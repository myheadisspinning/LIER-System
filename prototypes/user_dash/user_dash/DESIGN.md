---
name: Commonwealth Safety Design System
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
  tertiary-fixed: '#ffdf9f'
  tertiary-fixed-dim: '#f9bd22'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5c4300'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Poppins
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Poppins
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Poppins
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system is engineered to project **authority, transparency, and urgent reliability**. As a public safety and government portal for Barangay Commonwealth, the visual narrative balances the gravity of civic duty with the modern efficiency of a premium digital service. 

The aesthetic is **Corporate Modern with Glassmorphism accents**. It utilizes high-contrast typography and structured layouts to ensure information accessibility while employing frosted glass effects and subtle gradients to feel contemporary and high-end. The goal is to instill a sense of security and trust in the residents of Quezon City through a precise, organized, and polished interface.

## Colors

The palette is anchored by **Deep Navy Blue**, representing the stability and tradition of government institutions. **Royal Blue** serves as the primary action color, providing a modern, digital-first energy. **Gold** is used sparingly as an accent to denote premium status, high-priority alerts, or official seals.

- **Primary (Navy):** Used for headers, heavy branding, and primary navigation backgrounds.
- **Secondary (Royal):** Used for interactive elements, links, and progress indicators.
- **Accent (Gold):** Reserved for recognition, official badges, and specific "Staff" or "Premium" touchpoints.
- **Semantic Colors:** Emerald Green and Crimson Red are strictly utilized for status updates and emergency alerts to maintain clear visual communication.

## Typography

This design system uses a dual-font strategy. **Poppins** provides a friendly yet authoritative geometric structure for headlines, making the government's message feel modern and accessible. **Inter** is the workhorse for body text, chosen for its exceptional legibility in data-heavy safety reports and official documentation.

Hierarchy is maintained through generous line heights and distinct weight contrasts. Large displays use negative letter spacing for a tighter, more "editorial" look, while labels utilize uppercase tracking to denote systemic hierarchy.

## Layout & Spacing

The layout follows a **Fluid Grid System** with strict constraints to maintain an authoritative structure. 

- **Desktop:** 12-column grid with 24px gutters and 64px side margins. Content is typically contained to a maximum width of 1440px.
- **Tablet:** 8-column grid with 20px gutters and 32px side margins.
- **Mobile:** 4-column grid with 16px gutters and 16px side margins.

Spacing follows an 8px base unit. Component internal padding should prioritize "breathability" to reduce cognitive load during emergency situations, using `md` (24px) as the standard container padding.

## Elevation & Depth

To achieve the "Government Portal" aesthetic, depth is communicated through a mix of **Ambient Shadows** and **Glassmorphism**.

1.  **Glassmorphism:** Navigation sidebars and modal overlays use a background blur (12px to 20px) with a semi-transparent white or navy fill (opacity 70-85%). A 1px translucent border provides a "crystal" edge.
2.  **Shadows:** Elevated cards use soft, multi-layered shadows with a low-opacity navy tint (`rgba(15, 23, 42, 0.08)`) to avoid a "dirty" look on the light gray background.
3.  **Tonal Layers:** Surfaces are layered from the background (`#F8FAFC`) to the primary surface (`#FFFFFF`), with glass layers sitting at the highest perceived elevation.

## Shapes

The design system utilizes **Large Rounded Corners** to soften the traditional rigidity of government interfaces, making the technology feel more approachable. 

- **Main Containers & Cards:** Use `radius-2xl` (24px) for a modern, friendly feel.
- **Buttons & Inputs:** Use `radius-lg` (12px) to maintain a professional balance.
- **Status Badges:** Use pill-shaped (fully rounded) geometry to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Gradient fill (Royal Blue to Deep Navy) with white text and a soft shadow. 
- **Emergency:** Solid Crimson Red with high-contrast white text and a pulse animation effect for high-priority alerts.
- **Secondary/Ghost:** 1.5px border in Navy or Blue with no fill, transitioning to a glass effect on hover.

### Cards
- Standard cards feature `radius-2xl`, white backgrounds, and a subtle 1px border (`#E2E8F0`). 
- Emergency cards utilize a thick left-border accent in the semantic color (Red/Yellow/Green).

### Input Fields
- Inputs should be tall (min-height 48px) with `radius-lg` and a background color of `#F1F5F9`. On focus, the border transitions to Royal Blue with a 3px soft glow.

### Glass Overlays
- Sidebars and mobile menus must use the `backdrop-filter: blur(16px)` property with a semi-transparent Deep Navy (`#0F172A` at 80% opacity) for a premium, high-tech look.

### Chips & Badges
- Used for safety categories (e.g., "Fire Safety", "Public Health"). These should use the Royal Blue color at 10% opacity for the background and 100% opacity for the text.