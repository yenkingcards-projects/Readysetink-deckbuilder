# Ready Set Ink Deck Builder Revamp Plan

Sep 23, 2026 · Ben Dacy

## TL;DR

Ready Set Ink already has deeper tools than Dreamborn. It loses because the basics are buried: on a 1440px laptop your deck is 15,000px below the cards, and there are no one-click ink or cost filters.

**Strategy:** copy the proven layout every top builder uses (filters on top, card pool left, live deck right), hide our power tools one click deeper, then win on things Dreamborn can't copy — role-aware advice, "finish my deck", and channel-linked decks.

**Plan at a glance:**

1. **Phase 0 — Baseline:** add tracking, watch 3 people build.
2. **Phase 1 — Layout fix:** deck always visible, quick filter bar, special searches in a drawer. Biggest win.
3. **Phase 2 — Fast building:** text deck list, clear counters, progress to 60, hotkeys, undo, plus a thumb-first mobile mode.
4. **Phase 3 — Stats and sharing:** curve, hand odds, sample hand, import/export, versions.
5. **Phase 4–5 — Differentiators and AI:** deck doctor, rotation helper, budget mode, finish my deck.

## Where we are today

The builder has more power than Dreamborn but hides the basics: on a 1440px laptop your deck isn't on screen, and there's no one-click ink or cost filter. Tested on the live site on September 23, 2026 at 1440px, 1920px and phone width, adding 10 cards.

**What's already better than Dreamborn (keep all of it):**

- 72 "Special searches" in 17 plain-English groups ("Draws a card", "Bounce — back to THEIR hand", "Hits every opponent"). No other Lorcana builder has this.
- Artwork search ("blue dog", "castle at night") and franchise/flavour search.
- Full syntax (`ink:amber cost>=3 type:action`), keyboard shortcuts (Enter adds, 4 = playset, / = search).
- Deck panel warns "50 more cards to reach 60", shows avg cost, % inkable, and a "cards at 3 ink or less" line.
- Guided Coconut Build, rulings/notes, lore tracker, map, pull list, collection.

**Friction, ranked by how much it hurts building:**

| # | Problem | What I saw | Why it matters |
| --- | --- | --- | --- |
| 1 | Deck is off-screen on laptops | At 1440px the deck panel renders **below** the card grid (~15,000px down). It only sits beside the grid at ~1920px. | You add cards blind. This is the #1 reason builders feel clunky. |
| 2 | No quick ink / cost / type filters | Left rail opens with artwork search, Clear/Syntax/Share buttons, then 72 special searches. The six ink icons and 1–9+ cost buttons don't exist up top. | Ink + cost is the first thing every Lorcana player filters by. Dreamborn has it one click away. |
| 3 | Too many first-screen decisions | Header + 10-item nav + Build manually/Guided toggle + big search + sidebar with 4 buttons + "Flounder" + Expand/Collapse + sort + 3 more buttons before the first card. | Newcomers can't tell where to start. |
| 4 | Big card tiles, one row of -/0/+ each | ~4 cards per row at 1440px; the counter is easy to miss. | Slow scanning; Dreamborn shows 8 per screen with "2 / 4" counters. |
| 5 | Deck list is image tiles, not a list | Added cards show as small card images with 2x/4x badges. | Hard to scan 20+ unique cards; every good builder uses a compact text list grouped by type/cost. |
| 6 | Mixed terms and jargon | "Coconut", "Flounder", "dust", "Infinity", "UNSAVED" appear without explanation next to each other. | Personality is good; unexplained terms on the build path aren't. |
| 7 | Onboarding modal on every fresh visit | 5-step welcome modal blocks the builder. | Gets in the way of the one job. |
| 8 | Ko-fi / "Support Ready Set Ink" prompts in the builder | Support buttons and banners appear in and under the builder. | Distracting on the build path. Remove from the builder; one link in the site footer only. |

## Competitive teardown

Dreamborn wins on layout, not features: search bar, six ink buttons and the deck list are all on one screen, and nothing else competes for attention.

**Dreamborn's builder:**

- **Top bar:** one search box with typed tokens (typing "elsa" suggests `contains: elsa` or `illustrator: Elsa Chang`), a Filters button, and a row of inkable/uninkable + six ink icons. Everything else lives in a Filters modal (Types, Cost, Inkwell, Legality, Set, Rarity, Strength, Willpower, Lore, Movement, Keywords, "only my collection").
- **Card grid:** 4 across on the left ~60% of the screen. Each card shows a price badge and a `− 2 / 4 +` counter. View menu: grid/list, zoom, sort.
- **Deck panel (always visible, right ~40%):** card count + inkable count, Total / Owned % / Missing $ tiles, then a compact text list grouped by type. Each row = ink icon, cost, name, price, `− 4/4 +`. Cards / Info tabs; Info = cost curve + color, inkable and type pies.
- **Menu:** New, Save, Import, Export, Share, Simulate (sample hand), Registration Sheet, Clear.
- **Deck pages:** Infinity / Core Constructed tags, likes, views, YouTube embed, cost curve stacked by ink.
- **Beyond the builder:** mobile app that scans cards into your collection, Creators pages, Trade Evaluator.

**Where Dreamborn is weak (our openings):**

- No "you need 60" progress or legality warning in the builder.
- Search is name/text only. No role search like our special searches, no artwork search.
- Stats are pies and a bar chart with no advice.
- No rulings in context.
- Filters live in a modal: every cost/type change is open → click → Done.
- On phones, +/− buttons are 32×32px (below the 44px minimum) and filters are a full-screen modal with 12 collapsed sections.

**Format context:** Core Constructed rotated on July 24, 2026 — sets 5–8 left, sets 9–13 are legal, and reprints keep old printings legal. Infinity allows every card. A builder that flags rotated cards instantly is a real advantage right now.

## What the best TCG deck builders do

| Builder (game) | Signature move | Steal for us |
| --- | --- | --- |
| Moxfield (MTG) | Fast text-first editor: search syntax, hotkeys, bulk edit, custom tags, maybeboard, deck history, primer | Maybeboard, deck version history, markdown primer, bulk "paste a list" edit |
| Archidekt (MTG) | Visual stacks, drag-and-drop categories, "Quick add" box, playtester | Quick-add box that takes "4 Elsa Snow Queen"; user-defined categories |
| Hearthstone | Smart Deck Builder fills the rest of your deck from meta data, then by win rate, cost fit and curve | "Finish my deck" for Lorcana |
| Marvel Snap Zone | Deck shown as numbered slots ("12 LEFT"); cost + ability chips always visible; copy deck code with no account | Visible progress toward 60; chips always on screen; build and export without signing in |
| Limitless (Pokémon) | Deck left, search right, Save / Share / Tools / Playtest in one toolbar | One clean toolbar; Playtest as a first-class button |
| FaBrary (Flesh and Blood) | Draw odds and simulation, tournament data beside your deck | "Chance to have X by turn 3" in plain English |

**Patterns every one of them shares:**

1. **Two panes, always.** Pool and deck visible together on any screen ≥ 1024px; on phones, a bottom tab bar or sheet swaps between them.
2. **Quick filters are chips, not a modal.**
3. **The deck list is text.** Images are a view option.
4. **One add gesture everywhere.** Click to add, right-click or − to remove, hotkeys, drag.
5. **Progress is obvious.** "32 / 60" plus legality, live.
6. **Build first, sign in later.**
7. **Leaving is easy.** One-click export and share.

## Design principles

1. **The deck is always visible.** On every screen width, you can see your count and list, or reach them in one tap.
2. **First card added in under 10 seconds.** No modal, tour or sign-in before the first add.
3. **Simple on top, powerful underneath.** Ink, cost, type and search are on screen. Special searches, syntax and artwork search are one click deeper — never removed.
4. **Every click shows a result.** Card animates into the list, count ticks up, curve moves.
5. **Advice, not just charts.**
6. **Plain words on the build path.** Keep the personality (Flounder, Coconut) in names and empty states, but every label on the main loop says what it does.
7. **Fast on a phone at a card shop.** Thumb-reachable controls, 44px tap targets, works on a weak connection.

## Target UX

### The core loop

Pick 1–2 inks → filter by cost/type → click card to add → deck list + curve update → 60 and legal? (no → keep filtering; yes → check hand odds + advice) → save, share, export.

### Desktop layout (≥ 1024px)

| Zone | Width | What's in it |
| --- | --- | --- |
| Top bar | full | Logo, 5 nav items max (Build, Cards, Decks, Collection, More), Sign in |
| Filter bar | pool width, sticky | Search box · six ink toggles · cost chips 1–9+ · type chips (Character, Action, Song, Item, Location) · Inkable toggle · Core/Infinity toggle · "More filters" · "✨ Special searches" |
| Card pool | ~62% | Grid (5–6 across at 1440px) or list view. Density slider. Count + sort on one line. |
| Deck panel | ~38%, sticky, own scroll | Header, progress, list, stats tabs |
| Special searches | slide-out drawer from left | The 72 existing filters, grouped, with search-within. Opens over the pool. |

The current left sidebar becomes the drawer. That frees ~280px and puts the deck on screen at 1440px.

### Search and filters

- **One search box, three modes, no toggle.** Name/text by default, syntax when it sees `ink:` or `cost>`, artwork/description when nothing matches by name ("no card named 'blue dog' — showing art matches").
- **Typed suggestions:** typing "elsa" offers `Name: Elsa`, `Text: Elsa`, `Artist: …`.
- **Active filters as removable chips** with a single "Clear all".
- **Ink lock:** once the deck has two inks, offer "Only show Amber + Steel" as a one-click chip.
- **Special searches:** top 6 (Staples, Draws a card, Banishes, Bounce, Extra ink, Closes out the game) as chips in "More filters", the rest in the drawer.

### Card tile

- Smaller by default (5–6 across), zoom on hover or long-press.
- Click card = +1. Right-click or − = −1. Shift-click = set to 4.
- Counter reads "2 / 4"; tile gets an ink-colored border when in the deck; cards at 4 dim slightly.
- Badges: price, owned count (if signed in), rotated/not legal in Core.

### Deck panel

- **Header:** editable name, format pill (Core / Infinity), inks, save state.
- **Progress bar:** "32 / 60" in the deck's ink colors, green at 60. Inline warnings: "3 inks — max is 2", "Elsa — rotated from Core".
- **List (default):** compact rows grouped by Characters / Actions / Songs / Items / Locations: count, cost, ink icon, name, price, − +. Hover = card preview. Toggle group by cost or ink.
- **Visual view:** current image tiles, as an option.
- **Maybeboard:** collapsible "Considering" section; drag or press M.
- **Tabs:** List · Stats · Hand · Notes.
- **TCGplayer:** "Buy missing cards · $12" button stays.

### Stats that give advice (Phase 3)

- Cost curve stacked by ink (bars, not pies).
- Inkable count with a target band.
- Plain-English odds: "78% chance to have a 2-drop in your opening 7".
- Role breakdown from special searches: "Removal 8 · Card draw 6 · Bounce 4".
- Sample hand: draw 7, mulligan, draw next. Key: H.

### Import, export and share (Phase 3)

- Import: paste any common list ("4 Elsa - Snow Queen"), a Dreamborn URL, or a Pixelborn code. Show what didn't match.
- Export: text, Pixelborn/Lorcanito formats, registration sheet PDF, deck image for socials.
- Share link → clean deck page with curve, video embed, primer, "Copy to my builder".
- Deck history: every save is a version; compare to last version.

### Keyboard

| Key | Action |
| --- | --- |
| / | Focus search |
| Enter | Add top result |
| 1–4 | Set count of hovered card |
| ⌫ | Remove one |
| M | Move to/from maybeboard |
| H | Draw sample hand |
| Ctrl/Cmd + S | Save |
| Ctrl/Cmd + Z | Undo |
| ? | Show all shortcuts |

## Mobile: searching and building on a phone

People save deck building for the laptop because on a phone it feels cramped, slow and easy to mess up. The fix isn't a shrunken desktop builder. It's a phone mode built for short sessions, thumbs and editing, that hands off cleanly to desktop.

### Why building feels like a desktop job

Nielsen Norman Group found people rate laptop tasks as more important and phone tasks as easier — they deliberately save hard, high-stakes tasks for big screens.

| Trigger | What it feels like on a phone |
| --- | --- |
| Less on screen = more to remember | Can't see the pool and deck at once. |
| Typing is painful | Long card names; typos give zero results. |
| Fear of mistakes | Fat-finger a − and lose a card. No undo = don't try. |
| Can't compare side by side | Reading two cards means switching screens. |
| Interrupted sessions | Phone time is 2–5 minute bursts. |
| Blank-page effort | Building 60 from zero feels impossible on a phone. |

Our current phone view: Search tab is a separate screen from results, the search box is at the top (hardest to reach one-handed), and ink/cost filters aren't visible. ~49% of people use phones one-handed; 75% of interactions are thumb-driven.

### What mobile-first card games do

| Game | What works | Steal for us |
| --- | --- | --- |
| Marvel Snap | Deck as slots at top, collection below, tap to add, cost chips always visible | Deck strip always on screen; cost chips never hidden |
| Pokémon TCG Pocket | Pick energy first, one-tap auto-build | Pick inks first, then "start me off" |
| Hearthstone | Deck as narrow text strip, tap to add, smart deck builder | Text-strip deck, "finish my deck" |
| MTG Arena | One search box for name/keyword/type; color symbols as one-tap filters | One smart search box plus ink icons |
| Online shops (Baymard) | Applied filters as a scrolling chip row | Active-filter chip row above results |

**Big lesson:** a 60-card Lorcana deck is ~15–18 unique cards × copies. On a phone the unit of work is "pick a card and how many".

### Our mobile design

1. **Search lives at the bottom.** Search box and ink/cost chips sit just above the tab bar. Results fill the screen above. Filtering and results are one screen.
2. **Smart search that forgives typos.** Fuzzy match ("mickey minnie" finds "Mickey Mouse & Minnie Mouse"), recent searches, one-tap chips for top special searches.
3. **Filter sheet, not a filter page.** Half-height bottom sheet with cost 1–9+, type and inkable visible without opening sections. Button reads "Show 84 cards" and updates live.
4. **Active filters as chips** in one scrolling row; tap × to remove.
5. **List view by default on phones.** Small art, name, cost, ink, and a 0–4 count selector with 44px targets. Tap art for full card.
6. **Pick a count in one tap.** Tap card = +1. Long-press or tap the count = choose 1–4. Every change shows an "Undo" toast for 5 seconds.
7. **Deck peek bar.** Thin bar above the tabs: "38 / 60 · Amber/Steel" + mini cost curve. Swipe up for full deck sheet, down to keep searching.
8. **Compare two cards.** Long-press → Compare → pick another; both show stacked with text.
9. **Never start from blank.** Mobile opens with: "Start from a top deck", "Start from a Ready Set Ink video", "Finish my deck" (Phase 5, hide until built), or "Empty deck".
10. **Built for short sessions.** Autosave every change to a draft. "Continue where you left off" on any device. "Send to laptop" link/QR.
11. **Card-shop mode.** One tap to look up a card: price, rulings, how many you own, which of your decks use it.

### Mobile acceptance tests

- Find a card by partial name with one typo in under 5 seconds.
- Edit an imported deck (swap 4 cards) in under 90 seconds, one-handed.
- Every tap target ≥ 44×44px; primary controls in the bottom half of the screen.
- Test on a real iPhone and Android phone.

## Differentiators (later phases)

| # | Differentiator | Builds on |
| --- | --- | --- |
| 1 | Role-aware deck doctor — "You have 2 removal and 11 cards at 5+ cost. Here are 6 cheap Steel removal options." | Special searches |
| 2 | Finish my deck — lock 20 cards, fill the rest respecting budget and owned cards | Special searches, collection, meta data |
| 3 | Describe it, build it — "aggressive Amber/Steel under $50 with Toy Story cards" | Artwork/franchise data, Coconut build |
| 4 | Channel-native decks — every Ready Set Ink deck tech opens in the builder | YouTube |
| 5 | Rules in context — hover a keyword or card for official ruling + our notes | Rulings data |

Also: rotation helper ("Make Core legal"), budget mode slider, pull list button in deck panel, deck image export for thumbnails. AI suggestions are always optional, explain why, and never change the deck without a click.

## Roadmap

| Phase | Scope | Done when |
| --- | --- | --- |
| 0 · Baseline | Analytics events (builder opened, first card added, deck reached 60, saved, exported, shared) via Vercel Web Analytics | We know today's numbers |
| 1 · Layout fix | Three-zone layout; sticky deck panel ≥ 1024px; special searches into a drawer; filter bar (ink, cost, type, inkable, format); 5-item nav; remove blocking welcome modal; remove all Ko-fi / "Support Ready Set Ink" elements from the builder (one link in site footer) | Deck visible at 1280px; first card added in < 10s by a new user |
| 2 · Fast building | Text deck list grouped by type; "2 / 4" counters and in-deck borders; click/right-click/shift-click; progress bar + legality warnings; undo; hotkeys; full mobile mode | 60-card deck in under 5 min on desktop; 4-card swap one-handed on a phone in under 90s |
| 3 · Stats and sharing | Stacked curve; inkable band; hand odds; sample hand; maybeboard; import any list; export formats + deck image; versions | Import from Dreamborn works for 10/10 test decks |
| 4 · Differentiators | Deck doctor; rotation helper; budget mode; channel deck links; rules on hover | A Dreamborn-less feature used on 20%+ of decks |
| 5 · AI building | Finish my deck; describe-it-build-it | Suggestions accepted on 30%+ of uses |

## Quality bar (applies to every phase)

**Speed**

- Load the full card list once, cache it on the device, search in the browser — every keystroke filters in under 50ms.
- Virtualized grid; lazy-load images at the size shown.
- Usable in under 2 seconds on a mid-range phone over 4G.

**Works anywhere**

- Installable (PWA); offline search and editing, sync when back online.

**Accessible**

- Full keyboard use, visible focus rings, screen-reader labels on icon buttons ("Add Elsa – Snow Queen", not "+").
- Ink colors always paired with icon or name.
- WCAG AA contrast in both themes.

**Look and feel**

- Dark mode plus the current light theme, following the device setting with a manual toggle.
- Short animations (card flies into deck, count ticks, curve grows); respect "reduce motion".
- Light haptic on phones when adding/removing (where supported).

**Clean builder**

- No Ko-fi, donation or "Support Ready Set Ink" prompts anywhere in the builder. One quiet link in the site footer only.
- TCGplayer buy links stay, as "Buy missing cards · $12" in the deck panel.
- Achievement toasts ("+25 dust") only after meaningful moments like a first saved deck, never mid-build.
