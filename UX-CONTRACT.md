# Behavior contract

- Teachers access only their own datasets, runs and reviews. Analysts see aggregate evaluations. Administrators manage accounts without student-record access. Service ownership guards supplement routing.
- Core mode hides optional modules; Full includes review, quality, analytics, activity, accounts, preferences and exports. Help and Demo Controls are shared.
- Confirm import creates one dataset and consumes its preview. Consumed markers survive dataset deletion. Preview lifetime is 30 minutes. Invalid CSVs cannot commit.
- Uncertain import responses reconcile by preview.dataset rather than retrying a mutation. Saved running jobs complete once from timing metadata, including after reload. This is not a future server exactly-once guarantee.
- Destructive actions use the shared Dialog, focus Cancel and require explicit confirmation. Running datasets cannot be deleted. Account permission changes require a second confirmation; last administrator is protected.
- Persistence is versioned IndexedDB; session is sessionStorage. Raw passwords are not persisted. Registered/reset demo passwords use salted PBKDF2 digests in local IndexedDB and prototype backups; this is mock authentication, not production access control. Backup replacement validates before committing and first downloads the current state. Invalid backup preserves state.
- Tables use URL sort/page/size. Record search stays out of URLs to avoid exposing student values. Export scopes are explicit All matching / Current page. CSV user text receives spreadsheet formula protection.
- Save review stays on record, rename stays in context, import opens dataset, run opens saved run, logout clears session. Toasts acknowledge committed changes; correction errors remain inline.
- Native select owns platform dropdown appearance. Global CSS owns scrollbar and control states. App owns toast; Dialog owns modal behavior; Table owns bounded data navigation; domain.ts owns storage and mutations.

## Canonical UI Map

| Capability      | Canonical owner                  | Source of truth | Allowed variants                            | Verification                        |
| --------------- | -------------------------------- | --------------- | ------------------------------------------- | ----------------------------------- |
| Select/Listbox  | Native select                    | DESIGN.md       | Platform popup                              | Browser keyboard check              |
| Form            | Labelled native controls         | UX-CONTRACT.md  | Create and edit                             | Domain tests and browser            |
| Scrollbar       | src/style.css                    | DESIGN.md       | Global inherited baseline                   | Narrow viewport                     |
| Toast           | App status system                | UX-CONTRACT.md  | Success and error                           | Browser                             |
| CRUD            | domain.ts + Dialog               | UX-CONTRACT.md  | Create, rename, delete                      | Domain tests                        |
| Date            | Native input type=date           | UX-CONTRACT.md  | Activity UTC calendar boundaries            | URL range and domain filtering      |
| Drawer/Dialog   | components.tsx Dialog            | DESIGN.md       | Centered or side drawer; busy closure guard | Browser focus and responsive checks |
| Popover/Tooltip | ui.tsx                           | DESIGN.md       | Account, notifications, icon descriptions   | Escape, outside dismissal and focus |
| Read recovery   | ui.tsx ReadGate and PageBoundary | UX-CONTRACT.md  | Loading, retry, safe route failure          | Named failure scenarios             |

Activity date inputs intentionally use the native Date control for keyboard entry and platform calendar behavior; boundaries are labelled UTC. Shared filters use validated URL values. Table searches and review drafts remain persona-local. Persistence failures restore the last committed snapshot. Preview Cancel discards unconsumed staged work.

Authentication extensions: AuthOptions and DemoPassword in components.tsx reuse Dialog/FormMessage and domain mock operations. Registration creates teachers only, checks duplicate email rather than name, then returns to explicit sign-in. Reset uses a one-use, 15-minute in-memory demo inbox ticket; no mail is sent. Google uses an explicitly labelled local account chooser; no Google OAuth request is made. Seeds retain the shared credential unless reset.

Auth layout refinement: registration, forgot password, local inbox, new password and success are inline AuthSurface views in Login. Google alone retains Dialog. Back/Cancel return to sign-in, pending submissions block Back, error text/values stay in the form, and transitions focus the visible heading.
