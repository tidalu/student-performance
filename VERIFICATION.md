# Verification and scenario checklist

Updated on 11 October 2026. This records actual checks; implementation is not evidence that a browser workflow passed.

## Automated evidence

- `npm run build`: TypeScript and Vite production bundle passed.
- `npm test`: 31 domain tests passed. Covers CSV quoted/BOM/CRLF/semicolon handling, schema/value errors, limits, numeric parsing, formula protection, ownership, analyst restrictions, concurrent duplicate confirmation, consumed preview after deletion, expiry, rollback, uncertain import reconciliation, malformed result rejection, running deletion guard, deterministic results, usable new account, disabled login, last administrator protection, private reviews, invalid backups and broken references.
- Strict premium UI audit: zero findings (`audit-results.json`).
- `npm audit`: installation after the test-runner update reported zero vulnerabilities.
- Prettier applied to application code and documentation.

## Browser evidence

| Journey                                | Actual result                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Maya sign-in                           | Passed, including a protected upload deep link                                                               |
| Real CSV file picker                   | Passed with `public/fixtures/demo-valid-12.csv`                                                              |
| Validate, preview, confirm             | Passed: 12 parsed rows, no issues, one 12-record dataset                                                     |
| Start prediction, reload results       | Passed: 12 persisted results; 4 above and 8 below threshold                                                  |
| Results filter                         | Passed: above-threshold table contains exactly 4 rows                                                        |
| Private teacher review                 | Passed: saved note visible after browser refresh                                                             |
| Invalid local CSV                      | Passed: 5 concrete findings across 3 rows; confirmation disabled                                             |
| Core navigation                        | Passed: teacher navigation reduces to Datasets and Model evaluation                                          |
| Analyst persona and direct dataset URL | Passed: evaluation available, record route Forbidden                                                         |
| Evaluation fixture                     | Browser showed 80.0% accuracy, 72.7% precision, 80.0% recall, 76.2% F1, 80.0% specificity                    |
| Demo Controls modal/native selects     | Passed opening and selecting scope/persona; native modal makes background inert                              |
| Responsive                             | Inspected 1440px desktop and 390px phone; fixed grid overflow; phone document scrollWidth equals clientWidth |
| Screenshots                            | `screenshots/dashboard.jpg` and `screenshots/invalid-preview.jpg`                                            |

## Reproducible scenario instructions

Demo Controls has scenario links with operation-specific triggers. Choose Maya for record workflows.

- Invalid credentials / disabled account: use sign-in form and documented accounts.
- Session expiry: Expire session; sign in again.
- Wrong owner: Maya opens `/datasets/dataset-4`.
- Empty workspace: Explore empty teacher workspace creates a synthetic teacher with no datasets.
- No results: dataset search `does-not-exist`, then Clear filters.
- CSV errors: invalid/missing fixtures; all nine fixtures are in Help and `public/fixtures`.
- Preview expiry: validate a valid file, use Expire previews, then confirm.
- Duplicate confirmation: confirm, return to preview; concurrent requests also have an automated test.
- Import rollback: choose named scenario, validate and confirm; retry deliberately.
- Uncertain import: confirmation commits locally, response is interrupted; Check import status opens the same dataset.
- ML unavailable / malformed predictions / slow prediction / connection loss: choose scenario then start a prediction. Check the same run ID; no hidden create retry.
- Completed recovery: refresh a saved run.
- Undefined evaluation: select one-class fixture.
- Missing evaluation: open `/evaluations/missing` and recover with Open evaluation.
- Failed download: choose download scenario and request an export.
- Failed review: write a note, choose review failure, save; draft stays editable.
- Corrupt restore: Test corrupt backup rejection; existing state is retained.
- Account flows: admin creates Taylor; Taylor signs in to an empty workspace; admin disables Taylor; next login is denied. Service-level tests passed.
- Feedback: Help saves into the persona-local outbox and explicitly says no email was sent.
- Reset/restore: explicit app confirmations; invalid restore validation runs before replacement.

## Verification limits and remaining refinements

The in-app browser's download event/save-dialog automation timed out. CSV fixture files and CSV serialization were verified independently; a completed browser save-and-reupload round trip is not claimed. Actual upload from disk passed. Print/Save as PDF, full admin UI changes, feedback export, backup replacement, 200% zoom, tablet layouts and a full accessibility audit were not exhaustively exercised in the browser.

The prototype has no real backend, authentication or educational ML. Persistence assumes one active editing tab; cross-tab concurrency/conflict reconciliation and IndexedDB quota-failure recovery are not implemented. Unsaved-change prompts use the router blocker for in-app and history navigation, plus beforeunload for closing the page. Reviews support an optional saved-run association. Activity uses shared table search and type/date filters rather than a full audit-query builder. No measured educational performance or causal prescriptions are claimed.

## Frontend gap completion - 11 October 2026

| Audit IDs     | Implementation owners and changes                                                                                                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1-A14, B1-B3 | ui.tsx, components.tsx, main.tsx: breadcrumbs/return context, URL filters, unread links, popovers/tooltips, tablet utilities, drawers/busy guard, persistent accessible errors, keyboard tabs, timestamp sorting, credentials and session drafts |
| C1-C6         | screens.tsx/domain.ts: recent events/latest run, cancelable upload stages/metadata, invalid fixture, row counts/issues/parsed rows, distinct preview states and discard, persistence rollback                                                    |
| D1-D6         | screens.tsx/components.tsx/domain.ts: history IDs/times, saved model/schema/threshold, metadata drawer/explanation, timing stages, seven response failure variants, export scopes/metadata, owned route boundary                                 |
| E1-E3         | insights.tsx/domain.ts: typed evaluation artifacts/read retry, full report metadata, comparison table/chart, Core numeric matrix and undefined explanations                                                                                      |
| F1-F5         | screens.tsx/insights.tsx/domain.ts: selected record/run details, complete review baseline/reset/association/status, computed quality/distributions/summary export                                                                                |
| G1-G6         | insights.tsx/domain.ts: selectable bins and exact result links, input statistics/summary export, structured activity/outcome/date/details and administrator account-only history                                                                 |
| H1-H4         | screens.tsx/support.tsx: account dates/filters/actions, expanded help/downloadable guides, persona outbox view/download/delete, centralized dates/preferences/defaults                                                                           |
| I1-I5         | main.tsx/domain.ts/ui.tsx: armed/consumed/clear scenarios, failure catalogue and failed seed run, storage rollback/corrupt recovery, shared contracts/selectors, distinct route states                                                           |

New browser checks used isolated localhost:5175; original localhost:5174 data was preserved.

- Actual saved CSV download -> file picker upload -> 12 valid records -> imported dataset -> 12 saved results after refresh.
- Downloaded matching CSV inspected: exactly four above-threshold rows with correct run/schema/synthetic/scope metadata. Formula/Unicode/quote protection has automated coverage.
- Analytics selected 0-25% bin opened seven matching results. Run metadata drawer showed saved versions and timestamps. Keyboard ArrowRight changed dataset tabs.
- Review edit retained the run association; Cancel restored the full draft. Quality distribution showed schoolsup yes=8/no=16. Evaluation metrics matched the artifact; one-class displayed three undefined values with explanations.
- Feedback saved and appeared in persona outbox. View and real JSON download passed; delete Cancel retained the item.
- Account create -> actual new-account login -> empty owned workspace -> disable with second confirmation -> persistent denied-login error passed. Last-admin/ownership/history guards also pass domain tests.
- Workspace read failure showed app-owned unavailable state; Retry read recovered; scenario showed consumed.
- Core upload -> preview -> confirm -> predict -> refresh passed: 12 results, 4 above and 8 below. Optional result review/export controls were absent.
- Saved prototype backup downloaded, re-uploaded through picker, validated and restored; UI returned to sign-in with restored accounts.
- 33 render/overflow checks: datasets, upload, dataset detail, results, record, quality, analytics, activity, evaluation, help and preferences at widths 1440/820/390. Each rendered without document horizontal overflow. Table overflow remains local. This does not establish screenshot inspection of every dialog.
- Desktop evidence: screenshots/completion-dashboard.png.

Automated coverage now includes failed-save rollback, seven rejected response variants, saved thresholds/chart bins, actual quality calculation, review association/current status, administrator history authorization, safe return URLs, stale upload cancellation, named scenario consumption and valid/invalid backup replacement.

Verification limits remain explicit: native print/PDF preview, actual browser 200% zoom, exhaustive assistive-technology/contrast measurement and every possible action combination have not been inspected. No guarantee of every runtime state is inferred from a zero-finding static audit.

## Authentication extension checks

34 automated tests pass, including unique-email registration, duplicate-name acceptance, credential digest storage, custom-password login, reset token single-use and old-password rejection, and Google demo disabled/role guards. Browser checks cover registration mismatch correction, account creation, actual new-account sign-in into an empty private workspace, reset request/local inbox/new-password form and Google chooser/cancellation. Password replacement is exercised by automated domain tests; no real user or provider credentials are changed. Existing native Dialog and FormMessage own all new form/overlay states.

## Authentication design refinement

Registration and recovery now use shared split-canvas inline views instead of modal forms. Browser checks passed: empty registration error, Back/Cancel restoration, account creation success, reset request -> local inbox -> new password, and 390px registration/reset views without document overflow. Desktop registration/recovery screenshots are saved in screenshots/registration-redesign.png and screenshots/recovery-redesign.png. Google retains the existing chooser.

## Shared plan verification

Card-detail refinement: 42 tests include compatibility and validation for optional review notes, plus rendered-content checks for all 122 modal briefs (steps, criteria, snippets, resources and full descriptive text). Browser checks exercise the S2-W1-01 modal, prerequisite rejection, related-card navigation and Back, checklist persistence after reload, artifact note persistence, copying, keyboard focus containment, Escape with focus restoration, board-card opening, and a 390px stacked modal without internal/document horizontal overflow. Compact cards stay collapsed in the roadmap. Evidence: screenshots/plan-card-modal.png. The complete test run passes outside the Windows sandbox; sandbox-isolated workers encountered an inaccessible shared temporary-cache file.

40 automated tests pass. The plan tests deep-compare every supplied DATA and PANELS field against the preserved original HTML, assert all 122 IDs and dependency/unlock targets, and exercise prerequisite/checklist completion gates, optional scope, cascading reopen and invalid-backup rejection. Production build and strict UI audit pass.

Browser checks on the isolated local preview: protected `/plan` return after demo sign-in; all nine reference tabs plus full team guidance; ready filtering; blocked Done; checklist persistence across reload; capacity upper estimate against 80% availability; progress export and actual restore with preceding-state safety download; desktop and 390px layout without document horizontal overflow. Planning progress remains separate from the application's IndexedDB backup. Evidence: screenshots/project-plan.png. These checks do not claim external board synchronization.
