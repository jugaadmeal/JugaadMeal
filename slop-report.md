# Slop Scan Report - CampusEat

## 1. Slop Score
- Visual Slop: 0/25
- Typography Slop: 0/10
- Layout Slop: 0/15
- Copywriting Slop: 0/15
- UX Slop (Missing States): 0/10
- Design System Consistency: 0/10
- Brand Identity Presence: 0/10
- Decorative Elements: 0/5

### Overall Score: **0/100** → **Distinct**

---

## 2. Detected Problems


---

## 3. Exact Code References
- [`page.tsx:L126`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/page.tsx#L126): (Visual Slop) - Inflated border radius: "<div className="bg-secondary rounded-2xl p-6 border border-secondary-light w-full max-w-sm text-white flex flex-col justify-between space-y-6 shadow-md relative">"
- [`page.tsx:L1073`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(student)/menu/page.tsx#L1073): (Visual Slop) - Arbitrary soft shadow: "className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 bg-primary hover:bg-primary-hover text-white p-4 rounded-full shadow-lg flex place-center place-mid gap-2.5 font-semibold cursor-pointer transition-all border border-primary-hover focus:ring-2 focus:ring-primary/20 outline-none""
- [`page.tsx:L1108`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(admin)/admin/page.tsx#L1108): (Visual Slop) - Arbitrary soft shadow: "className="relative w-full max-w-md bg-surface-card h-screen shadow-lg flex flex-col justify-between border-l border-edge""
- [`page.tsx:L136`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/page.tsx#L136): (Typography Slop) - Bold styling override: "<h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Tomorrow's Menu Vote</h4>"
- [`page.tsx:L234`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/page.tsx#L234): (Typography Slop) - Bold styling override: "<h3 className="text-lg font-bold text-secondary">{card.title}</h3>"
- [`page.tsx:L296`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/page.tsx#L296): (Typography Slop) - Bold styling override: "<h3 className="text-sm font-bold">Tomorrow's lunch poll</h3>"
- [`page.tsx:L368`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/page.tsx#L368): (Typography Slop) - Bold styling override: "<h4 className="text-xs font-bold text-secondary">{review.name}</h4>"
- [`page.tsx:L394`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(student)/menu/page.tsx#L394): (Typography Slop) - Bold styling override: "<h1 className="text-2xl font-bold text-secondary tracking-tight">Today&apos;s menu listings</h1>"
- [`page.tsx:L467`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(student)/menu/page.tsx#L467): (Typography Slop) - Bold styling override: "<h3 className="text-lg font-bold text-secondary flex place-center gap-2">"
- [`page.tsx:L513`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(student)/menu/page.tsx#L513): (Typography Slop) - Bold styling override: "<h3 className="text-lg font-bold text-secondary">No menus scheduled</h3>"
- [`page.tsx:L574`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(student)/menu/page.tsx#L574): (Typography Slop) - Bold styling override: "<h4 className="font-bold text-secondary text-base">Your cart is empty</h4>"
- [`page.tsx:L489`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(student)/group/page.tsx#L489): (Typography Slop) - Bold styling override: "<h2 className="text-base font-bold flex place-center gap-1.5">"
- [`page.tsx:L344`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(admin)/admin/page.tsx#L344): (Typography Slop) - Bold styling override: "<h2 className="text-base font-bold flex place-center gap-1.5 leading-none">"
- [`page.tsx:L420`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(admin)/admin/page.tsx#L420): (Typography Slop) - Bold styling override: "<h1 className="text-xl font-bold text-secondary tracking-tight">Console Overview</h1>"
- [`page.tsx:L431`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(admin)/admin/page.tsx#L431): (Typography Slop) - Bold styling override: "<h3 className="text-lg font-bold text-secondary leading-none">{metrics.todayOrders}</h3>"
- [`page.tsx:L439`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(admin)/admin/page.tsx#L439): (Typography Slop) - Bold styling override: "<h3 className="text-lg font-bold text-secondary leading-none">₹{metrics.todayRevenue}</h3>"
- [`page.tsx:L447`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/(admin)/admin/page.tsx#L447): (Typography Slop) - Bold styling override: "<h3 className="text-lg font-bold text-secondary leading-none">{metrics.activeOrders}</h3>"
- [`page.tsx:L216`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/page.tsx#L216): (Layout Slop) - 3-column grid layout: "<div className="grid md:grid-cols-3 gap-8">"
- [`page.tsx:L354`](file:///C:/Users/sudha/OneDrive/Desktop/CampusEat/apps/web/app/page.tsx#L354): (Layout Slop) - 3-column grid layout: "<div className="grid md:grid-cols-3 gap-8">"

---

## 4. Refactor Instructions

### Issue: Gradient and Floating Blob Abuse
- **Why it feels generic**: The landing page uses floating glowing blobs (`animate-float`) and primary-to-orange background mesh gradients that mimic cookie-cutter tech-builder templates.
- **Visual Principle violated**: Composition and visual contrast are replaced with simple ambient color decorations.
- **Fix Recommendation**: Remove decorative blobs. Create clear white, slate, and brand boundaries. Use typography size variation to establish focus.
- **Priority**: High

### Issue: AI-Vocabulary & Copywriting Genericness
- **Why it feels generic**: The use of words like "seamless," "finally hacked," "robust," and decorative emojis is typical of unopinionated ChatGPT content.
- **Visual Principle violated**: Narrative focus and content specificity.
- **Fix Recommendation**: Replace general claims with localized campus delivery specifics. Focus on Chandigarh University blocks, short class-interval timing restrictions, and the Double-Entry Wallet system.
- **Priority**: High

### Issue: Typography & Bold Uniformity
- **Why it feels generic**: Using standard `Inter` display and bold headings makes the interface look like a stock library install.
- **Visual Principle violated**: Typographic contrast and character hierarchy.
- **Fix Recommendation**: Introduce a display font (e.g. `Outfit`) in headers. Mix Sentence Case and Title Case headers. Create intentional weight pairing.
- **Priority**: Medium

### Issue: Layout Repetition and Symmetry
- **Why it feels generic**: Scrolling feels predictable because of standard symmetrical 3-column layouts and centering.
- **Visual Principle violated**: Visual tension and rhythm.
- **Fix Recommendation**: Use asymmetric grid layouts, group information with varied content densities, and allow sections to breathe using space.
- **Priority**: Medium
