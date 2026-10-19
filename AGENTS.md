# VYRO development

- This is a native React Native / Expo mobile project, not a website.
- Work in `mobile`; follow its version-specific Expo guidance.
- Keep user-selected stack: TypeScript, Expo, native maps, Reanimated, Zustand, then Supabase/PostgreSQL and Expo Location in later phases.
- Preserve the navy/lime/lavender/coral identity and Norwegian UI.
- Never label simulated data as GPS recordings or mix it into real training records.
- Complete and verify the visual prototype before enabling real location collection or backend uploads.
- Keep routes private by default. Never commit secrets or client service-role keys.
- Run typecheck, lint and relevant tests. Report device-only checks as untested until physically verified.
- Keep `docs/roadmap.md` and `docs/testing.md` aligned with actual implementation.
- Follow the user's mandatory REA analysis workflow for further redesign. If the REA MCP tool is unavailable, report that dependency instead of claiming REA analysis was performed. REA remains a development tool, not an app dependency.
- Use `docs/design-references/strava/README.md` as the usability reference: clear hierarchy, simple rows, prominent workout metrics and controls. Reference screenshots are private design material, not app assets.
