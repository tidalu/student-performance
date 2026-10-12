# Reduced frontend verification

Updated 12 October 2026. This file records checks actually run after the scope reduction.

## Automated checks

- `npm test`: passed — 3 files, 16 tests.
- `npm run build`: passed — TypeScript project build and Vite production bundle.
- `npm audit --audit-level=high`: passed — 0 vulnerabilities.
- `designmd lint DESIGN.md`: passed — 0 errors and 0 warnings.
- Prettier completed on the changed application and documentation files; `git diff --check` passed.
- Static anti-pattern search found no native alert/confirm/prompt calls, placeholder links, unsafe HTML assignment or product form missing `noValidate` in the active reduced code.
- Domain coverage includes registration/login, owner isolation, exact CSV validation, row limit, G1 statistics, complete deterministic runs, atomic invalid-output rejection and evaluation metric derivation.
- Existing reduced-plan tests remain included and pass.

## Static scope checks

- Active product routes: Register, Login, Dashboard, Upload, Dataset detail, Saved results, Evaluation and Help.
- `/plan` remains hidden team tooling and is absent from product navigation.
- Removed active modules: multi-role screens, import preview, async run lifecycle, record review, data quality, analytics, activity, account management, preferences, notifications, exports, feedback outbox and backup/restore.
- Product files no longer import the removed screen modules.

## Browser verification status

Browser execution was attempted but is not claimed: the local cloud browser could not reach the executor's localhost, and the environment could not download the Playwright Chromium binary. No new visual screenshot or end-to-end browser pass is asserted.

Before a public release, run the following locally:

1. Register → Login → empty Dashboard.
2. Alex Login → seeded Dataset → statistics → prediction → saved Results.
3. Valid fixture import and every invalid fixture with unchanged dataset count.
4. Direct foreign dataset/run routes under both seeded accounts.
5. Evaluation available, absent and malformed states.
6. 31-row second-page navigation and Back behavior.
7. Keyboard-only forms/navigation/dialog, 390px viewport, 200% zoom and reduced motion.
8. Developer reset confirmation and session-expiry recovery.

## Prototype limits

The frontend does not train a model, implement secure authentication, persist across full reloads or complete the course paperwork. It demonstrates the agreed UI and service contracts using synthetic in-memory data.
