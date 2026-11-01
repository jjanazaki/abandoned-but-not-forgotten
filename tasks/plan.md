# Implementation Plan: Abandoned but not Forgotten

## Overview

موقع أرشيف استكشاف فضائي تفاعلي (Interactive Space Exploration Archive). المستخدم يبدأ من "المجموعة الشمسية" كواجهة اختيار (carousel بعمق 3D)، يختار جسمًا فضائيًا، يدخل "Planet Explorer" لاستكشاف سطحه والنقاط (المعدات/المركبات)، puis يفتح "Equipment Detail" (مجسم 3D + Simple/Detailed View)، وينزّل "Equipment File" (PDF مصمّم حسب الوجهة). إضافة: "Timeline" (خط زمني لجميع المعدات الموثقة). الهدف: عملي (بيانات حقيقية) وليس Animation فقط.

Tech stack (من القسم 11): React + Vite + TypeScript، Three.js، CSS، JSON (بيانات)، مكتبة PDF.

## Architecture Decisions

- **Frontend-only (MVP):** لا backend. البيانات في JSON (أو static TS modules) في `src/data/`. سهولة نشر static (Vercel/Netlify).
- **Routing:** React Router v6. كل معدة لها رابط مستقل (deep link) — قسم 10.3. State (الكوكب المختار، كاميرا، zoom) يُحفظ في store (Zustand) + URL params (query) لاستعادة "المشهد السابق" — قسم 9.
- **3D:** Three.js مع React Three Fiber (R3F) + drei. Meshes/OrbitControls. Lazy-load مشاهد 3D (code-splitting) — قسم 10.5.
- **PDF:** `@react-pdf/renderer` (قوالب React) أو `jsPDF`+html2canvas. التوصية: `@react-pdf/renderer` لتحكم في التخطيط/الطباعة. قوالب حسب الوجهة (Mars/Moon/Deep Space) colours.
- **Motion:** Framer Motion (transitions) + reduced-motion respect (prefers-reduced-motion).
- **Accessibility:** keyboard + touch للاختيار والنقاط (قسم 10.4). ARIA labels.
- **Data integrity (قسم 10.1/10.2):** فقط معدات ببيانات موثقة. إحداثيات حقيقية إن توفرت. حالات واضحة (concluded / lost contact / inactive / uncertain). لا اختلاق تواريخ.
- **Boundary:** العمل داخل `/home/m7/Projects/Abandoned-but-not-Forgotten/`. لا تعديل ملفات أُخرى. Branch: `main` (single) + feature branches per phase. npm (not pnpm) — consistent with Air Scout.

## Task List

### Phase 0: Decisions & Content (blockers before coding)
- [ ] Task 0: Resolve open questions (section 12 + قسم 2). إجابة: أيّ bodies في الـ Orbit؟ (كواكب + قمر + أجرام؟) إحداثيات حقيقية vs illustrative؟ حالات المعدات؟ device support scope؟
- [ ] Task 1: Define v1 body list + equipment list (JSON schema draft) and gather verified sources per equipment.

### Checkpoint: Decisions
- [ ] Open questions answered and recorded in `src/data/README.md`
- [ ] v1 body/equipment inventory approved by Mahmoud

### Phase 1: Foundation
- [ ] Task 2: Scaffold React+Vite+TS project, routing, ESLint, build, README. (S, 3-4 files)
- [ ] Task 3: Design tokens as CSS variables (palette section 7) + base typography/spacing. (S, 2 files)
- [ ] Task 4: Data model (TS types) + JSON content files + loaders + validation (zod). (M, 4-5 files)
- [ ] Task 5: Shared layout shell: header, Back buttons, page container, error boundary, 404. (S, 3 files)
- [ ] Task 6: Global state store (Zustand) for selected body, camera/zoom, timeline filters; persist to sessionStorage. (S, 2 files)

### Checkpoint: Foundation
- [ ] `npm run build` passes, `npm run dev` runs on :5173
- [ ] Types validate sample data

### Phase 2: Solar System landing
- [ ] Task 7: Solar system 3D scene (slow orbiting bodies, starfield, soft blur backdrop). (M, 3 files)
- [ ] Task 8: Horizontal drag selection (carousel with depth, name update, Explore!/View Timeline buttons). (M, 4 files)
- [ ] Task 9: Keyboard (←/→) + touch (swipe) + mouse drag input unification. (S, 2 files)
- [ ] Task 10: Explore! transition (body → Planet Explorer) with visual handoff. (S, 2 files)

### Checkpoint: Solar System
- [ ] Can navigate all bodies via mouse/keyboard/touch
- [ ] Explore! routes to correct planet page

### Phase 3: Planet Explorer
- [ ] Task 11: Planet surface scene (Three.js, pan/zoom, lighting). (M, 3 files)
- [ ] Task 12: Equipment point markers (blue dots) + hover tooltip (name + launch date). (M, 3 files)
- [ ] Task 13: Click point → Equipment Detail; Back to Solar System preserves camera/zoom. (S, 2 files)
- [ ] Task 14: Empty/missing-model fallback (image instead of 3D). (S, 1 file)

### Checkpoint: Planet Explorer
- [ ] Hover shows tooltip; click navigates; back restores view

### Phase 4: Equipment Detail
- [ ] Task 15: 3D model viewer (OrbitControls, zoom, reset) + image fallback. (M, 3 files)
- [ ] Task 16: Simple View cards (name, short desc, status). (S, 2 files)
- [ ] Task 17: Detailed View expand/collapse (height+opacity animation, "عرض أكثر"/"عرض أقل"). (S, 2 files)
- [ ] Task 18: Detailed fields: story, dates, specs, tables, coords, achievements, sources. (M, 4 files)
- [ ] Task 19: Back to Planet preserves camera/zoom state. (S, 1 file)

### Checkpoint: Equipment Detail
- [ ] Model rotates/zooms; toggle works; back restores

### Phase 5: Downloadable Equipment Files (PDF)
- [ ] Task 20: PDF template system with per-destination color themes (Mars/Moon/Deep Space). (M, 4 files)
- [ ] Task 21: Generate & download equipment file from detail page. (S, 2 files)
- [ ] Task 22: Content: cover, mission intro, dates, story, specs, tables, images, status, location, sources. (M, 3 files)
- [ ] Task 23: Print/PDF pagination test (fonts, images, page breaks). (S, 1 file)

### Checkpoint: PDF
- [ ] Download produces valid PDF with correct theme per destination

### Phase 6: Timeline
- [ ] Task 24: Horizontal timeline (desktop): points, year above, month+name on hover. (M, 3 files)
- [ ] Task 25: Click point → Equipment Detail; back to start button. (S, 2 files)
- [ ] Task 26: Mobile: vertical list or horizontal scroll (no tiny points). (S, 2 files)
- [ ] Task 27: Sort by launch date; missing dates excluded (no fabrication). (S, 1 file)

### Checkpoint: Timeline
- [ ] All documented equipment appears; navigation works

### Phase 7: Motion, A11y, Performance
- [ ] Task 28: Unified motion system (transitions table section 8) + reduced-motion. (M, 3 files)
- [ ] Task 29: Keyboard/touch support across all interactive points. (S, 2 files)
- [ ] Task 30: Performance: lazy 3D load, compressed images, pause off-screen, Lighthouse. (M, 3 files)

### Checkpoint: Polish
- [ ] Lighthouse ≥ 80 (mobile), reduced-motion respected

### Phase 8: Content & Verification
- [ ] Task 31: Populate v1 equipment data from verified sources only. (L, 5+ files)
- [ ] Task 32: E2E smoke test: Solar System → Planet → Equipment → PDF → Timeline. (M, 3 files)
- [ ] Task 33: Responsive review (mobile/tablet/desktop) + accessibility audit. (M, 3 files)

### Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Ready for review by Mahmoud

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| 3D model availability/rights (قسم 4.a) | High | Image fallback; source models from NASA/ESA (public domain) first |
| Real coordinates not available for all equipment | Med | Mark as "illustrative placement" in UI; only verified coords as points |
| PDF pagination/typography quality | Med | Test early (Task 23); use print CSS + fixed page sizes |
| Performance on mobile with Three.js | High | Lazy load, compressed textures, reduced-motion, device-tier gating |
| Data fabrication risk (dates) | High | Strict schema + "no date = excluded from timeline" rule; source citations required |
| Scope creep (many bodies/equipment) | Med | v1 = small curated set; expand later |

## Open Questions (resolved 2026-10-29 — Mahmoud's answers)

1. **Orbit contents:** كله — كل الأجسام (كواكب + قمر + أجرام + وجهات فضائية).
2. **Coordinates:** حقيقية — إحداثيات NASA/ESA موثقة.
3. **Equipment states:** نعم — حالات واضحة (concluded / lost contact / inactive / uncertain).
4. **Deep links:** نعم — رابط مستقل لكل معدة.
5. **Device support:** نعم — ماوس + كيبورد + لمس.
6. **Performance budget:** عادي — Lighthouse معقول (no strict floor).
7. **Sources language:** الاتنين — إنجليزي (NASA) + ملخصات/ترجمة عربية.
8. **Hosting/deploy:** Vercel (primary). "h" — treat as hosting/Vercel; clarify if GitHub Pages also needed.
9. **i18n:** الاتنين — عربي + إنجليزي.
10. **v1 scope:** الي تقدر عليه — quality over speed, no time limit; include as many verified bodies/equipment as feasible (NASA public-domain models first).

## Parallelization Opportunities

- Safe parallel: Tasks 7/8 (solar system) after 2-6; Tasks 11/12 (planet) after 7; PDF templates (20) independent of UI; Timeline (24-27) independent of Equipment Detail once data exists.
- Sequential: data schema (4) → content (31); routing/state (5,6) → pages; 3D foundation (7,11,15) before polish.
- Coordination: define JSON data contract (Task 4) before parallel content work.

## Boundaries

- Work directory: `/home/m7/Projects/Abandoned-but-not-Forgotten/`
- Branch: `main` (initial); feature branches per phase (`phase/N-...`)
- Do not touch other projects or `~/.hermes`.
- npm (not pnpm). Node 24 via mise for tests (per box runtime rule).
- No money spent, no external accounts without approval.
