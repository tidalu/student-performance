# Reduced MVP behavior contract

This contract documents observable frontend behavior. Product scope comes from the agreed reduced course plan.

## Routes and ownership

The product routes are `/register`, `/login`, `/dashboard`, `/upload`, `/datasets/:id`, `/runs/:id`, `/evaluation` and `/help`. `/plan` is separate team-planning tooling and is intentionally absent from product navigation.

There is one ordinary account type. Authenticated users can read only datasets and runs whose `ownerId` matches the current account. A foreign and nonexistent object use the same generic unavailable view so the route does not disclose another account's object name. This browser check demonstrates the intended boundary; the real Django server must enforce it.

## Navigation outcomes

| Operation      | Pending behavior               | Success                                          | Failure                                        |
| -------------- | ------------------------------ | ------------------------------------------------ | ---------------------------------------------- |
| Register       | Stable busy button             | Login with username prefilled and success notice | Preserve username, show inline correction      |
| Login          | Stable busy button             | Requested safe route or Dashboard                | Generic inline error; clear password           |
| Import CSV     | Stable busy button             | Saved Dataset detail                             | No dataset/rows; bounded row and column errors |
| Run prediction | Stable busy button             | Saved Results                                    | Preserve dataset; no partial run/results       |
| Sign out       | Immediate                      | Login                                            | Not applicable in mock                         |
| Reset demo     | Explicit in-panel confirmation | Sign out to seeded Login                         | Keep current state if not confirmed            |

## Forms

Forms use `noValidate`. Every input has a real label. Passwords are masked by default, allow paste/password managers and have independent accessible reveal controls. Validation uses visible text, `aria-invalid` and existing described-by targets where relevant. Duplicate submits are blocked while busy.

## CSV import

One native file picker accepts one `.csv` file. Client rules mirror the planned server contract: UTF-8 CSV, maximum 1 MiB, 1–500 rows and exactly `source_row_id,G1,failures,studytime`. The entire file validates before store mutation. Any error produces no partial dataset. The mock does not persist raw bytes.

## Tables

Read-only data tables use semantic `<table>` markup and 25-row Previous/Next pagination. Current range and total remain visible; unavailable controls remain in place but disabled. Tables own horizontal overflow on narrow screens. There are intentionally no search, sort or filter controls in the reduced product.

## Feedback and errors

Correctable form and operation errors remain inline. Authentication errors are generic. Route failures use app-owned panels and keep a route back to Dashboard. Evaluation absent/malformed states never display stale metrics. Every route owns an honest document title.

## Prototype boundary

State lives in one module-level in-memory store and resets on a full reload. It remains coherent across navigation, logout and login during the running page session. Browser state is not production security. The final application must use Django authentication, CSRF, server ownership queries, database transactions and a trusted frozen inference artifact.

## Canonical UI map

| Capability                 | Owner                           | Verification                                  |
| -------------------------- | ------------------------------- | --------------------------------------------- |
| Form/password              | `components.tsx` and page forms | Unit/build plus browser when available        |
| Scrollbar/responsive shell | `style.css`                     | Narrow viewport/browser inspection            |
| Table/pagination           | `DataTable` and `Pager`         | Domain fixtures and browser inspection        |
| Dialog                     | Native shared `Dialog`          | Escape, viewport and focus browser inspection |
| Route/domain ownership     | `main.tsx` and `domain.ts`      | Domain tests                                  |
| CSV parsing/validation     | `domain.ts` with Papa Parse     | Domain tests                                  |
