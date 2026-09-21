# Delta Update — Professional Design System Documentation

## Overview

This is a comprehensive, WCAG 2.1 AA/AAA compliant design system built for premium editorial experiences. It includes tokens, components, accessibility features, animations, and responsive design patterns.

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Components](#components)
3. [Accessibility](#accessibility)
4. [Animations](#animations)
5. [Responsive Design](#responsive-design)
6. [Dark Mode](#dark-mode)
7. [Usage Guidelines](#usage-guidelines)

---

## Design Tokens

### Color System

All colors are defined in `src/styles/tokens.css` using CSS custom properties.

#### Surface Colors (Light Mode)
- `--color-surface-1` (#FBF9F5) - Primary background
- `--color-surface-2` (#F2EFE9) - Secondary background
- `--color-surface-3` (#FFFFFF) - Cards, elevated surfaces

#### Text Colors
- `--color-text-primary` (#111113) - Main text, high contrast
- `--color-text-secondary` (#363638) - Secondary text
- `--color-text-tertiary` (#656567) - Disabled, muted text

#### Semantic Colors
- `--color-success` (#059669) - Success states
- `--color-error` (#B91C1C) - Errors, destructive actions
- `--color-warning` (#CA8A04) - Warnings
- `--color-info` (#1E3A8A) - Information

#### Accents
- `--color-primary` (#B91C1C) - Primary accent (red)
- `--color-secondary` (#C59B27) - Secondary accent (gold)
- `--color-tertiary` (#1E3A8A) - Tertiary accent (blue)

### Typography Scale

**Font Families:**
- `--font-display` - Headings (Playfair Display, serif)
- `--font-body` - Body text (Plus Jakarta Sans, sans-serif)
- `--font-mono` - Code (IBM Plex Mono, monospace)

**Modular Font Sizes (1.125 multiplier):**
- `--text-xs` (12px) - Labels, captions
- `--text-sm` (14px) - Small text
- `--text-base` (16px) - Body text
- `--text-lg` (18px) - Large text
- `--text-xl` (20px) - Extra large
- `--text-2xl` (24px) - Display
- `--text-3xl` (28px) - Heading 3
- `--text-4xl` (32px) - Heading 2
- `--text-5xl` (40px) - Heading 1
- `--text-6xl` (48px) - Hero heading
- `--text-7xl` (56px) - Large hero

### Spacing Scale (8px base)

```css
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
```

### Shadows (Elevation System)

```css
--shadow-xs:  Light shadow
--shadow-sm:  Small shadow
--shadow-md:  Medium shadow
--shadow-lg:  Large shadow
--shadow-xl:  Extra large shadow
--shadow-2xl: Maximum shadow
```

### Border Radius

```css
--radius-xs:   4px
--radius-sm:   6px
--radius-md:   8px
--radius-lg:   12px
--radius-xl:   16px
--radius-full: 9999px (pill/circle)
```

### Animations

**Durations:**
- `--duration-75`: 75ms
- `--duration-100`: 100ms
- `--duration-150`: 150ms
- `--duration-200`: 200ms
- `--duration-300`: 300ms
- `--duration-400`: 400ms
- `--duration-500`: 500ms

**Easing Functions:**
- `--ease-linear`: Linear
- `--ease-in`: Cubic in
- `--ease-out`: Cubic out
- `--ease-smooth`: Custom smooth curve
- `--ease-bounce`: Bounce effect

---

## Components

### Buttons

**Variants:**
- `.btn-primary` - Primary action (red)
- `.btn-secondary` - Secondary action
- `.btn-tertiary` - Tertiary action
- `.btn-ghost` - Ghost/transparent
- `.btn-success` - Success action (green)
- `.btn-danger` - Destructive action
- `.btn-warning` - Warning action

**Sizes:**
- `.btn-xs` - 32px height
- `.btn-sm` - 36px height
- `.btn-md` - 40px height (default)
- `.btn-lg` - 48px height
- `.btn-xl` - 56px height

**Usage:**
```tsx
import { AccessibleButton } from '@/components/ui/AccessibleButton'

<AccessibleButton variant="primary" size="md" isLoading={false}>
  Click me
</AccessibleButton>
```

### Cards

**Variants:**
- `.card-flat` - No shadow
- `.card-elevated` - Medium shadow with hover
- `.card-interactive` - Clickable with hover lift

**Sizes:**
- `.card-sm` - Small padding
- `.card-md` - Medium padding (default)
- `.card-lg` - Large padding

**Usage:**
```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui/Card'

<Card variant="elevated">
  <CardHeader title="Card Title" />
  <CardBody>Content here</CardBody>
  <CardFooter>Actions</CardFooter>
</Card>
```

### Inputs

**Features:**
- Label association
- Error messaging
- Helper text
- Required field indication
- Icon support

**Usage:**
```tsx
import { AccessibleInput, AccessibleTextarea } from '@/components/ui/AccessibleInput'

<AccessibleInput
  label="Email Address"
  type="email"
  placeholder="your@email.com"
  isRequired={true}
  error={emailError}
  helper="We'll never share your email"
/>
```

### Alerts

**Variants:**
- `.alert-success` - Success message
- `.alert-error` - Error message
- `.alert-warning` - Warning message
- `.alert-info` - Information message

**Usage:**
```tsx
import { Alert } from '@/components/ui/Alert'

<Alert variant="success" title="Success!" isDismissible={true}>
  Your changes have been saved.
</Alert>
```

### Badges

**Variants:**
- `.badge-primary` - Primary badge
- `.badge-success` - Success badge
- `.badge-warning` - Warning badge
- `.badge-error` - Error badge
- `.badge-info` - Info badge

**Usage:**
```tsx
import { Badge } from '@/components/ui/Badge'

<Badge variant="success">Completed</Badge>
```

### Modal

**Features:**
- Focus trapping
- Escape key support
- ARIA roles
- Multiple sizes
- Dismissible option

**Usage:**
```tsx
import { Modal } from '@/components/ui/Modal'

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirm Action"
  size="md"
>
  Are you sure?
</Modal>
```

---

## Accessibility

### WCAG 2.1 Compliance

This design system targets **WCAG 2.1 Level AA** with many components exceeding **Level AAA**.

### Key Features

1. **Focus Management**
   - Clear focus indicators with high contrast
   - Focus trapping for modals
   - Skip links for keyboard navigation

2. **ARIA Attributes**
   - Semantic role attributes
   - Live regions for dynamic content
   - Label associations
   - Error/invalid states

3. **Keyboard Navigation**
   - Full keyboard support
   - Tab order management
   - Escape key handling
   - Arrow key navigation for menus

4. **Color Contrast**
   - All text meets AA standard (4.5:1)
   - Many combinations meet AAA (7:1)
   - Tested with contrast checker utility

5. **Screen Reader Support**
   - Semantic HTML
   - ARIA labels and descriptions
   - Skip links
   - Proper heading hierarchy

### Accessibility Utilities

**Focus Management:**
```tsx
import { focusManager } from '@/utils/accessibility'

// Trap focus in modal
const releaseFocus = focusManager.trapFocus(modalElement)

// Restore previous focus
const restoreFocus = focusManager.saveFocus()
restoreFocus()

// Announce to screen readers
focusManager.announce('Item deleted', 'assertive')
```

**ARIA Helpers:**
```tsx
import { ariaHelpers } from '@/utils/accessibility'

ariaHelpers.setLoading(element, true)
ariaHelpers.setInvalid(input, true, 'error-id')
ariaHelpers.setCurrent(navLink, true, 'page')
```

**Accessibility Testing:**
```tsx
import { a11yTesting } from '@/utils/accessibility'

a11yTesting.auditLog() // Log all issues
```

---

## Animations

### Entrance Animations

```css
.animate-fade-in      /* Fade in */
.animate-slide-up     /* Slide up from bottom */
.animate-slide-down   /* Slide down from top */
.animate-slide-left   /* Slide from right */
.animate-slide-right  /* Slide from left */
.animate-scale-in     /* Scale from small */
.animate-zoom-in      /* Zoom from smaller */
```

### Staggered Animation

```html
<div class="stagger-in">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### Interactive Animations

- Button press: Scale down slightly on click
- Button hover: Lift up with shadow
- Card hover: Lift up and increase shadow
- Loading: Spin animation
- Pulse: Opacity pulse for attention

### Respecting Motion Preferences

All animations automatically disable for users with `prefers-reduced-motion: reduce`.

---

## Responsive Design

### Breakpoints

- `xs` (0px) - Mobile
- `sm` (640px) - Small mobile
- `md` (768px) - Tablet
- `lg` (1024px) - Desktop
- `xl` (1280px) - Large desktop
- `2xl` (1536px) - Extra large

### Mobile-First Approach

All styles start mobile-first and enhance at larger breakpoints.

```css
/* Mobile (default) */
.page-content {
  padding: 0 var(--space-4);
}

/* Tablet and up */
@media (min-width: 768px) {
  .page-content {
    padding: 0 var(--space-6);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .page-content {
    padding: 0 var(--space-8);
  }
}
```

### Touch Device Optimization

- Increased touch target sizes (44px minimum)
- Increased spacing
- Removed hover-only interactions
- Optimized for coarse pointers

### Responsive Utilities

```html
<!-- Hide on mobile -->
<div class="hide-mobile">Desktop only</div>

<!-- Show only on mobile -->
<div class="show-mobile">Mobile only</div>

<!-- Grid utilities -->
<div class="grid-1-mobile grid-2-tablet grid-3-desktop">
  <div>Item</div>
  <div>Item</div>
  <div>Item</div>
</div>
```

---

## Dark Mode

### Implementation

Dark mode is implemented via `.dark` class on `html` element.

```tsx
// Toggle dark mode
document.documentElement.classList.toggle('dark')
```

### Color Overrides

All colors automatically adjust for dark mode:

```css
.dark {
  --color-surface-1: #0A0B0E;      /* Darker background */
  --color-text-primary: #F3F4F6;   /* Lighter text */
  --color-border-light: #232634;   /* Darker borders */
  /* ... more overrides ... */
}
```

### Testing Dark Mode

1. User preference: `prefers-color-scheme: dark`
2. Manual toggle: `.dark` class
3. System preference: Detected and applied

---

## Usage Guidelines

### Importing Styles

All styles are automatically included when you import `App.css`:

```tsx
import './App.css'
```

### Using Tokens

Access tokens via CSS custom properties:

```css
.my-element {
  color: var(--color-text-primary);
  padding: var(--space-4);
  font-size: var(--text-lg);
  background-color: var(--color-surface-2);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}
```

### Creating New Components

```tsx
import { AccessibleButton } from '@/components/ui/AccessibleButton'

export function MyComponent() {
  return (
    <div className="card card-elevated">
      <h2 className="text-2xl font-bold">Heading</h2>
      <p className="text-base text-secondary">Description</p>
      <AccessibleButton variant="primary">Action</AccessibleButton>
    </div>
  )
}
```

### Combining Utilities

```html
<div class="animate-fade-in stagger-in">
  <div class="card card-interactive">Content</div>
  <div class="card card-interactive">Content</div>
</div>
```

---

## File Structure

```
src/
├── styles/
│   ├── tokens.css           # Design tokens (colors, typography, spacing)
│   ├── reset.css            # CSS reset and base styles
│   ├── components.css       # Component base styles
│   ├── accessibility.css    # WCAG 2.1 accessibility patterns
│   ├── animations.css       # Micro-interactions and animations
│   └── responsive.css       # Responsive design patterns
├── components/
│   ├── ui/
│   │   ├── AccessibleButton.tsx
│   │   ├── AccessibleInput.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Alert.tsx
│   │   └── Modal.tsx
│   └── ...
├── utils/
│   └── accessibility.ts     # Accessibility utilities
└── App.css                  # Main entry point (imports all styles)
```

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Android Chrome 90+)

---

## Performance

- CSS is modular and imported only when needed
- Animations respect `prefers-reduced-motion`
- Touch-optimized for mobile devices
- Efficient color variables reduce CSS size
- No blocking resources

---

## Maintenance

### Adding New Colors

1. Add to `src/styles/tokens.css` in `:root`
2. Add dark mode override in `.dark`
3. Update this documentation

### Adding New Components

1. Create component file in `src/components/ui/`
2. Add base styles to `src/styles/components.css`
3. Export from component
4. Document in this file

### Updating Tokens

1. Modify in `src/styles/tokens.css`
2. Test in light and dark modes
3. Test accessibility (contrast, focus)
4. Test responsiveness

---

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Accessible Colors](https://www.accessible-colors.com/)
- [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

---

## License

© Delta Update. All rights reserved.
