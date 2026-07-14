# Slop Reduction System
## Detecting and Eliminating “AI Slop” in Modern Websites

This document defines a systematic process for scanning a codebase and identifying patterns that make a website look AI-generated, generic, over-templated, or visually derivative.

The purpose is not to make a site “more aesthetic.”
The purpose is to restore authorship, intentionality, hierarchy, usability, and system coherence.

---

# Core Principle

AI slop is not caused by AI.

AI slop is caused by:
- statistically safe decisions
- missing design ownership
- zero visual tension
- no system consistency
- lack of product-specific thinking
- no handling of real-world complexity

A website becomes “AI slop” when every design decision feels predicted instead of intentional.

---

# What The Scanner Must Detect

The AI must scan:
- layout structure
- component repetition
- typography usage
- spacing systems
- color systems
- copywriting
- interaction states
- responsiveness
- component depth hierarchy
- visual identity consistency
- UX authenticity
- content specificity

The goal is to generate:
1. a Slop Score
2. a detailed breakdown
3. exact reasons
4. concrete fixes

---

# Slop Scoring System

| Category | Weight |
|---|---|
| Visual Genericness | 25 |
| Typography Genericness | 10 |
| Layout Repetition | 15 |
| Copywriting Slop | 15 |
| Missing UX States | 10 |
| Design System Inconsistency | 10 |
| Lack of Brand Identity | 10 |
| Excessive Decoration | 5 |

Final score:
- 0–20 → Distinct
- 21–40 → Slightly Generic
- 41–60 → AI-Looking
- 61–80 → Heavy Slop
- 81–100 → Template Collapse

---

# SECTION 1 — VISUAL SLOP DETECTION

## 1.1 Gradient Abuse

### Detect
- purple → blue gradients
- cyan glows
- radial blur backgrounds
- glowing hero sections
- multiple gradient buttons
- blurred “orb” decorations

### Slop Indicators
- gradients exist without semantic purpose
- gradients used as decoration instead of hierarchy
- every section uses gradients
- gradients replace composition

### Fix
- remove decorative gradients
- use contrast through spacing and hierarchy instead
- allow flat sections
- use 1 primary accent color maximum
- gradients should support brand meaning

---

## 1.2 Cardification Syndrome

### Detect
- everything inside cards
- nested cards
- cards inside cards
- dashboard-style containers for marketing pages
- unnecessary shadows

### Slop Indicators
- cards used where whitespace would work
- every feature becomes a bordered rectangle
- no compositional variety
- excessive border-radius consistency

### Fix
- remove unnecessary containers
- use layout flow instead of constant grouping
- allow content to breathe
- mix open layouts with constrained layouts
- create contrast between sections

---

## 1.3 Border Radius Inflation

### Detect
- rounded corners everywhere
- same radius on every element
- pills + cards + buttons all identical

### Slop Indicators
- design feels inflated and toy-like
- no sharpness anywhere
- no tension between components

### Fix
- reduce radius variance
- introduce intentional sharp edges
- define radius hierarchy:
  - buttons
  - cards
  - modals
  - inputs
- not everything should feel soft

---

## 1.4 Shadow Randomness

### Detect
- inconsistent shadow blur
- random opacity usage
- multiple shadow recipes
- decorative depth

### Slop Indicators
- depth lacks semantic meaning
- shadows exist only because “modern UI”

### Fix
- define elevation scale
- each shadow level must mean something
- reduce shadow dependence
- use spacing before shadows

---

# SECTION 2 — TYPOGRAPHY SLOP

## 2.1 Default Font Syndrome

### Detect
- Inter everywhere
- default Tailwind typography
- no font pairing
- generic geometric sans usage

### Slop Indicators
- typography has no personality
- startup clone appearance
- identical rhythm to template libraries

### Fix
- introduce brand typography
- pair fonts intentionally
- define:
  - display font
  - body font
  - mono font
- create custom rhythm and spacing

---

## 2.2 Heading Uniformity

### Detect
- every heading in Title Case
- same font weight everywhere
- no density variation
- repetitive text widths

### Slop Indicators
- all sections feel equal importance
- no pacing
- no editorial structure

### Fix
- mix sentence case with title case
- vary density intentionally
- create reading rhythm
- use asymmetry where appropriate

---

## 2.3 Bold Abuse

### Detect
- excessive bolding
- bold used without semantic hierarchy
- random highlighted phrases

### Slop Indicators
- visual shouting
- hierarchy collapse

### Fix
- reserve bold for:
  - emphasis
  - hierarchy
  - scanning
- reduce visual noise

---

# SECTION 3 — LAYOUT SLOP

## 3.1 Feature Grid Cloning

### Detect
- identical 3-column layouts
- icon + title + description repeated endlessly
- repetitive section structure

### Slop Indicators
- predictable scrolling
- no narrative pacing
- template fatigue

### Fix
- vary section composition
- mix:
  - editorial layouts
  - comparison layouts
  - asymmetric sections
  - dense sections
  - minimal sections
- create rhythm changes

---

## 3.2 Hero Section Template Detection

### Detect
- gradient headline
- CTA + secondary CTA
- fake metrics
- floating dashboard mockup
- centered text block

### Slop Indicators
- immediately recognizable AI-builder hero
- generic startup positioning

### Fix
- use product-specific storytelling
- show real product constraints
- use real screenshots
- avoid fake numbers
- avoid meaningless “trusted by” sections

---

## 3.3 Excessive Symmetry

### Detect
- perfect centering everywhere
- equal spacing across all sections
- mathematically balanced layouts

### Slop Indicators
- sterile feeling
- no human composition

### Fix
- introduce controlled imbalance
- vary alignment
- vary content density
- create tension intentionally

---

# SECTION 4 — COPYWRITING SLOP

## 4.1 AI Vocabulary Detection

### Detect
Words like:
- seamless
- robust
- powerful
- cutting-edge
- game-changing
- unlock
- leverage
- delve
- tapestry
- revolutionize
- next-generation
- innovative
- fast-paced world

### Slop Indicators
- says nothing specific
- sounds universally applicable
- no falsifiable claims

### Fix
- replace abstractions with specifics
- mention:
  - real use cases
  - constraints
  - tradeoffs
  - metrics
  - workflows
- sound opinionated

---

## 4.2 Sentence Pattern Repetition

### Detect
- repeated cadence
- repetitive paragraph openings
- identical section formatting

### Slop Indicators
- generated rhythm
- synthetic tone

### Fix
- vary sentence lengths
- allow abruptness
- allow dense information
- introduce editorial tone

---

## 4.3 Emoji Spam

### Detect
- emojis before every bullet
- decorative emoji usage
- emoji-heavy headings

### Slop Indicators
- forced friendliness
- social-media-template energy

### Fix
- use emojis only when semantically useful
- remove decorative clutter

---

# SECTION 5 — UX SLOP

## 5.1 Missing States

### Detect Missing:
- loading states
- empty states
- disabled states
- focus states
- keyboard navigation
- error states
- hover states
- validation states

### Slop Indicators
- static-dribbble-shot design
- no production realism

### Fix
- implement complete interaction system
- every component must have:
  - idle
  - hover
  - active
  - disabled
  - loading
  - error
  - success

---

## 5.2 Fake Product Thinking

### Detect
- impossible dashboards
- unrealistic charts
- fake notifications
- fake metrics
- fake collaboration activity

### Slop Indicators
- product does not feel lived-in
- purely aesthetic interfaces

### Fix
- use believable scenarios
- use realistic data density
- model edge cases
- design for actual workflows

---

# SECTION 6 — DESIGN SYSTEM FAILURE

## 6.1 No Token Consistency

### Detect
- arbitrary spacing
- inconsistent sizing
- random colors
- multiple shadow systems
- random border thicknesses

### Slop Indicators
- no coherent system ownership

### Fix
Create strict tokens:
- spacing scale
- typography scale
- elevation scale
- radius scale
- color scale
- motion scale

---

## 6.2 Over-Reliance on UI Libraries

### Detect
- untouched shadcn/ui appearance
- default Tailwind classes
- stock component appearance
- no customization layer

### Slop Indicators
- instantly recognizable stack

### Fix
- customize primitives deeply
- modify:
  - spacing
  - motion
  - density
  - borders
  - interaction behavior
- create visual signatures

---

# SECTION 7 — BRAND ABSENCE

## 7.1 No Point of View

### Detect
- generic messaging
- broad claims
- neutral tone
- avoids strong opinions

### Slop Indicators
- could belong to any startup

### Fix
- define:
  - worldview
  - target frustration
  - design philosophy
  - product tradeoffs
- make the product sound owned

---

## 7.2 No Real Constraints

### Detect
- infinite capability marketing
- no limitations mentioned
- no implementation detail

### Slop Indicators
- sounds fictional

### Fix
- explain constraints honestly
- mention:
  - performance tradeoffs
  - edge cases
  - intended audience
  - things product avoids intentionally

---

# SECTION 8 — MOTION SLOP

## 8.1 Over-Animation

### Detect
- fade-in everywhere
- stagger animations everywhere
- floating elements
- excessive blur transitions

### Slop Indicators
- animation replacing hierarchy

### Fix
- motion must communicate:
  - causality
  - state change
  - hierarchy
- reduce ornamental motion

---

# SECTION 9 — AUTHENTICITY CHECKS

## Detect
- fake testimonials
- fake avatars
- fake logos
- fake usage numbers
- AI-generated illustrations everywhere

### Slop Indicators
- synthetic trust-building

### Fix
- use real artifacts
- real screenshots
- real workflows
- real user language
- real support scenarios

---

# FINAL SCAN OUTPUT FORMAT

The AI must output:

## 1. Slop Score
Example:
- Visual Slop: 72/100
- Copywriting Slop: 61/100
- UX Slop: 84/100

Overall:
- 73/100 → Heavy Slop

---

## 2. Detected Problems

Example:
- Hero section uses statistically common AI-builder composition
- 91% of sections use identical card layouts
- Border radius system lacks hierarchy
- Typography rhythm identical to Tailwind defaults
- Copy contains 17 generic AI phrases
- Missing keyboard focus states

---

## 3. Exact Code References

Example:
- `/components/Hero.tsx`
- `/components/ui/card.tsx`
- `/styles/globals.css`

---

## 4. Refactor Instructions

Each issue must include:
- why it feels generic
- what visual principle is violated
- exact fix recommendation
- priority level

---

# SLop REDUCTION PRINCIPLES

The AI must prioritize:
- specificity over smoothness
- hierarchy over decoration
- systems over aesthetics
- rhythm over symmetry
- authenticity over polish
- composition over gradients
- editorial pacing over feature grids
- clarity over modernity

---

# FINAL RULE

A website should not look “modern.”

It should look inevitable.

Like it could only belong to this product, this team, and this worldview.

If the same UI could sell:
- AI agents
- crypto
- SaaS analytics
- design tools
- productivity apps

then the website has no identity.

That is AI slop.