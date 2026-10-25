# VYRO development

- When resuming on another machine, read [CODEX_HANDOFF.md](CODEX_HANDOFF.md) for the 25 October 2026 handoff and next steps. Verify current repository/account state; the handoff is a dated snapshot.
- This is a native React Native / Expo mobile project, not a website.
- Work in `mobile`; follow its version-specific Expo guidance.
- Keep user-selected stack: TypeScript, Expo, native maps, Reanimated, Zustand, then Supabase/PostgreSQL and Expo Location in later phases.
- Preserve the navy/lime/lavender/coral identity and Norwegian UI.
- Never label simulated data as GPS recordings or mix it into real training records.
- Complete and verify the visual prototype before enabling real location collection or backend uploads.
- Keep routes private by default. Never commit secrets or client service-role keys.
- Run typecheck, lint and relevant tests. Report device-only checks as untested until physically verified.
- Keep `docs/roadmap.md` and `docs/testing.md` aligned with actual implementation.
- Keep every feature as simple, attractive and comfortable to use as possible. Prioritize the GPS/workout screen over decorative animation: distance, active time, pace and Pause must be immediately visible.
- Use Kokonut UI for component, card and interaction inspiration; Motion.dev for transition and animation principles; Anime.js for advanced visual animation inspiration. Implement mobile animations with React Native Reanimated, without adding these web libraries to the app.
- REA is optional for relevant technical analysis, following the user's clarification of 23 October 2026. It is not a prerequisite for every redesign. If a requested REA analysis cannot run, report the missing capability instead of claiming it was performed. REA remains a development tool, not an app dependency.
- Use `docs/design-references/strava/README.md` as the usability reference: clear hierarchy, simple rows, prominent workout metrics and controls. Reference screenshots are private design material, not app assets.
- Current design direction: white background by default; Home, Maps, Record, Groups, You structure. Use `docs/strava-feature-map.md` to track actual parity and missing backend capabilities. Do not restore decorative dashboard features or fake social interactions.
- Latest authorized product direction adds workout-only social posts and route-based turf competitions. Local example interactions must be explicitly labeled; simulations must never publish as real workouts or win real turf. See `docs/social-and-turf.md`.
