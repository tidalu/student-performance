import React, {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Link,
  RouterProvider,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  HelpCircle,
  Home,
  LogOut,
  Upload,
  X,
} from "lucide-react";
import "@fontsource-variable/manrope";
import "@fontsource-variable/dm-sans";
import * as D from "./domain";
import {
  Brand,
  DataTable,
  Dialog,
  EmptyState,
  ErrorPanel,
  Notice,
  Pager,
  PasswordField,
  Title,
} from "./components";
import "./style.css";

const Plan = lazy(() => import("./features/plan/Plan"));
const PAGE_SIZE = 25;

function useStore() {
  const [, redraw] = useState(0);
  useEffect(() => D.subscribe(() => redraw((value) => value + 1)), []);
  return D.store;
}

function ButtonBusy({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="busy-label">
      <span
        className={busy ? "spinner" : "spinner placeholder"}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}

function App() {
  useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const user = D.currentUser();
  const [demoOpen, setDemoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const protectedRoute = !["/login", "/register", "/plan"].includes(
    location.pathname,
  );

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    if (protectedRoute && user && D.expireSessionIfRequested())
      navigate("/login?expired=1", { replace: true });
  }, [location.pathname, navigate, protectedRoute, user]);

  useEffect(() => {
    if (!user && protectedRoute && location.pathname !== "/")
      navigate(`/login?return=${encodeURIComponent(location.pathname)}`, {
        replace: true,
      });
    if (user && location.pathname === "/")
      navigate("/dashboard", { replace: true });
    if (!user && location.pathname === "/")
      navigate("/login", { replace: true });
  }, [location.pathname, navigate, protectedRoute, user]);

  const signOut = () => {
    D.logout();
    navigate("/login");
  };
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: Home },
    { to: "/upload", label: "Upload", icon: Upload },
    { to: "/evaluation", label: "Evaluation", icon: Gauge },
    { to: "/help", label: "Help", icon: HelpCircle },
  ];

  return (
    <div className="app-frame">
      <header className="app-header">
        <Link
          className="brand"
          to={user ? "/dashboard" : "/login"}
          aria-label="Student Performance home"
        >
          <Brand />
        </Link>
        {user && (
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                aria-current={location.pathname === to ? "page" : undefined}
                className={location.pathname === to ? "active" : ""}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
        )}
        <div className="header-actions">
          <span className="demo-badge">
            <i />
            Synthetic demo
          </span>
          {user && (
            <button
              type="button"
              className="account-button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="account-menu"
            >
              <span>{user.username.slice(0, 2).toUpperCase()}</span>
              <b>{user.username}</b>
            </button>
          )}
        </div>
        {user && menuOpen && (
          <div id="account-menu" className="account-menu">
            <p>
              Signed in as <strong>{user.username}</strong>
            </p>
            <button type="button" onClick={signOut}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        )}
      </header>
      {user && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              aria-current={location.pathname === to ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      )}
      <main
        className={
          user || location.pathname === "/plan" ? "workspace" : "auth-workspace"
        }
      >
        <RouteView />
      </main>
      <footer className="app-footer">
        <span>
          <i />
          Interactive prototype · resets on full reload
        </span>
        {user && (
          <button type="button" onClick={() => setDemoOpen(true)}>
            <FlaskConical size={15} />
            Developer test panel
          </button>
        )}
      </footer>
      {demoOpen && user && <DemoPanel close={() => setDemoOpen(false)} />}
    </div>
  );
}

function RouteView() {
  const { pathname } = useLocation();
  const user = D.currentUser();
  if (pathname === "/login") return <LoginPage />;
  if (pathname === "/register") return <RegisterPage />;
  if (pathname === "/plan")
    return (
      <Suspense fallback={<p role="status">Loading team roadmap…</p>}>
        <Plan />
      </Suspense>
    );
  if (!user || pathname === "/") return null;
  if (pathname === "/dashboard") return <DashboardPage />;
  if (pathname === "/upload") return <UploadPage />;
  if (pathname === "/evaluation") return <EvaluationPage />;
  if (pathname === "/help") return <HelpPage />;
  if (pathname.startsWith("/datasets/"))
    return <DatasetPage id={pathname.split("/")[2]} />;
  if (pathname.startsWith("/runs/"))
    return <ResultsPage id={pathname.split("/")[2]} />;
  return (
    <ErrorPanel
      title="Page not found"
      text="This address is not part of the reduced prototype."
    />
  );
}

function AuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} — Student Performance`;
  }, [title]);
  return (
    <div className="auth-shell">
      <section className="auth-story">
        <Brand />
        <p className="eyebrow">SMALL, TESTABLE COURSE PROJECT</p>
        <h1>From a checked CSV to an explainable result.</h1>
        <p>{intro}</p>
        <ol>
          <li>
            <b>01</b> Import approved synthetic rows
          </li>
          <li>
            <b>02</b> Run one frozen model
          </li>
          <li>
            <b>03</b> Read results and limitations
          </li>
        </ol>
        <span className="demo-badge inverse">
          <i />
          No real student data
        </span>
      </section>
      <section className="auth-card">{children}</section>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const [username, setUsername] = useState(params.get("registered") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      D.login(username, password);
      const target = params.get("return");
      navigate(target?.startsWith("/") ? target : "/dashboard", {
        replace: true,
      });
    } catch {
      setError("Username or password is incorrect.");
      setPassword("");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  };
  const fill = (name: string) => {
    setUsername(name);
    setPassword("DemoOnly123!");
    setError("");
  };
  return (
    <AuthShell
      title="Sign in"
      intro="A focused demonstration of ownership, validated import, prediction and controlled evaluation."
    >
      <div className="auth-heading">
        <p className="eyebrow">WELCOME BACK</p>
        <h2>Sign in to your workspace</h2>
        <p>Use a fictional account. Never enter a real password here.</p>
      </div>
      {params.get("registered") && (
        <Notice tone="success">
          Account created. Sign in with the username and password you chose.
        </Notice>
      )}
      {params.get("expired") && (
        <Notice>
          That simulated session expired. Sign in again to continue.
        </Notice>
      )}
      {error && (
        <div className="form-error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </div>
      )}
      <form noValidate onSubmit={submit} className="form-stack">
        <div className="field">
          <label htmlFor="login-username">Username</label>
          <input
            id="login-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            aria-invalid={Boolean(error)}
          />
        </div>
        <PasswordField
          id="login-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          error={
            error ? "Check the fictional credentials and try again." : undefined
          }
        />
        <button className="button primary full" disabled={busy} type="submit">
          <ButtonBusy busy={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </ButtonBusy>
        </button>
      </form>
      <div className="auth-links">
        <span>Need an account?</span>
        <Link to="/register">Create one</Link>
      </div>
      <details className="demo-credentials">
        <summary>Demo credentials</summary>
        <p>
          Password for both: <code>DemoOnly123!</code>
        </p>
        <div>
          <button type="button" onClick={() => fill("demo_alex")}>
            Fill Alex
          </button>
          <button type="button" onClick={() => fill("demo_sam")}>
            Fill Sam
          </button>
        </div>
      </details>
    </AuthShell>
  );
}

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      const created = D.register(username, password, confirmation);
      navigate(`/login?registered=${encodeURIComponent(created)}`, {
        replace: true,
      });
    } catch (caught) {
      setError((caught as Error).message);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell
      title="Create account"
      intro="Registration is included because the professor asked for it. The real project will use Django's built-in account system."
    >
      <div className="auth-heading">
        <p className="eyebrow">DEMO REGISTRATION</p>
        <h2>Create a fictional account</h2>
        <p>This account exists only until the page is fully reloaded.</p>
      </div>
      {error && (
        <div className="form-error" role="alert" tabIndex={-1} ref={errorRef}>
          {error}
        </div>
      )}
      <form noValidate onSubmit={submit} className="form-stack">
        <div className="field">
          <label htmlFor="register-username">Username</label>
          <input
            id="register-username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            aria-invalid={Boolean(error)}
            aria-describedby="username-help"
          />
          <small id="username-help">
            3–32 letters, numbers, hyphens or underscores.
          </small>
        </div>
        <PasswordField
          id="register-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <PasswordField
          id="register-confirm"
          label="Confirm password"
          value={confirmation}
          onChange={setConfirmation}
          autoComplete="new-password"
        />
        <p className="password-guidance">
          Use at least 10 characters with upper-case, lower-case and a number.
        </p>
        <button className="button primary full" disabled={busy} type="submit">
          <ButtonBusy busy={busy}>
            {busy ? "Creating account…" : "Create account"}
          </ButtonBusy>
        </button>
      </form>
      <div className="auth-links">
        <span>Already registered?</span>
        <Link to="/login">Sign in</Link>
      </div>
    </AuthShell>
  );
}

function DashboardPage() {
  const datasets = D.ownedDatasets(),
    runs = D.ownedRuns();
  return (
    <>
      <Title
        eyebrow="YOUR WORKSPACE"
        title="Dashboard"
        sub="Import a checked dataset, run the frozen model and return to saved results."
        actions={
          <Link className="button primary" to="/upload">
            <Upload size={17} />
            Upload CSV
          </Link>
        }
      />
      <Notice>
        <strong>Synthetic demonstration.</strong> The browser simulates
        application behavior; it does not contain a real backend or trained
        model.
      </Notice>
      {datasets.length === 0 ? (
        <EmptyState
          title="No datasets yet"
          text="Import a synthetic CSV to create your first dataset."
          action={
            <Link className="button primary" to="/upload">
              Upload CSV
            </Link>
          }
        />
      ) : (
        <div className="dashboard-grid">
          <section className="card span-two">
            <div className="section-heading">
              <div>
                <p className="eyebrow">OWNED DATA</p>
                <h2>Your datasets</h2>
              </div>
              <span className="count-pill">{datasets.length}</span>
            </div>
            <DataTable
              label="Your datasets"
              headers={["Dataset", "Created", "Rows", ""]}
            >
              {datasets.map((dataset) => (
                <tr key={dataset.id}>
                  <th scope="row">
                    <FileSpreadsheet size={17} />
                    {dataset.name}
                    <small>{dataset.schemaVersion}</small>
                  </th>
                  <td>{D.formatDate(dataset.createdAt)}</td>
                  <td>{dataset.rows.length}</td>
                  <td>
                    <Link className="table-link" to={`/datasets/${dataset.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTable>
          </section>
          <section className="card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">SAVED OUTPUT</p>
                <h2>Recent runs</h2>
              </div>
            </div>
            {runs.length ? (
              <ul className="run-list">
                {runs.slice(0, 5).map((run) => (
                  <li key={run.id}>
                    <Link to={`/runs/${run.id}`}>
                      <span>
                        <b>{run.id}</b>
                        <small>{D.formatDate(run.createdAt)}</small>
                      </span>
                      <span>{run.results.length} results</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                No prediction runs yet. Open a dataset to create one.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<string[]>([]);
  const errorRef = useRef<HTMLDivElement>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setDetails([]);
    if (!file) {
      setError("Choose a CSV file before importing.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setBusy(true);
    try {
      const dataset = await D.importCsv(file);
      navigate(`/datasets/${dataset.id}`);
    } catch (caught) {
      const issue = caught as D.DomainError;
      setError(issue.message);
      setDetails(issue.details ?? []);
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Title
        eyebrow="ONE-STEP IMPORT"
        title="Upload a dataset"
        sub="The whole file is checked before anything is added. Valid rows are saved together in one action."
        back={{ to: "/dashboard", label: "Dashboard" }}
      />
      <div className="two-column">
        <section className="card upload-card">
          <form noValidate onSubmit={submit} className="form-stack">
            {error && (
              <div
                className="form-error"
                role="alert"
                tabIndex={-1}
                ref={errorRef}
              >
                <strong>{error}</strong>
                {details.length > 0 && (
                  <ul>
                    {details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <label className={`drop-zone ${file ? "selected" : ""}`}>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setError("");
                  setDetails([]);
                }}
              />
              <Upload size={28} />
              <strong>{file ? file.name : "Choose a CSV file"}</strong>
              <span>
                {file
                  ? `${Math.max(1, Math.round(file.size / 1024))} KB selected`
                  : "One UTF-8 .csv file, up to 1 MiB"}
              </span>
            </label>
            {file && (
              <div className="selected-file">
                <FileSpreadsheet size={18} />
                <span>
                  <b>{file.name}</b>
                  <small>{file.size.toLocaleString()} bytes</small>
                </span>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setFile(null)}
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={17} />
                </button>
              </div>
            )}
            <button
              className="button primary"
              disabled={busy || !file}
              type="submit"
            >
              <ButtonBusy busy={busy}>
                {busy ? "Checking and importing…" : "Import CSV"}
              </ButtonBusy>
            </button>
          </form>
        </section>
        <aside className="card rules-card">
          <p className="eyebrow">ACCEPTED CONTRACT</p>
          <h2>Exactly four columns</h2>
          <code>source_row_id,G1,failures,studytime</code>
          <dl>
            <div>
              <dt>source_row_id</dt>
              <dd>Unique safe ID, 1–64 characters</dd>
            </div>
            <div>
              <dt>G1</dt>
              <dd>Integer from 0 to 20</dd>
            </div>
            <div>
              <dt>failures</dt>
              <dd>Integer from 0 to 4</dd>
            </div>
            <div>
              <dt>studytime</dt>
              <dd>Integer from 1 to 4</dd>
            </div>
          </dl>
          <p>
            No names, email addresses, final-grade target, blanks, extra columns
            or NaN values.
          </p>
        </aside>
      </div>
    </>
  );
}

function DatasetPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  let dataset: D.Dataset;
  try {
    dataset = D.ownedDataset(id);
  } catch {
    return (
      <ErrorPanel
        title="Dataset unavailable"
        text="This dataset does not exist or is not available to this account."
      />
    );
  }
  const stats = D.statistics(dataset),
    start = (page - 1) * PAGE_SIZE,
    visible = dataset.rows.slice(start, start + PAGE_SIZE);
  const predict = async () => {
    setError("");
    setBusy(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const run = D.predict(dataset.id);
      navigate(`/runs/${run.id}`);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Title
        eyebrow="SAVED INPUT"
        title={dataset.name}
        sub={`${dataset.sourceName} · ${D.formatDate(dataset.createdAt)}`}
        back={{ to: "/dashboard", label: "Dashboard" }}
        actions={
          <button
            className="button primary"
            type="button"
            onClick={predict}
            disabled={busy}
          >
            <ButtonBusy busy={busy}>
              {busy ? "Running prediction…" : "Run prediction"}
            </ButtonBusy>
          </button>
        }
      />
      {error && (
        <Notice tone="error" title="Prediction was not saved">
          {error}
        </Notice>
      )}
      <div className="stat-grid">
        {[
          ["Rows", stats.count],
          ["Mean G1", stats.mean.toFixed(1)],
          ["Minimum G1", stats.min],
          ["Maximum G1", stats.max],
        ].map(([label, value]) => (
          <section className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>Observed first-period grade</small>
          </section>
        ))}
      </div>
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">IMMUTABLE INPUTS</p>
            <h2>Imported rows</h2>
          </div>
          <span className="schema-pill">{dataset.schemaVersion}</span>
        </div>
        <DataTable
          label="Imported dataset rows"
          headers={["Row ID", "G1", "Failures", "Study time"]}
        >
          {visible.map((row) => (
            <tr key={row.id}>
              <th scope="row">
                <code>{row.sourceRowId}</code>
              </th>
              <td>{row.g1}</td>
              <td>{row.failures}</td>
              <td>{row.studytime}</td>
            </tr>
          ))}
        </DataTable>
        <Pager page={page} total={dataset.rows.length} onChange={setPage} />
      </section>
      <Notice>
        <strong>Model note:</strong> this prototype runs a deterministic
        demonstration rule synchronously. The final Django app will load one
        frozen saved model and store complete runs atomically.
      </Notice>
    </>
  );
}

function ResultsPage({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  let run: D.Run, dataset: D.Dataset;
  try {
    run = D.ownedRun(id);
    dataset = D.ownedDataset(run.datasetId);
  } catch {
    return (
      <ErrorPanel
        title="Saved run unavailable"
        text="This run does not exist or is not available to this account."
      />
    );
  }
  const start = (page - 1) * PAGE_SIZE,
    visible = run.results.slice(start, start + PAGE_SIZE);
  return (
    <>
      <Title
        eyebrow="SAVED OUTPUT"
        title="Prediction results"
        sub={`Complete run ${run.id} · ${D.formatDate(run.createdAt)}`}
        back={{ to: `/datasets/${dataset.id}`, label: dataset.name }}
      />
      <Notice>
        <strong>Synthetic prediction only.</strong> Scores demonstrate the
        planned contract; they are not measured probabilities or personal
        certainties.
      </Notice>
      <section className="metadata-strip">
        <div>
          <span>Model</span>
          <strong>{run.modelVersion}</strong>
        </div>
        <div>
          <span>Schema</span>
          <strong>{run.schemaVersion}</strong>
        </div>
        <div>
          <span>Threshold</span>
          <strong>{run.threshold.toFixed(1)}</strong>
        </div>
        <div>
          <span>Rows</span>
          <strong>{run.results.length}</strong>
        </div>
      </section>
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">COMPLETE RESULT SET</p>
            <h2>Risk flags</h2>
          </div>
        </div>
        <DataTable
          label="Saved prediction results"
          headers={["Row ID", "Synthetic risk score", "Rule outcome"]}
        >
          {visible.map((result) => (
            <tr key={result.rowId}>
              <th scope="row">
                <code>{result.sourceRowId}</code>
              </th>
              <td>{(result.score * 100).toFixed(1)}%</td>
              <td>
                <span
                  className={`risk ${result.flagged ? "flagged" : "clear"}`}
                >
                  {result.flagged
                    ? "Flagged by demo rule"
                    : "Not flagged by demo rule"}
                </span>
              </td>
            </tr>
          ))}
        </DataTable>
        <Pager page={page} total={run.results.length} onChange={setPage} />
      </section>
      <p className="fine-print">
        A score at or above {run.threshold.toFixed(1)} receives the displayed
        flag. Use this as a prompt to inspect data—not as an automatic decision
        about a student.
      </p>
    </>
  );
}

const percent = (value: number | null) =>
  value === null ? "Not defined" : `${(value * 100).toFixed(1)}%`;
function MetricCells({ counts }: { counts: D.Confusion }) {
  const metrics = D.metrics(counts);
  return (
    <>
      <td>{percent(metrics.precision)}</td>
      <td>{percent(metrics.recall)}</td>
      <td>{percent(metrics.f1)}</td>
    </>
  );
}
function EvaluationPage() {
  const state = D.store.evaluationState;
  if (state === "absent")
    return (
      <>
        <Title
          eyebrow="CONTROLLED EVIDENCE"
          title="Model evaluation"
          sub="Validation comparison and held-out evidence are separate from uploaded datasets."
        />
        <ErrorPanel
          title="Evaluation unavailable"
          text="The checked aggregate evaluation artifact is not available in this demonstration state."
        />
      </>
    );
  if (state === "malformed")
    return (
      <>
        <Title
          eyebrow="CONTROLLED EVIDENCE"
          title="Model evaluation"
          sub="Validation comparison and held-out evidence are separate from uploaded datasets."
        />
        <ErrorPanel
          title="Evaluation could not be verified"
          text="The artifact is malformed, so no cached or stale metrics are displayed."
        />
      </>
    );
  const heldMetrics = D.metrics(D.evaluation.heldOut.counts),
    c = D.evaluation.heldOut.counts;
  return (
    <>
      <Title
        eyebrow="CONTROLLED EVIDENCE"
        title="Model evaluation"
        sub="Compare illustrative validation candidates, then inspect a separate illustrative held-out check."
      />
      <Notice>
        <strong>Illustrative only — not project results.</strong> These
        internally consistent numbers teach the intended evaluation screen.
      </Notice>
      <section className="card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">VALIDATION POPULATION · N=20</p>
            <h2>Candidate comparison</h2>
          </div>
          <span className="schema-pill">
            Threshold {D.evaluation.threshold}
          </span>
        </div>
        <DataTable
          label="Validation model comparison"
          headers={[
            "Candidate",
            "TP / FP / FN / TN",
            "Precision",
            "Recall",
            "F1",
          ]}
        >
          {D.evaluation.validation.map((candidate) => (
            <tr
              key={candidate.model}
              className={candidate.selected ? "selected-row" : ""}
            >
              <th scope="row">
                {candidate.model}
                {candidate.selected && (
                  <small>Selected under the illustrative rule</small>
                )}
              </th>
              <td>
                <code>
                  {candidate.counts.tp} / {candidate.counts.fp} /{" "}
                  {candidate.counts.fn} / {candidate.counts.tn}
                </code>
              </td>
              <MetricCells counts={candidate.counts} />
            </tr>
          ))}
        </DataTable>
        <p className="table-note">
          The baseline precision denominator is zero, so the fixture displays
          the documented convention and does not invent a positive prediction.
        </p>
      </section>
      <div className="evaluation-grid">
        <section className="card held-out">
          <p className="eyebrow">HELD-OUT POPULATION · N=20</p>
          <h2>Frozen example check</h2>
          <p>{D.evaluation.heldOut.model}</p>
          <div className="metric-grid">
            <div>
              <span>Precision</span>
              <strong>{percent(heldMetrics.precision)}</strong>
            </div>
            <div>
              <span>Recall</span>
              <strong>{percent(heldMetrics.recall)}</strong>
            </div>
            <div>
              <span>F1</span>
              <strong>{percent(heldMetrics.f1)}</strong>
            </div>
          </div>
          <dl className="confusion">
            <div>
              <dt>True positive</dt>
              <dd>{c.tp}</dd>
            </div>
            <div>
              <dt>False positive</dt>
              <dd>{c.fp}</dd>
            </div>
            <div>
              <dt>False negative</dt>
              <dd>{c.fn}</dd>
            </div>
            <div>
              <dt>True negative</dt>
              <dd>{c.tn}</dd>
            </div>
          </dl>
        </section>
        <section className="card limitations">
          <p className="eyebrow">READ BEFORE USE</p>
          <h2>Limitations</h2>
          <ul>
            <li>
              Real final evaluation needs disjoint data and a model/threshold
              frozen before test access.
            </li>
            <li>New uploads without known outcomes cannot measure accuracy.</li>
            <li>
              A small source population may not represent another class, school
              or year.
            </li>
            <li>
              A risk score supports review; it does not prove an individual
              outcome or cause.
            </li>
          </ul>
        </section>
      </div>
      <section className="definitions">
        <div>
          <b>Precision</b>
          <span>Among flagged rows, the fraction that are positive.</span>
        </div>
        <div>
          <b>Recall</b>
          <span>Among positive rows, the fraction that are flagged.</span>
        </div>
        <div>
          <b>F1</b>
          <span>The harmonic mean of precision and recall.</span>
        </div>
      </section>
    </>
  );
}

function HelpPage() {
  return (
    <>
      <Title
        eyebrow="QUICK GUIDE"
        title="Help"
        sub="The exact journey, CSV contract and evidence boundaries for the reduced course project."
      />
      <section className="journey">
        <article>
          <span>01</span>
          <div>
            <h2>Register or sign in</h2>
            <p>
              Use one ordinary account type. Each account can open only its own
              datasets and runs.
            </p>
          </div>
        </article>
        <article>
          <span>02</span>
          <div>
            <h2>Import one CSV</h2>
            <p>
              Select a UTF-8 file with the exact four-column schema. Invalid
              files create nothing.
            </p>
            <Link to="/upload">Open Upload</Link>
          </div>
        </article>
        <article>
          <span>03</span>
          <div>
            <h2>Inspect and predict</h2>
            <p>
              Check stored rows and basic G1 statistics, then run the saved
              model synchronously.
            </p>
          </div>
        </article>
        <article>
          <span>04</span>
          <div>
            <h2>Read saved results</h2>
            <p>
              Review row-level scores, flags, model version, schema and
              threshold.
            </p>
          </div>
        </article>
        <article>
          <span>05</span>
          <div>
            <h2>Separate evaluation</h2>
            <p>
              Use controlled validation and held-out evidence—not unlabelled
              uploads—to discuss model quality.
            </p>
            <Link to="/evaluation">Open Evaluation</Link>
          </div>
        </article>
      </section>
      <div className="help-grid">
        <section className="card">
          <p className="eyebrow">CSV CHECKLIST</p>
          <h2>Before importing</h2>
          <ul>
            <li>
              Headers are exactly{" "}
              <code>source_row_id,G1,failures,studytime</code>.
            </li>
            <li>
              There are 1–500 synthetic data rows and the file is no larger than
              1 MiB.
            </li>
            <li>Row IDs are unique and contain no personal information.</li>
            <li>
              Correct reported row/column errors, save the file and select it
              again.
            </li>
          </ul>
        </section>
        <section className="card">
          <p className="eyebrow">THREE DIFFERENT IDEAS</p>
          <h2>Do not mix these meanings</h2>
          <dl>
            <div>
              <dt>Observed statistics</dt>
              <dd>Count, mean, minimum and maximum of imported G1 values.</dd>
            </div>
            <div>
              <dt>Prediction</dt>
              <dd>A saved row-level output from the frozen rule/model.</dd>
            </div>
            <div>
              <dt>Evaluation</dt>
              <dd>
                Aggregate evidence from data with known outcomes under a
                controlled split.
              </dd>
            </div>
          </dl>
        </section>
      </div>
      <Notice title="Prototype boundary">
        This frontend uses fictional data and resets on a full page reload. The
        final Django application must persist users, datasets and complete runs
        in its database and enforce ownership on the server. There are
        intentionally no export, delete, admin, analytics, notes, preview-token
        or retraining controls.
      </Notice>
    </>
  );
}

function DemoPanel({ close }: { close: () => void }) {
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const fixtureButtons: [string, string, string][] = [
    ["Valid five-row CSV", "demo-valid-5.csv", D.fixtures.valid5],
    ["Valid 31-row CSV", "demo-valid-31.csv", D.fixtures.valid31],
    ["Invalid ranges", "demo-invalid-range.csv", D.fixtures.invalidRange],
    ["Duplicate row ID", "demo-duplicate-id.csv", D.fixtures.duplicateId],
    [
      "Unsupported column",
      "demo-unsupported-column.csv",
      D.fixtures.unsupportedColumn,
    ],
    ["501 rows", "demo-over-500.csv", D.fixtures.tooManyRows],
  ];
  return (
    <Dialog variant="drawer" title="Developer test panel" close={close}>
      <p className="muted">
        This panel drives synthetic states through the same service paths. It is
        not a product feature.
      </p>
      <div className="panel-section">
        <label htmlFor="scenario">Next prediction/service scenario</label>
        <select
          id="scenario"
          value={D.store.scenario}
          onChange={(event) => D.setScenario(event.target.value as D.Scenario)}
        >
          <option value="success">Success</option>
          <option value="session-expired">
            Session expires on next protected route
          </option>
          <option value="missing-model">Missing saved model</option>
          <option value="schema-mismatch">Model/schema mismatch</option>
          <option value="invalid-score">Invalid model score</option>
          <option value="save-failure">Atomic save failure</option>
        </select>
      </div>
      <div className="panel-section">
        <label htmlFor="evaluation-state">Evaluation artifact</label>
        <select
          id="evaluation-state"
          value={D.store.evaluationState}
          onChange={(event) =>
            D.setEvaluationState(event.target.value as D.EvaluationState)
          }
        >
          <option value="available">Available</option>
          <option value="absent">Absent</option>
          <option value="malformed">Malformed</option>
        </select>
      </div>
      <div className="panel-section">
        <strong>CSV fixtures</strong>
        <div className="fixture-list">
          {fixtureButtons.map(([label, name, content]) => (
            <button
              type="button"
              key={name}
              onClick={() =>
                D.download(name, content, "text/csv;charset=utf-8")
              }
            >
              {label}
              <small>{name}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="panel-section">
        <strong>Route checks</strong>
        <div className="button-row">
          <button
            type="button"
            onClick={() => {
              close();
              navigate("/datasets/dataset-sam");
            }}
          >
            Visit foreign dataset
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              navigate("/runs/missing-run");
            }}
          >
            Visit missing run
          </button>
        </div>
      </div>
      <div className="panel-section danger-zone">
        <strong>Reset synthetic demonstration</strong>
        <p>
          Resets accounts, datasets, runs, scenarios and evaluation state. The
          current account is signed out.
        </p>
        {confirmReset ? (
          <div className="reset-confirm" role="alert">
            <p>Reset everything in this browser session?</p>
            <button type="button" onClick={() => setConfirmReset(false)}>
              Keep demo
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => {
                D.reset();
                close();
                navigate("/login");
              }}
            >
              Reset demo
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="danger outline"
            onClick={() => setConfirmReset(true)}
          >
            Reset demo…
          </button>
        )}
      </div>
    </Dialog>
  );
}

createRoot(document.getElementById("root")!).render(
  <RouterProvider
    router={createBrowserRouter([{ path: "*", element: <App /> }])}
  />,
);
