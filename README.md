# Student Performance — Prediction and Decision Support

A frontend-only React + TypeScript university prototype, using the supplied dashboard reference. Real browser CSV reading, strict validation, versioned IndexedDB persistence and deterministic simulated predictions. No backend, real authentication, real student data or validated educational model.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates `dist`; deploy that folder with SPA fallback to `index.html`. `npm test` runs domain tests. The running desktop preview for this implementation is http://localhost:5174.

## Demo accounts

Seed and administrator-created accounts use **DemoOnly!2026** unless reset. Self-registration uses the chosen demo password. Registration, password recovery and Google sign-in are frontend simulations; Google is not contacted and reset emails are not sent.

| Name             | Email                 | Role                            |
| ---------------- | --------------------- | ------------------------------- |
| Maya Reed        | maya@demo.example     | Teacher: 24, 80 and 120 records |
| Noah Chen        | noah@demo.example     | Teacher: separate 36 records    |
| Amina Patel      | analyst@demo.example  | Aggregate evaluation            |
| Alex Morgan      | admin@demo.example    | Account administration          |
| Disabled teacher | disabled@demo.example | Disabled login example          |

Use Fill credentials then Sign in. Do not enter real credentials. Teacher and administrator service guards demonstrate intended boundaries, but client-side permissions are not production security.

## Main walkthrough

The shared team roadmap is available at `/plan` after sign-in, in Core and Full modes for every demo role. It retains all 122 task briefs, five sprints and ten reference sections. Use Roadmap / Three-list board for task progress, Team & capacity for names, observed skills and availability, and Export / Restore progress for portable planning backups. This browser-local planning state is separate from the workspace database backup; it is not synchronized with GitHub or Trello. Original plan downloads the unmodified supplied HTML.

1. Sign in as Maya. Download a sample in Upload or Help, or select a file from `public/fixtures`.
2. Upload `demo-valid-12.csv`, Validate file, review the rows, Confirm import.
3. Run prediction. Results persist after refresh. The invented `demo-rule-v1` is documented in Help and `src/domain.ts`.
4. Use result filters, review an individual record, and inspect activity.
5. Upload `demo-invalid-values.csv` to inspect concrete row errors. Confirmation is disabled.
6. Open Demo Controls for named one-shot failures, slow latency, preview/session expiry, persona switching, Core/Full scope, backup/restore and reset. Scenario links explain the trigger and navigate to the relevant page.

Full mode defaults on and includes optional course enhancements. Core hides review, quality, analytics, activity, accounts, preferences and exports while preserving the essential import/prediction/evaluation journey. These enhancements are not mandatory course commitments. See FEATURES.md.

## Routes

`/login`, `/datasets`, `/datasets/new`, `/imports/:id`, `/datasets/:id`, `/prediction-runs/:id`, `/evaluations/demo-eval-v1`, `/evaluations/one-class`, `/help`. Full: `/datasets/:id/records/:recordId`, `/datasets/:id/quality`, `/analytics`, `/activity`, `/admin/accounts`, `/settings`.

## Storage and recovery

One versioned IndexedDB object stores accounts, datasets, previews, runs, reviews, events, feedback and preferences. Sessions use sessionStorage; sign-out clears user session caches. Previews expire after 30 minutes and expired unconsumed previews are cleaned on the next upload. Consumed markers prevent reuse even after dataset deletion. Running jobs resume from saved timing metadata. This does not promise exactly-once execution in a future backend.

Reset is explicit and requires confirmation. Export backup before resetting. Restore validates format, identity uniqueness and references before replacing data, downloads the current backup first and signs out. An invalid restore preserves current data. Backup format is prototype-specific.

## Source ownership

- `src/main.tsx`: application shell, navigation and demo tools.
- `src/components.tsx`: shared table, dialog, sign-in, titles and workflow steps.
- `src/features/screens.tsx`: connected feature screens.
- `src/domain.ts`: typed async services, parsing, authorization, fixtures and persistence.
- `src/domain.test.ts`: domain contract tests.
- `src/style.css`: reference-derived tokens and responsive layout.

See DESIGN.md, UX-CONTRACT.md and VERIFICATION.md for design, behavior, evidence and remaining limitations.
