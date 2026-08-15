---
name: Sentinel Civic
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#444653'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#611e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#872d00'
  on-tertiary-container: '#ffa583'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#802a00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Work Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Work Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Work Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Work Sans
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
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  container-padding: 24px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width: 1280px
---

## Brand & Style

The design system is engineered for high-stakes public safety environments, prioritizing clarity, chain-of-custody integrity, and institutional trust. The brand personality is authoritative and stoic, yet accessible to civilians. 

The aesthetic follows a **Corporate / Modern** approach with a clinical, "Government-grade" precision. It utilizes a structured hierarchy, ample whitespace to reduce cognitive load during high-stress data entry, and sharp, intentional visual cues that signal security and verification. The UI should evoke a sense of an immutable digital vault—stable, transparent, and legally defensible.

## Colors

The palette is anchored in a neutral, off-white foundation to ensure maximum legibility and a "clean room" feel. 

- **Primary (Navy):** Used for primary actions, navigation headers, and authoritative UI elements. It represents stability and the "State."
- **Secondary (Cyan/Blue):** Reserved for interactive highlights, metadata tags, and secondary call-to-outs.
- **Surface Strategy:** Backgrounds utilize the base Neutral (#F8FAFC), while all functional containers and cards must be Pure White (#FFFFFF) to create a clear "layer of truth" against the canvas.
- **Semantic Status:** 
  - **Emerald (#10B981):** Indicates cryptographic verification and successful audit logs.
  - **Amber (#F59E0B):** Signals unlinked evidence or items requiring administrative review.
  - **Navy (#1E40AF):** Indicates established links between evidence and active cases.

## Typography

The typography system employs a dual-purpose strategy to balance readability with technical precision.

- **Headings (Work Sans):** Chosen for its professional, grounded, and slightly wider stance, providing an institutional feel for titles and section headers.
- **Body (Inter):** Used for all functional text, form labels, and data grids. It provides a systematic, neutral reading experience.
- **Technical (JetBrains Mono):** This is a critical functional element. All cryptographic hashes, file signatures, case IDs, and audit timestamps must be rendered in this monospaced font to differentiate "System Truth" from "User Content."

## Layout & Spacing

This design system utilizes a **Fixed Grid** approach for desktop to maintain a sense of controlled, secure order, and a **Fluid Grid** for mobile to ensure field accessibility.

- **Desktop:** 12-column grid with a 1280px max-width centered on the screen. 
- **Rhythm:** A 4px baseline grid governs all spacing. Vertical rhythm is strictly enforced to maintain the "ledger" feel of evidence logs.
- **Margins:** Large 48px outer margins on desktop create a "frame" that isolates the secure content from the browser environment.
- **Reflow:** On mobile devices, the 12-column grid collapses to a single column. All White (#FFFFFF) containers should extend to the full width of the screen to maximize horizontal space for data, while retaining internal 16px padding.

## Elevation & Depth

To maintain a flat, authoritative, and non-distracting UI, this design system avoids heavy shadows. Depth is communicated through **Low-Contrast Outlines** and **Tonal Layers**.

- **Level 0 (Canvas):** The Off-white (#F8FAFC) background.
- **Level 1 (Containers):** Pure White (#FFFFFF) surfaces with a 1px solid Gray border (#E2E8F0). This is the standard for all evidence cards and content blocks.
- **Level 2 (Interaction):** When a user interacts with a card or element, a subtle, highly diffused Navy-tinted shadow (4% opacity) may be applied to indicate focus.
- **Separators:** Use 1px #E2E8F0 borders for all internal list divisions. Do not use color-filled dividers; maintain the white-space integrity.

## Shapes

The shape language is **Soft (0.25rem)**. This slight rounding removes the "aggression" of sharp corners while maintaining a professional, structured appearance. 

- **Evidence Thumbnails:** Use a 0.25rem radius.
- **Input Fields:** Use a 0.25rem radius to denote "enclosed data."
- **Status Tags:** Use a fully rounded (pill) shape to distinguish them clearly from interactive buttons or static containers.

## Components

### Buttons
- **Primary:** Navy (#1E40AF) background with White text. No gradients. 0.25rem radius.
- **Secondary:** White background with 1px Navy (#1E40AF) border and Navy text.
- **Danger:** White background with 1px Red (#B91C1C) border; reserved for "Purge Evidence" or "Revoke Access."

### Input Fields
Inputs must have a 1px #E2E8F0 border. Upon focus, the border shifts to Cyan (#0284C7) with a subtle 2px glow. Labels are always `body-sm` and positioned above the field.

### Evidence Cards
The core unit of the UI. Must have a Pure White background, a 1px #E2E8F0 border, and internal padding of 24px. The top-right corner is reserved for the Status Indicator pill.

### Status Indicators (Pills)
- **Verified:** Emerald background (10% opacity) with Emerald text. Includes a checkmark icon.
- **Warning:** Amber background (10% opacity) with Amber text. Includes an exclamation icon.
- **Linked:** Navy background (10% opacity) with Navy text. Includes a link icon.

### Audit Logs
Rendered as a dense list using `code-md` for the timestamp and hash, and `body-sm` for the action description. Every line item is separated by a 1px #E2E8F0 divider.

### Checkboxes
Square with 2px rounded corners. When checked, use Navy (#1E40AF) with a white checkmark. No soft shadows.