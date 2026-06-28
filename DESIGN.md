---
name: Atelier Couture System
colors:
  surface: '#fdf9f6'
  surface-dim: '#ddd9d6'
  surface-bright: '#fdf9f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3f0'
  surface-container: '#f1edea'
  surface-container-high: '#ebe7e4'
  surface-container-highest: '#e5e2df'
  on-surface: '#1c1b1a'
  on-surface-variant: '#504441'
  inverse-surface: '#31302f'
  inverse-on-surface: '#f4f0ed'
  outline: '#827470'
  outline-variant: '#d4c3be'
  surface-tint: '#75584d'
  primary: '#72564c'
  on-primary: '#ffffff'
  primary-container: '#8d6e63'
  on-primary-container: '#fffcff'
  inverse-primary: '#e4beb2'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#675a56'
  on-tertiary: '#ffffff'
  tertiary-container: '#81726e'
  on-tertiary-container: '#fffdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#e4beb2'
  on-primary-fixed: '#2b160f'
  on-primary-fixed-variant: '#5b4137'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#f2ded9'
  tertiary-fixed-dim: '#d5c3be'
  on-tertiary-fixed: '#231916'
  on-tertiary-fixed-variant: '#514440'
  background: '#fdf9f6'
  on-background: '#1c1b1a'
  surface-variant: '#e5e2df'
typography:
  display-lg:
    fontFamily: Bodoni Moda
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bodoni Moda
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Bodoni Moda
    fontSize: 28px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Bodoni Moda
    fontSize: 24px
    fontWeight: '400'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.1em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 80px
  section-padding: 120px
---

## Brand & Style

The design system is rooted in the concepts of **Modern Minimalism** and **Artisanal Craft**. It is designed for "Lelia Brito - Modistería y Costura," targeting a high-end clientele that values bespoke quality, attention to detail, and a sophisticated aesthetic. 

The visual direction avoids corporate rigidity in favor of an editorial, "lifestyle" feel. It balances expansive whitespace (the "breathing room" of a luxury atelier) with delicate, intentional accents. The emotional response should be one of calm reliability, timeless elegance, and premium approachability.

Key stylistic markers include:
- **Quiet Luxury:** High-contrast typography paired with soft, tonal backgrounds.
- **Organic Precision:** A mix of perfectly aligned grids and soft, rounded elements that mimic the drape of fabric.
- **Tactile Sensitivity:** Use of subtle drop shadows and hair-line borders to suggest physical layers and depth.

## Colors

The palette is inspired by the natural materials of dressmaking—linen, silk, and metallic hardware. 

- **Backgrounds:** Use the light beige (`#FDFBF9`) for primary content areas to maintain a clean, airy feel. Use the dusty rose (`#F4E7E4`) for sectional transitions or secondary containers to provide warmth.
- **Primary (Earthy Brown):** Reserved for primary actions, main headings, and structural lines. It provides the necessary "anchor" to the lighter palette.
- **Secondary (Subtle Gold):** Used sparingly for highlighting premium features, active states, or decorative icons.
- **Neutral:** A range of soft creams and off-whites that prevent the interface from feeling "stark white" or sterile.

## Typography

Typography in this design system is used as a primary design element. The high contrast between the serif headlines and sans-serif body text creates a rhythmic, editorial flow.

- **Headlines:** Use **Bodoni Moda**. Its high-contrast strokes evoke fashion magazines and premium branding. Track displays slightly tighter for a modern look.
- **Body:** Use **Hanken Grotesk**. This typeface provides a clean, contemporary counterpoint to the decorative serif, ensuring legibility for services and descriptions.
- **Labels:** Use uppercase Hanken Grotesk with increased letter spacing for navigation, small badges, and categories to denote authority and organization.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** model on desktop to mimic the structured yet graceful layout of a lookbook. 

- **Grid:** A 12-column grid is used for desktop (max-width 1280px). For mobile, a 4-column fluid grid is employed.
- **Rhythm:** This design system prioritizes vertical "breathing room." Use generous `section-padding` to separate different parts of the narrative.
- **Asymmetry:** Occasionally break the grid with images or text blocks that overlap container boundaries by 10-15%, suggesting the fluidity of fabric draped over a frame.
- **Breakpoints:**
  - Mobile: < 768px (reduced margins, stacked columns).
  - Tablet: 768px - 1024px (16px gutters, 40px margins).
  - Desktop: > 1024px (24px gutters, fixed centered container).

## Elevation & Depth

Depth is achieved through **Tonal Layers** and **Ambient Shadows** rather than heavy shadows or bevels.

- **Surfaces:** Use subtle shifts in background color (e.g., a dusty rose card on a beige background) to denote hierarchy.
- **Shadows:** Use extremely soft, low-opacity shadows (`rgba(62, 39, 35, 0.05)`) with high blur radii (20px+) to make components appear as if they are floating gently above the surface.
- **Outlines:** Use "Hairline" borders (0.5px or 1px) in a slightly darker shade of the background color for cards and input fields to maintain a delicate, artisanal feel.

## Shapes

The shape language is **Rounded**, reflecting the soft curves of the human form and the organic nature of tailoring.

- **Primary Elements:** Buttons and cards use a 0.5rem (8px) radius.
- **Images:** Photography should utilize larger radii (1rem to 1.5rem) or occasionally "organic" masks (as seen in the reference image) to emphasize the artisanal, non-industrial nature of the business.
- **Icons:** Use thin-stroke icons (1px or 1.5px) with rounded caps to match the typography's refinement.

## Components

### Buttons
- **Primary:** Solid Earthy Brown with white or gold text. Rectangular with 8px corner radius.
- **Secondary:** Outlined with a 1px border in Earthy Brown. Transparent background.
- **Text Action:** All-caps label font with a subtle 1px underline that expands on hover.

### Cards
- Used for showcasing services or portfolio items.
- Minimal styling: thin borders or very soft ambient shadows. 
- Content inside cards should have generous padding (min 32px).

### Input Fields
- Underline-style inputs or very soft-filled rectangles.
- Focus state: The bottom border transitions to Subtle Gold.

### Lists
- Use custom "Stitch" bullets (a small horizontal dash or a tiny gold circle) instead of standard browser dots.

### Chips/Badges
- Small, rounded pills in Dusty Rose with dark brown text. Used for status or categories (e.g., "Ready to Wear," "Bespoke").

### Decorative Dividers
- Use very thin, light lines with a small "needle" or "thread" icon in the center to break sections without adding visual weight.