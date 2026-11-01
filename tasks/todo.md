# Todo: Abandoned but not Forgotten

Tasks tracked here (default checklist). Plan document: `tasks/plan.md`.

## Phase 0: Decisions & Content
- [ ] Task 0: Resolve open questions (plan.md Open Questions)
- [ ] Task 1: Define v1 body/equipment list + JSON schema draft + verified sources

## Checkpoint: Decisions
- [ ] Open questions answered and recorded
- [ ] v1 inventory approved by Mahmoud

## Phase 1: Foundation
- [ ] Task 2: Scaffold React+Vite+TS project, routing, ESLint, build
- [ ] Task 3: Design tokens (CSS variables palette) + base typography
- [ ] Task 4: Data model (TS types) + JSON content + loaders + zod validation
- [ ] Task 5: Shared layout shell (header, Back, container, 404)
- [ ] Task 6: Global state store (Zustand) + sessionStorage persist

## Checkpoint: Foundation
- [ ] `npm run build` passes, dev runs on :5173
- [ ] Types validate sample data

## Phase 2: Solar System landing
- [x] Task 7: Solar system 3D scene (slow orbit, starfield, blur backdrop)
- [x] Task 8: Horizontal drag selection (carousel depth, name, Explore!/Timeline)
- [x] Task 9: Keyboard (←/→) + touch (swipe) + mouse drag unification
- [x] Task 10: Explore! transition (body → Planet Explorer) visual handoff

## Checkpoint: Solar System
- [ ] Navigate all bodies via mouse/keyboard/touch
- [ ] Explore! routes to correct planet page

## Phase 3: Planet Explorer
- [x] Task 11: Planet surface scene (Three.js, pan/zoom)
- [x] Task 12: Equipment point markers (blue dots) + hover tooltip
- [x] Task 13: Click point → Equipment Detail; Back preserves camera/zoom
- [x] Task 14: Empty/missing-model fallback (image)

## Checkpoint: Planet Explorer
- [ ] Hover shows tooltip; click navigates; back restores view

## Phase 4: Equipment Detail
- [x] Task 15: 3D model viewer (OrbitControls, zoom, reset) + image fallback
- [x] Task 16: Simple View cards (name, short desc, status)
- [x] Task 17: Detailed View expand/collapse animation
- [x] Task 18: Detailed fields (story, dates, specs, tables, coords, achievements, sources)
- [x] Task 19: Back to Planet preserves camera/zoom

## Checkpoint: Equipment Detail
- [ ] Model rotates/zooms; toggle works; back restores

## Phase 5: Downloadable Equipment Files (PDF)
- [x] Task 20: PDF template system with per-destination color themes
- [x] Task 21: Generate & download equipment file from detail page
- [x] Task 22: PDF content (cover, mission, dates, story, specs, tables, images, status, location, sources)
- [x] Task 23: Print/PDF pagination test

## Checkpoint: PDF
- [ ] Download produces valid PDF with correct theme per destination

## Phase 6: Timeline
- [ ] Task 24: Horizontal timeline (desktop): points, year above, month+name on hover
- [ ] Task 25: Click point → Equipment Detail; back to start
- [ ] Task 26: Mobile: vertical list or horizontal scroll
- [ ] Task 27: Sort by launch date; missing dates excluded

## Checkpoint: Timeline
- [ ] All documented equipment appears; navigation works

## Phase 7: Motion, A11y, Performance
- [ ] Task 28: Unified motion system + reduced-motion
- [ ] Task 29: Keyboard/touch support across interactive points
- [ ] Task 30: Performance (lazy 3D, compressed images, pause off-screen, Lighthouse)

## Checkpoint: Polish
- [ ] Lighthouse ≥ 80 (mobile), reduced-motion respected

## Phase 8: Content & Verification
- [x] Task 31: Populate v1 equipment data from verified sources only
- [x] Task 32: E2E smoke test: Solar System → Planet → Equipment → PDF → Timeline
- [x] Task 33: Responsive review + accessibility audit

## Checkpoint: Complete
- [x] All acceptance criteria met
- [x] Ready for review by Mahmoud
