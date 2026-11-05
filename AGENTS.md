## Required Git workflow

Every change must use a dedicated branch and a pull request targeting `dev`, the development branch. This applies to features, fixes, refactors, configuration, tests, migrations, and documentation.

1. Fetch the latest remote state and create the work branch from `origin/dev` (for example, `feature/<name>` or `fix/<name>`).
2. Commit all changes required for the work, including relevant tests, migrations, and documentation. Do not include credentials or generated temporary files.
3. Push the work branch and open a pull request with **base `dev`**, containing all changes for that task.
4. Keep integration in `dev`. Do not push changes directly to `dev` or `main`, and do not target feature or fix PRs at `main`.
5. Changes reach `main` through a separately authorized promotion from `dev`.

Only an explicit user instruction can authorize an exception, such as applying a specific documentation update directly to `main`. Never infer an exception.

# Impeccable — Web Builder Skill

You are an expert web developer building production-grade Next.js websites for real businesses.
Read .build-instructions.md FIRST to understand the archetype, layout style, and sections to build.

---

## ⚠ RULE #1: NO BROKEN IMAGES

The ONLY image files that exist are listed in the `.build-instructions.md` under "AI-GENERATED IMAGES".
**Never** use `<Image src="/images/anything-not-in-the-list" />`.

For things without a provided image:
- **Team/people photos**: `<div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-xl">AB</div>`
- **Testimonial avatars**: Colored circle with initials (2 letters)
- **Icons**: Use `lucide-react` — `import { Star, Phone, CheckCircle } from "lucide-react"`
- **Decorative backgrounds**: CSS gradients (`bg-gradient-to-r from-stone-900 to-stone-800`)
- **Product cards without image**: Gradient card with product name, price, and an icon — NO `<Image>`
- **Gallery without images**: CSS art — colored blocks, gradients, or abstract patterns

---

## Core Principles

1. **Zero placeholders** — No Lorem ipsum, no "Service 1 / Service 2", no "Coming Soon"
2. **Real business content** — Invent plausible names, prices, phone numbers, addresses, team names
3. **Intent-specific layout** — Each archetype has its own visual DNA (see below). Never reuse a generic 3-column card layout for everything.
4. **AI images** — Use ONLY the image files listed in the instructions. They MUST appear above the fold.
5. **Color discipline** — Apply the color palette from the instructions. Define CSS vars in globals.css and use them throughout.
6. **Typography hierarchy** — Every page needs: display heading (H1), section headings (H2), body text, captions.

---

## Available Components

```ts
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Star, Phone, MapPin, Clock, ArrowRight, CheckCircle, ShoppingCart } from "lucide-react"
```

---

## Archetype Layout Rules

### restaurant
- Hero: full-viewport /images/hero.png with text overlay. Dark gradient from bottom.
- Menu: tabbed or categorized grid (Entrantes / Principales / Postres) with real dish names + prices
- Gallery: use /images/product-1.png + /images/product-2.png + /images/product-3.png if available; otherwise styled CSS cards
- AVOID: plain 3-col icon+text feature cards

### ecommerce / store
- Hero: split layout — headline left, /images/hero.png right
- Products: use /images/product-1.png, product-2.png, product-3.png as product card images
- For product cards beyond the provided images: gradient background card with name/price/icon — NO broken images
- AVOID: pricing table format

### saas / fintech / tech
- Hero: centered — large eyebrow, bold H1, /images/hero.png as product screenshot below text
- Bento grid: asymmetric (1 large + 2 medium + 2 small)
- Pricing: 3-tier table
- AVOID: full-bleed photography hero

### clinic / wellness
- Hero: split — /images/hero.png left, headline + trust badges right
- Services: 2-col list with icons (lucide-react)
- Team: colored avatar circles with initials + name + specialty — NOT photos
- Process: numbered steps
- AVOID: aggressive sales language

### travel / luxury
- Hero: full-viewport /images/hero.png, centered text
- Destinations: cards with /images/product-1.png, product-2.png overlays; for extras use gradient cards
- AVOID: SaaS-style bento grids

### portfolio / agency
- Hero: minimal — large bold H1, /images/hero.png as background at low opacity
- Work: grid — alternating full-width and 2-col cards (use CSS backgrounds for missing images)
- AVOID: pricing tables

### service business
- Hero: text-left, /images/hero.png right
- Process: 3-5 steps with lucide-react icons
- FAQ: accordion
- AVOID: generic Lorem ipsum FAQs

---

## Layout Diversity Rules

Never use:
❌ Hero → 3 feature icons → 3 testimonial cards → CTA

Use varied section rhythms:
✅ Hero → Split about → Asymmetric bento → Full-bleed image → Single quote → CTA

Vary alignment: left-aligned → centered → right-aligned → full-bleed
Vary backgrounds: white → light gray → brand color → dark → white

---

## Tailwind 4 Notes

Config is in `app/globals.css` under `@theme { }`. Add custom colors:
```css
@theme {
  --color-brand: #your-accent;
  --color-surface: #your-bg;
}
```

## next/image Usage

```tsx
// Full-bleed background:
<div className="relative h-screen overflow-hidden">
  <Image src="/images/hero.png" alt="..." fill className="object-cover" />
  <div className="relative z-10 h-full flex items-center">...</div>
</div>

// Contained:
<Image src="/images/product-1.png" alt="..." width={600} height={600} className="rounded-xl object-cover w-full h-64" />
```

---

## Next.js Client Components

**CRITICAL: `'use client'` MUST have quotes — it is a string directive, not a keyword.**

```tsx
// ✅ CORRECT — always quotes, always first line of file
'use client'

import { useState } from 'react'
```

```tsx
// ❌ WRONG — bare use client without quotes causes build error: "use is not defined"
use client

import { useState } from 'react'
```

Add `'use client'` only when the component uses: `useState`, `useEffect`, `useRef`, event handlers (`onClick`, `onChange`), or any browser-only API. Server Components (default) cannot use these.

---

## Quality Checklist

- [ ] Every `<Image src="...">` references a file from the "AI-GENERATED IMAGES" list
- [ ] No `<Image src="/images/team-*.jpg">` or other non-existent paths
- [ ] /images/hero.png visible above the fold
- [ ] No Lorem ipsum anywhere
- [ ] Team sections use CSS avatars with initials, not image tags
- [ ] Every `'use client'` directive has quotes (bare `use client` → build error)
- [ ] next build passes (no TypeScript errors)

