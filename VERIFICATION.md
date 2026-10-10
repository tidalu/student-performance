# Verification and scenario checklist

Verified on 10 October 2026. This records actual checks; implementation is not evidence that a browser workflow passed.

## Automated evidence

- `npm run build`: TypeScript and Vite production bundle passed.
- `npm test`: 15 domain tests passed. Covers CSV quoted/BOM/CRLF/semicolon handling, schema/value errors, limits, numeric parsing, formula protection, ownership, analyst restrictions, concurrent duplicate confirmation, consumed preview after deletion, expiry, rollback, uncertain import reconciliation, malformed result rejection, running deletion guard, deterministic results, usable new account, disabled login, last administrator protection, private reviews, invalid backups and broken references.
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
