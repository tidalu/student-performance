# Student Performance — reduced course MVP frontend

An interactive React + TypeScript demonstration of the agreed small university project. It teaches the exact journey the team plans to implement with Django templates, SQLite and one frozen Python model.

This is a synthetic frontend demonstration. It has no backend, production authentication, real student data or trained educational model.

## Run

```sh
npm install
npm run dev
```

Production verification:

```sh
npm test
npm run build
```

## Demo accounts

| Username    | Password       | Seed data                          |
| ----------- | -------------- | ---------------------------------- |
| `demo_alex` | `DemoOnly123!` | Five-row dataset and one saved run |
| `demo_sam`  | `DemoOnly123!` | Separate three-row dataset         |

Use only fictional credentials. Registration creates another ordinary in-memory account and then requires explicit sign-in.

## Eight product pages

1. Register
2. Login
3. Dashboard
4. Upload
5. Dataset detail
6. Saved results
7. Evaluation
8. Help

Authenticated navigation is Dashboard, Upload, Evaluation and Help. Dataset and run pages are contextual. The hidden `/plan` route remains separate team-roadmap tooling for Scrum/course paperwork.

## Main walkthrough

1. Sign in as Alex.
2. Open the seeded dataset and verify count 5, mean G1 11.4, minimum 6 and maximum 17.
3. Run the deterministic synthetic prediction and open its complete saved result set.
4. Open Evaluation and distinguish validation comparison from held-out evidence.
5. Open Developer test panel to download a real CSV fixture, inject a named failure, test a foreign object and reset the demo.
6. Import a downloaded valid fixture on Upload. Invalid fixtures show concrete row/column errors and create nothing.

## Intentionally removed

No teacher/analyst/admin roles, preview tokens, asynchronous jobs, record reviews, notes, interventions, analytics charts, data-quality page, activity history, account management, notifications, preferences, exports, deletion UI, model registry, upload retraining or backup/restore.

## Important mock limitations

- A full reload resets the demonstration.
- The deterministic demo rule is not a trained model.
- Illustrative evaluation counts are not project results.
- Client ownership checks demonstrate the contract but do not provide real security.
- The final Django application must persist users, owned datasets and complete runs in its database.
