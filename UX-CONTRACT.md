# Behavior contract

- Teachers access only their own datasets, runs and reviews. Analysts see aggregate evaluations. Administrators manage accounts without student-record access. Service ownership guards supplement routing.
- Core mode hides optional modules; Full includes review, quality, analytics, activity, accounts, preferences and exports. Help and Demo Controls are shared.
- Confirm import creates one dataset and consumes its preview. Consumed markers survive dataset deletion. Preview lifetime is 30 minutes. Invalid CSVs cannot commit.
- Uncertain import responses reconcile by preview.dataset rather than retrying a mutation. Saved running jobs complete once from timing metadata, including after reload. This is not a future server exactly-once guarantee.
- Destructive actions use the shared Dialog, focus Cancel and require explicit confirmation. Running datasets cannot be deleted. Account permission changes require a second confirmation; last administrator is protected.
- Persistence is versioned IndexedDB; session is sessionStorage. Passwords are not persisted. Backup replacement validates before committing and first downloads the current state. Invalid backup preserves state.
- Tables use URL sort/page/size. Record search stays out of URLs to avoid exposing student values. Export scopes are explicit All matching / Current page. CSV user text receives spreadsheet formula protection.
- Save review stays on record, rename stays in context, import opens dataset, run opens saved run, logout clears session. Toasts acknowledge committed changes; correction errors remain inline.
- Native select owns platform dropdown appearance. Global CSS owns scrollbar and control states. App owns toast; Dialog owns modal behavior; Table owns bounded data navigation; domain.ts owns storage and mutations.

## Canonical UI Map

| Capability     | Canonical owner          | Source of truth | Allowed variants          | Verification             |
| -------------- | ------------------------ | --------------- | ------------------------- | ------------------------ |
| Select/Listbox | Native select            | DESIGN.md       | Platform popup            | Browser keyboard check   |
| Form           | Labelled native controls | UX-CONTRACT.md  | Create and edit           | Domain tests and browser |
| Scrollbar      | src/style.css            | DESIGN.md       | Global inherited baseline | Narrow viewport          |
| Toast          | App status system        | UX-CONTRACT.md  | Success and error         | Browser                  |
| CRUD           | domain.ts + Dialog       | UX-CONTRACT.md  | Create, rename, delete    | Domain tests             |
