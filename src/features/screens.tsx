import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useBlocker } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  Search,
  Upload,
  Download,
  X,
  Check,
  ChartNoAxesCombined,
  FlaskConical,
  FileSpreadsheet,
  ShieldCheck,
  CheckCheck,
  Ellipsis,
  Layers,
  Trash2,
} from "lucide-react";
import * as D from "../domain";
import { notify } from "../notifications";
import type { Context } from "../types";
import { Title, Steps, ErrorPanel, Table, Schema } from "../components";
export function Workspace(ctx: Context) {
  const { user, full } = ctx;
  const { pathname } = useLocation();
  const nav = useNavigate();
  useEffect(() => {
    if (pathname === "/")
      nav(
        user.role === "teacher"
          ? "/datasets"
          : user.role === "administrator" && full
            ? "/admin/accounts"
            : "/evaluations/demo-eval-v1",
        { replace: true },
      );
  }, [pathname, user.role, full]);
  try {
    if (pathname === "/") return null;
    if (pathname.startsWith("/evaluations/")) return <Evaluation full={full} />;
    if (pathname === "/help") return <Help {...ctx} />;
    if (pathname === "/settings" && full) return <Preferences {...ctx} />;
    if (pathname === "/admin/accounts" && full) {
      if (user.role !== "administrator")
        throw Error("Forbidden. Account management is administrator-only.");
      return <Accounts {...ctx} />;
    }
    if (user.role !== "teacher")
      throw Error(
        "Forbidden. Your role has access to aggregate evaluation, not student records.",
      );
    if (pathname === "/datasets") return <Datasets {...ctx} />;
    if (pathname === "/datasets/new") return <UploadPage />;
    if (pathname.startsWith("/imports/"))
      return <PreviewPage {...ctx} id={pathname.split("/")[2]} />;
    if (pathname.startsWith("/prediction-runs/"))
      return <RunPage {...ctx} id={pathname.split("/")[2]} />;
    if (pathname.startsWith("/datasets/")) {
      const parts = pathname.split("/");
      const d = D.owned(parts[2]);
      if (parts[3] === "records" && full)
        return <RecordPage {...ctx} d={d} record={parts[4]} />;
      if (parts[3] === "quality" && full) return <Quality d={d} />;
      if (parts.length === 3) return <DatasetPage {...ctx} d={d} />;
    }
    if (pathname === "/analytics" && full) return <Analytics {...ctx} />;
    if (pathname === "/activity" && full) return <Activity {...ctx} />;
    return (
      <ErrorPanel
        title="Page not found"
        text="This route is unavailable in the current prototype mode."
      />
    );
  } catch (e) {
    return (
      <ErrorPanel
        title={
          (e as Error).message.startsWith("Forbidden")
            ? "Access restricted"
            : "Page unavailable"
        }
        text={(e as Error).message}
      />
    );
  }
}
function Datasets(ctx: Context) {
  const { user, full, modal, act } = ctx;
  const ds = D.db.datasets.filter((d) => d.owner === user.id);
  const completed = D.db.runs.filter(
    (r) => r.status === "completed" && ds.some((d) => d.id === r.dataset),
  );
  const records = ds.reduce((n, d) => n + d.rows.length, 0);
  return (
    <>
      <Title
        title="My datasets"
        sub="Your data, a clearer perspective. Start where your students are."
        action={
          <Link className="button primary" to="/datasets/new">
            <Plus size={17} /> Upload dataset
          </Link>
        }
      />
      <div className="overview-grid">
        <section className="card collection">
          <div className="card-top">
            <span>Your teaching collection</span>
            <span className="round-icon">
              <Layers size={18} />
            </span>
          </div>
          <div className="collection-count">
            {records}
            <span>synthetic records</span>
          </div>
          <div className="collection-bottom">
            <span>
              <strong>{ds.length}</strong> owned datasets
            </span>
            <span className="pill pale">
              <ShieldCheck size={13} /> Private to you
            </span>
          </div>
          <div className="mini-bars" aria-hidden="true">
            {[
              35, 52, 42, 72, 58, 85, 68, 93, 80, 100, 85, 112, 95, 125, 110,
              135, 115, 150,
            ].map((h, i) => (
              <i key={i} style={{ height: h }} />
            ))}
          </div>
        </section>
        <section className="card workflow-card">
          <div className="card-top">
            <h2>From data to a next step</h2>
            <span className="round-icon">
              <ArrowUpRight size={19} />
            </span>
          </div>
          <p>A simple workflow. A considered review.</p>
          <Steps active={0} />
          <div className="workflow-caption">
            <span className="round-icon white">
              <FileSpreadsheet size={23} />
            </span>
            <div>
              <strong>Bring your dataset together</strong>
              <p>
                Upload a CSV, check every row, then explore
                <br className="desktop" /> a saved, simulated prediction.
              </p>
            </div>
            <Link
              to="/datasets/new"
              className="icon"
              title="Upload dataset"
              aria-label="Upload dataset"
            >
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>
        <section className="card activity-card">
          <div className="card-top">
            <h2>Ready for review</h2>
            <span className="round-icon">
              <CheckCheck size={19} />
            </span>
          </div>
          <div className="review-count">
            {completed.length}
            <span>completed prediction runs</span>
          </div>
          <p>Saved results, ready when you are.</p>
          <Link
            to={
              completed[0]
                ? "/prediction-runs/" + completed[0].id
                : "/datasets/new"
            }
            className="text-link"
          >
            {completed[0] ? "Open latest results" : "Upload your first dataset"}{" "}
            <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
      <section className="card dataset-table">
        <div className="section-heading">
          <div>
            <h2>
              Your datasets <span className="count-tag">{ds.length}</span>
            </h2>
            <p>Only datasets owned by {user.name.split(" ")[0]} are shown.</p>
          </div>
          <span className="pill">
            <span className="live-dot" /> Browser-local storage
          </span>
        </div>
        {!ds.length ? (
          <div className="empty">
            <FileSpreadsheet size={34} />
            <h2>Upload your first dataset</h2>
            <p>Your teaching collection begins with a CSV.</p>
            <Link className="button primary" to="/datasets/new">
              Upload dataset
            </Link>
            <button
              onClick={() =>
                D.download("demo-valid-12.csv", D.fixture("valid"))
              }
            >
              Download sample
            </button>
          </div>
        ) : (
          <Table
            name="datasets"
            data={ds.map((d) => {
              const run = D.db.runs.find((r) => r.dataset === d.id);
              return {
                id: d.id,
                name: d.name,
                schema: "demo-input-v1",
                count: d.rows.length,
                date: new Date(d.created).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
                status: run?.status || "Not run",
                run,
                d,
              };
            })}
            columns={[
              {
                key: "name",
                label: "Dataset name",
                render: (r) => (
                  <Link className="dataset-name" to={"/datasets/" + r.id}>
                    <span className="file-icon">
                      <FileSpreadsheet size={19} />
                    </span>
                    <span>
                      <strong>{String(r.name)}</strong>
                      <small>{(r.d as D.Dataset).file}</small>
                    </span>
                  </Link>
                ),
              },
              {
                key: "schema",
                label: "Schema",
                render: (r) => <code>{String(r.schema)}</code>,
              },
              { key: "count", label: "Records" },
              { key: "date", label: "Imported" },
              {
                key: "status",
                label: "Latest prediction",
                render: (r) => (
                  <span className={"status " + r.status}>
                    <i />
                    {String(r.status)}
                  </span>
                ),
              },
              {
                key: "actions",
                label: "Actions",
                render: (r) => (
                  <div className="row-actions">
                    <Link className="text-link" to={"/datasets/" + r.id}>
                      Open <ArrowUpRight size={14} />
                    </Link>
                    <details className="row-menu">
                      <summary aria-label={"Actions for " + r.name}>
                        <Ellipsis size={18} />
                      </summary>
                      <div>
                        {!!r.run && (
                          <Link to={"/prediction-runs/" + (r.run as D.Run).id}>
                            Latest prediction
                          </Link>
                        )}
                        {full && (
                          <button onClick={() => rename(r.d as D.Dataset, ctx)}>
                            Rename dataset
                          </button>
                        )}
                        <button
                          className="danger-text"
                          onClick={() =>
                            modal({
                              title: "Delete " + r.name + "?",
                              body: (
                                <p>
                                  This removes {String(r.count)} records,{" "}
                                  {
                                    D.db.runs.filter((x) => x.dataset === r.id)
                                      .length
                                  }{" "}
                                  runs and their reviews. This cannot be undone.
                                </p>
                              ),
                              danger: true,
                              label: "Delete dataset",
                              action: () =>
                                act(async () => {
                                  await D.deleteDataset(String(r.id));
                                  modal(null);
                                  notify("Dataset deleted.");
                                }),
                            })
                          }
                        >
                          Delete dataset
                        </button>
                      </div>
                    </details>
                  </div>
                ),
              },
            ]}
          />
        )}
      </section>
      {full && (
        <div className="bottom-note">
          <ShieldCheck size={17} />
          <p>
            Your uploads stay in this browser. Academic risk is a starting point
            for human review, never an automatic decision.
          </p>
          <Link to="/help">
            How it works <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
    </>
  );
}
function rename(d: D.Dataset, { modal, act }: Context) {
  let value = d.name;
  modal({
    title: "Rename dataset",
    body: (
      <label>
        Dataset name
        <input
          defaultValue={value}
          onChange={(e) => (value = e.target.value)}
        />
      </label>
    ),
    action: () =>
      act(async () => {
        if (!value.trim()) throw Error("Enter a dataset name.");
        D.owned(d.id);
        await D.delay("rename");
        d.name = value.trim();
        D.event("Renamed dataset");
        await D.persist();
        modal(null);
        notify("Dataset renamed.");
      }),
  });
}
function UploadPage() {
  const [file, setFile] = useState<File | null>(() => {
      const sample = new URLSearchParams(location.search).get("fixture");
      return sample
        ? new File([D.fixture(sample)], "demo-" + sample + ".csv", {
            type: "text/csv",
          })
        : null;
    }),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    nav = useNavigate();
  return (
    <>
      <Title
        title="Upload dataset"
        sub="Start with a small, well-understood dataset."
      />
      <Steps active={0} />
      <div className="two-columns">
        <section className="card upload-card">
          <h2>Choose your CSV</h2>
          <p>Files stay in this browser. Maximum 1 MB · 500 records.</p>
          <div
            className="drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              setFile(e.dataTransfer.files[0]);
              setError("");
            }}
          >
            <span className="upload-symbol">
              <Upload size={30} strokeWidth={1.5} />
            </span>
            <h3>{file ? file.name : "Drop a dataset here"}</h3>
            <p>
              {file
                ? `${(file.size / 1024).toFixed(1)} KB · ready to validate`
                : "Comma or semicolon-separated CSV files"}
            </p>
            <input
              ref={input}
              type="file"
              accept=".csv"
              className="sr-only"
              aria-label="Select CSV file"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setError("");
              }}
            />
            <button onClick={() => input.current?.click()}>
              {file ? "Replace file" : "Browse files"}
            </button>
            {file && <button onClick={() => setFile(null)}>Remove</button>}
          </div>
          <button
            className="text-link"
            onClick={() => {
              setFile(
                new File([D.fixture("valid")], "demo-valid-12.csv", {
                  type: "text/csv",
                }),
              );
              setError("");
            }}
          >
            Or use the bundled 12-record demo fixture <ArrowUpRight size={15} />
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <Link className="button" to="/datasets">
              Cancel
            </Link>
            <button
              className="primary"
              disabled={!file || busy}
              onClick={async () => {
                if (!file) return;
                setBusy(true);
                setError("");
                try {
                  const p = await D.preview(file);
                  nav("/imports/" + p.id);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Validating file…" : "Validate file"}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
        <section className="card lavender">
          <h2>A shared format, fewer surprises.</h2>
          <p>
            Schema <code>demo-input-v1</code>. Include exactly these five
            columns in any order.
          </p>
          <Schema />
          <div className="button-row">
            <button
              onClick={() =>
                D.download("demo-valid-12.csv", D.fixture("valid"))
              }
            >
              <Download size={15} /> Valid sample
            </button>
            <Link className="button" to="/help">
              All sample files
            </Link>
          </div>
          <p className="fine">
            Entire-file validation. A file with errors cannot be imported. Use
            pseudonymous IDs and synthetic data only.
          </p>
        </section>
      </div>
    </>
  );
}
function PreviewPage({ id, user, act }: Context & { id: string }) {
  const p = D.db.previews.find((p) => p.id === id);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const nav = useNavigate();
  if (!p || p.owner !== user.id)
    return (
      <ErrorPanel
        text="Preview unavailable or forbidden. Start a fresh upload."
        action={
          <Link className="button" to="/datasets/new">
            Re-upload
          </Link>
        }
      />
    );
  const consumed = !!p.dataset,
    expired = p.expires < Date.now();
  return (
    <>
      <Title title="Import preview" sub={p.file} />
      <Steps active={1} />
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>
              {consumed
                ? "Already confirmed"
                : expired
                  ? "Preview expired"
                  : p.issues.length
                    ? "A few things need attention"
                    : "Your dataset is ready"}
            </h2>
            <p>
              {p.rows.length} parsed rows ·{" "}
              {
                new Set(p.issues.filter((i) => i.row > 1).map((i) => i.row))
                  .size
              }{" "}
              invalid rows · demo-input-v1
            </p>
          </div>
          <span
            className={"status " + (p.issues.length ? "failed" : "completed")}
          >
            {p.issues.length
              ? `${p.issues.length} validation issues`
              : "Schema validated"}
          </span>
        </div>
        <p className="notice">
          {consumed
            ? "This preview has been consumed and cannot create another import."
            : expired
              ? "The 30-minute preview window has ended. Upload the file again."
              : "Preview expires " +
                new Date(p.expires).toLocaleTimeString() +
                ". Confirming creates one dataset with these exact rows."}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Table
          name={p.issues.length ? "validation issues" : "records"}
          data={
            p.issues.length
              ? p.issues.map((i) => ({ ...i }))
              : p.rows.map((r) => ({ ...r }))
          }
          columns={
            p.issues.length
              ? ["row", "column", "value", "hint"].map((key) => ({
                  key,
                  label: key === "hint" ? "How to correct" : key,
                }))
              : D.headers.map((key) => ({ key, label: key }))
          }
        />
        <div className="form-actions">
          <Link className="button" to="/datasets/new">
            Replace file
          </Link>
          {p.issues.length > 0 && (
            <button
              onClick={() =>
                act(() =>
                  D.download(
                    "validation-errors.csv",
                    D.csv(p.issues.map((i) => ({ ...i }))),
                  ),
                )
              }
            >
              <Download size={15} /> Download errors
            </button>
          )}
          {consumed ? (
            D.db.datasets.some((d) => d.id === p.dataset) ? (
              <Link className="button primary" to={"/datasets/" + p.dataset}>
                Open imported dataset
              </Link>
            ) : (
              <span>Imported dataset was deleted. Start a fresh upload.</span>
            )
          ) : (
            <button
              className="primary"
              disabled={busy || expired || p.issues.length > 0}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  nav("/datasets/" + (await D.confirmImport(id)));
                  notify("Dataset imported.");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Confirming…" : "Confirm import"} <Check size={16} />
            </button>
          )}
          {error && (
            <button
              onClick={() => {
                if (p.dataset) nav("/datasets/" + p.dataset);
                else
                  setError("No import committed. You can retry confirmation.");
              }}
            >
              Check import status
            </button>
          )}
        </div>
      </section>
    </>
  );
}
function DatasetPage(ctx: Context & { d: D.Dataset }) {
  const { d, full, act, modal } = ctx;
  const [tab, setTab] = useState("records"),
    [busy, setBusy] = useState(false);
  const nav = useNavigate(),
    runs = D.db.runs.filter((r) => r.dataset === d.id);
  return (
    <>
      <Title
        title={d.name}
        sub="A focused view of your dataset and its saved predictions."
        action={
          <>
            <Link className="button" to="/datasets">
              <ArrowLeft size={15} /> All datasets
            </Link>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                act(async () => {
                  setBusy(true);
                  try {
                    const r = await D.startRun(d.id);
                    nav("/prediction-runs/" + r.id);
                  } finally {
                    setBusy(false);
                  }
                })
              }
            >
              <ChartNoAxesCombined size={17} />
              {runs.some((r) => r.status === "running")
                ? "View running prediction"
                : busy
                  ? "Starting…"
                  : "Run prediction"}
            </button>
          </>
        }
      />
      <Steps active={2} />
      <section className="card metadata">
        <div>
          <small>Source file</small>
          <strong>{d.file}</strong>
        </div>
        <div>
          <small>Records</small>
          <strong>{d.rows.length}</strong>
        </div>
        <div>
          <small>Schema</small>
          <strong>demo-input-v1</strong>
        </div>
        <div>
          <small>Imported</small>
          <strong>{new Date(d.created).toLocaleDateString()}</strong>
        </div>
        {full && (
          <div className="button-row">
            <Link className="button" to={"/datasets/" + d.id + "/quality"}>
              Data quality
            </Link>
            <button onClick={() => rename(d, ctx)}>Rename</button>
          </div>
        )}
      </section>
      <section className="card">
        <div className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "records"}
            className={tab === "records" ? "active" : ""}
            onClick={() => setTab("records")}
          >
            Records <span>{d.rows.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "runs"}
            className={tab === "runs" ? "active" : ""}
            onClick={() => setTab("runs")}
          >
            Prediction runs <span>{runs.length}</span>
          </button>
        </div>
        {tab === "records" ? (
          <Table
            name="records"
            exportable={full}
            data={d.rows.map((r) => ({ ...r }))}
            columns={[
              ...D.headers.map((key) => ({ key, label: key })),
              ...(full
                ? [
                    {
                      key: "action",
                      label: "Review",
                      render: (r: Record<string, unknown>) => (
                        <Link
                          className="text-link"
                          to={`/datasets/${d.id}/records/${encodeURIComponent(String(r.record_id))}`}
                        >
                          Open record <ArrowUpRight size={14} />
                        </Link>
                      ),
                    },
                  ]
                : []),
            ]}
          />
        ) : (
          <Table
            name="runs"
            data={runs.map((r) => ({ ...r, date: D.formatDate(r.started) }))}
            columns={[
              { key: "date", label: "Started" },
              {
                key: "status",
                label: "Status",
                render: (r) => (
                  <span className={"status " + r.status}>
                    {String(r.status)}
                  </span>
                ),
              },
              {
                key: "model",
                label: "Simulator",
                render: () => <code>demo-rule-v1</code>,
              },
              {
                key: "action",
                label: "Actions",
                render: (r) => (
                  <Link className="text-link" to={"/prediction-runs/" + r.id}>
                    Open run <ArrowUpRight size={14} />
                  </Link>
                ),
              },
            ]}
          />
        )}
      </section>
      <div className="bottom-note">
        <span>Deletion removes records, results and reviews.</span>
        <button
          className="danger-text"
          onClick={() =>
            modal({
              title: "Delete " + d.name + "?",
              body: (
                <p>
                  Delete {d.rows.length} records, {runs.length} runs and all
                  related reviews permanently?
                </p>
              ),
              danger: true,
              label: "Delete dataset",
              action: () =>
                act(async () => {
                  await D.deleteDataset(d.id);
                  modal(null);
                  nav("/datasets");
                  notify("Dataset deleted.");
                }),
            })
          }
        >
          <Trash2 size={14} /> Delete dataset
        </button>
      </div>
    </>
  );
}
function RunPage({ id, full, act }: Context & { id: string }) {
  const run = D.db.runs.find((r) => r.id === id);
  const [filter, setFilter] = useState("all");
  const [interrupted, setInterrupted] = useState(
    sessionStorage.getItem("interrupted-run") === id,
  );
  if (!run)
    return (
      <ErrorPanel text="Prediction run not found. It may have been deleted." />
    );
  const d = D.owned(run.dataset),
    above = run.results.filter((r) => r.risk >= 0.5).length;
  const data = run.results
    .filter(
      (r) =>
        filter === "all" || (filter === "above" ? r.risk >= 0.5 : r.risk < 0.5),
    )
    .map((r) => ({
      ...d.rows.find((row) => row.record_id === r.id),
      id: r.id,
      risk: r.risk,
      label: r.risk >= 0.5 ? "Above demo threshold" : "Below demo threshold",
    }));
  return (
    <>
      <Title
        title="Prediction results"
        sub={d.name}
        action={
          <Link className="button" to={"/datasets/" + d.id}>
            <ArrowLeft size={15} /> Dataset
          </Link>
        }
      />
      <Steps active={run.status === "completed" ? 3 : 2} />
      {interrupted && (
        <div className="notice">
          <span>
            Connection interrupted. The run may still be processing. Its saved
            ID has been preserved.
          </span>
          <button
            onClick={() =>
              act(async () => {
                await D.resolveRuns();
                sessionStorage.removeItem("interrupted-run");
                setInterrupted(false);
                notify("Status reconciled with the existing run.");
              })
            }
          >
            Check run status
          </button>
        </div>
      )}
      <div className="notice">
        <FlaskConical size={18} />
        <span>
          Simulated prediction · demo-rule-v1 · threshold 0.50. An invented rule
          for demonstrating the interface, not a validated educational model.
        </span>
      </div>
      <section className="card">
        <div className="section-heading">
          <h2>
            {run.status === "completed"
              ? "A perspective for your review"
              : run.status === "failed"
                ? "Prediction could not complete"
                : "Simulating your prediction"}
          </h2>
          <span className={"status " + run.status}>{run.status}</span>
        </div>
        <div className="metadata">
          <div>
            <small>Started</small>
            <strong>{D.formatDate(run.started)}</strong>
          </div>
          <div>
            <small>Model</small>
            <code>demo-rule-v1</code>
          </div>
          <div>
            <small>Schema</small>
            <code>demo-input-v1</code>
          </div>
          <div>
            <small>Saved threshold</small>
            <code>demo-threshold-v1 · 0.50</code>
          </div>
        </div>
        {run.status === "running" ? (
          <div className="empty">
            <div className="spinner" />
            <h3>Preparing → Simulating → Validating → Saving</h3>
            <p>This run is saved. You can return to it after refresh.</p>
            <button onClick={() => act(() => D.resolveRuns())}>
              Check run status
            </button>
          </div>
        ) : run.status === "failed" ? (
          <div className="error-panel">
            <h3>{run.failure}</h3>
            <p>
              No results were published. A failed response never commits a
              partial result set.
            </p>
            <Link className="button" to={"/datasets/" + d.id}>
              Return to dataset to start a new run
            </Link>
          </div>
        ) : (
          <>
            <div className="run-summary">
              <div>
                <strong>{run.results.length}</strong>
                <span>saved results</span>
              </div>
              <div>
                <strong>{above}</strong>
                <span>above demo threshold</span>
              </div>
              <div>
                <strong>{run.results.length - above}</strong>
                <span>below demo threshold</span>
              </div>
              {full && (
                <div
                  className="distribution"
                  role="img"
                  aria-label={`${above} above and ${run.results.length - above} below threshold`}
                >
                  <span
                    style={{ width: (above / run.results.length) * 100 + "%" }}
                  />
                </div>
              )}
            </div>
            {full && (
              <div className="filter-pills" aria-label="Risk filter">
                {["all", "above", "below"].map((s) => (
                  <button
                    className={filter === s ? "active" : ""}
                    key={s}
                    onClick={() => setFilter(s)}
                  >
                    {s === "all"
                      ? "All results"
                      : s === "above"
                        ? "Above threshold"
                        : "Below threshold"}
                  </button>
                ))}
              </div>
            )}
            <Table
              name="results"
              exportable={full}
              data={data}
              columns={[
                { key: "id", label: "Record ID" },
                ...["G1", "failures", "studytime", "schoolsup"].map((key) => ({
                  key,
                  label: key,
                })),
                {
                  key: "risk",
                  label: "Simulated risk",
                  render: (r) => (
                    <span className="risk-value">
                      {(Number(r.risk) * 100).toFixed(1)}%
                    </span>
                  ),
                },
                {
                  key: "label",
                  label: "Threshold label",
                  render: (r) => (
                    <span
                      className={
                        "pill " + (Number(r.risk) >= 0.5 ? "warm" : "mint")
                      }
                    >
                      {String(r.label)}
                    </span>
                  ),
                },
                ...(full
                  ? [
                      {
                        key: "action",
                        label: "Review",
                        render: (r: Record<string, unknown>) => (
                          <Link
                            className="text-link"
                            to={`/datasets/${d.id}/records/${encodeURIComponent(String(r.id))}`}
                          >
                            Open record
                          </Link>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </>
        )}
      </section>
    </>
  );
}
function Evaluation({ full }: { full: boolean }) {
  const location = useLocation(),
    nav = useNavigate();
  const [, retry] = useState(0);
  const version = location.pathname.split("/")[2];
  if (D.scenario === "evaluation unavailable")
    return (
      <ErrorPanel
        title="Evaluation artifact unavailable"
        text="The simulated evaluation service is unavailable. No uploaded records are affected."
        action={
          <button
            onClick={() => {
              D.config("normal", D.latency);
              retry((n) => n + 1);
            }}
          >
            Retry evaluation
          </button>
        }
      />
    );
  const undefinedMetric = version === "one-class";
  if (!["demo-eval-v1", "one-class"].includes(version))
    return (
      <ErrorPanel
        title="Evaluation not found"
        text="Choose the available synthetic fixture."
        action={
          <Link className="button" to="/evaluations/demo-eval-v1">
            Open evaluation
          </Link>
        }
      />
    );
  const matrix = undefinedMetric ? [0, 0, 0, 100] : [32, 8, 12, 48];
  const [tp, fn, fp, tn] = matrix;
  const values = [
    ["Accuracy", (tp + tn) / 100],
    ["Precision", tp + fp ? tp / (tp + fp) : null],
    ["Recall", tp + fn ? tp / (tp + fn) : null],
    ["F1", 2 * tp + fp + fn ? (2 * tp) / (2 * tp + fp + fn) : null],
    ["Specificity", tn / (tn + fp)],
  ] as [string, number | null][];
  return (
    <>
      <Title
        title="Model evaluation"
        sub="Understand the evidence. Know its limits."
        action={
          <>
            {full && (
              <button
                onClick={() => {
                  try {
                    D.download(
                      "synthetic-evaluation.json",
                      JSON.stringify(
                        {
                          synthetic: true,
                          version,
                          matrix: { tp, fn, fp, tn },
                          metrics: values,
                        },
                        null,
                        2,
                      ),
                      "application/json",
                    );
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                <Download size={16} /> Download report
              </button>
            )}
            <button onClick={() => window.print()}>Print / Save as PDF</button>
          </>
        }
      />
      <div className="notice">
        <FlaskConical size={18} />
        <span>
          Illustrative synthetic evaluation. This fixture is separate from the
          demo-rule-v1 prediction simulator and does not establish project
          accuracy.
        </span>
      </div>
      <div className="evaluation-top">
        <label>
          Evaluation fixture
          <select
            value={version}
            onChange={(e) => nav("/evaluations/" + e.target.value)}
          >
            <option value="demo-eval-v1">
              demo-eval-v1 · Binary test example
            </option>
            <option value="one-class">
              one-class · Undefined metric example
            </option>
          </select>
        </label>
        <span className="pill mint">
          Test population · 100 synthetic records
        </span>
        <span className="pill">Positive outcome: demo academic-risk flag</span>
      </div>
      <div className="metric-grid">
        {values.map(([name, value]) => (
          <section className="card metric" key={name}>
            <span>{name}</span>
            <strong>
              {value === null ? "Not defined" : (value * 100).toFixed(1) + "%"}
            </strong>
            <details>
              <summary>How it’s calculated</summary>
              <p>
                {name === "Accuracy"
                  ? "(TP + TN) / N"
                  : name === "Precision"
                    ? "TP / (TP + FP)"
                    : name === "Recall"
                      ? "TP / (TP + FN)"
                      : name === "F1"
                        ? "2TP / (2TP + FP + FN)"
                        : "TN / (TN + FP)"}
                {value === null
                  ? " · Denominator is zero; no positive examples or predictions."
                  : ""}
              </p>
            </details>
          </section>
        ))}
      </div>
      <div className="two-columns">
        <section className="card">
          <h2>Confusion matrix</h2>
          <p>Threshold 0.50 · all numbers from the same fixture.</p>
          <table className="matrix">
            <thead>
              <tr>
                <th>Actual / Predicted</th>
                <th>Positive</th>
                <th>Negative</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Positive</th>
                <td className="mint">
                  {tp}
                  <small>True positive</small>
                </td>
                <td>
                  {fn}
                  <small>False negative</small>
                </td>
              </tr>
              <tr>
                <th>Negative</th>
                <td>
                  {fp}
                  <small>False positive</small>
                </td>
                <td className="lavender">
                  {tn}
                  <small>True negative</small>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <section className="card">
          <h2>Illustrative model comparison</h2>
          <p>
            Validation-based selection, followed by a separate test
            illustration.
          </p>
          <table>
            <thead>
              <tr>
                <th>Fixture model</th>
                <th>Validation accuracy</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Dummy baseline</td>
                <td>60%</td>
              </tr>
              <tr>
                <td>Logistic regression</td>
                <td>76%</td>
              </tr>
              <tr>
                <td>
                  Random forest <span className="pill mint">Selected</span>
                </td>
                <td>81%</td>
              </tr>
            </tbody>
          </table>
          <p className="fine">
            Synthetic comparison values. These are not measured results. No
            ROC-AUC is inferred from the confusion matrix.
          </p>
          <details open>
            <summary>Interpretation & limitations</summary>
            <p>
              Small illustrative populations cannot establish generalization or
              fairness. No causal explanations or automated interventions are
              supported. Always verify source data and apply human judgement.
            </p>
          </details>
        </section>
      </div>
    </>
  );
}
function useUnsaved(dirty: boolean, modal: Context["modal"]) {
  const blocker = useBlocker(dirty);
  useEffect(() => {
    if (blocker.state === "blocked") {
      modal({
        title: "Leave unsaved changes?",
        body: (
          <p>
            Your current changes have not been saved. Stay here to finish, or
            leave this page.
          </p>
        ),
        label: "Leave page",
        cancel: () => {
          if (blocker.state === "blocked") blocker.reset();
        },
        action: () => {
          modal(null);
          if (blocker.state === "blocked") blocker.proceed();
        },
      });
    }
  }, [blocker.state, blocker.location?.key]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
}
function RecordPage({
  d,
  record,
  user,
  modal,
  act,
}: Context & { d: D.Dataset; record: string }) {
  const row = d.rows.find((r) => r.record_id === decodeURIComponent(record));
  const reviews = D.db.reviews.filter(
    (r) => r.dataset === d.id && r.record === row?.record_id,
  );
  const [note, setNote] = useState(""),
    [status, setStatus] = useState("Needs review"),
    [association, setAssociation] = useState(""),
    [edit, setEdit] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useUnsaved(!!note, modal);
  if (!row) return <ErrorPanel text="Record not found in this dataset." />;
  const history = D.db.runs
    .filter((r) => r.dataset === d.id && r.status === "completed")
    .map((r) => ({
      id: r.id,
      date: D.formatDate(r.started),
      risk: r.results.find((x) => x.id === row.record_id)!.risk,
    }));
  return (
    <>
      <Title
        title={row.record_id}
        sub={d.name + " · record review"}
        action={
          <Link className="button" to={"/datasets/" + d.id}>
            Back to dataset
          </Link>
        }
      />
      <section className="card metadata">
        {D.headers.map((k) => (
          <div key={k}>
            <small>{k}</small>
            <strong>{String(row[k as keyof D.Row])}</strong>
          </div>
        ))}
      </section>
      <div className="two-columns">
        <section className="card">
          <h2>Teacher review</h2>
          <p>
            Verify the data before considering support. Notes stay private to
            this teacher and dataset.
          </p>
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              if (note.trim().length < 5 || note.length > 1000) {
                setError(
                  "Write a meaningful note, between 5 and 1,000 characters.",
                );
                return;
              }
              setBusy(true);
              try {
                const item = {
                  id: edit || D.uid(),
                  dataset: d.id,
                  record: row.record_id,
                  owner: user.id,
                  note: note.trim(),
                  status,
                  run: association || undefined,
                  date: new Date().toISOString(),
                };
                await D.saveReview(item);
                setNote("");
                setEdit("");
                setError("");
                notify("Review saved.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Review status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {["Not reviewed", "Needs review", "Reviewed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Associated prediction (optional)
              <select
                value={association}
                onChange={(e) => setAssociation(e.target.value)}
              >
                <option value="">No run association</option>
                {D.db.runs
                  .filter((r) => r.dataset === d.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {D.formatDate(r.started)} � {r.status}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Private note
              <textarea
                className="resize-none"
                style={{ resize: "none" }}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                placeholder="What would you like to verify or discuss?"
              />
            </label>
            <small>{note.length}/1,000 characters</small>
            {error && <p className="error">{error}</p>}
            <div className="button-row">
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : edit ? "Save changes" : "Save review"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNote("");
                  setEdit("");
                  setError("");
                }}
              >
                Cancel changes
              </button>
            </div>
          </form>
          {reviews.map((r) => (
            <article className="review-note" key={r.id}>
              <span className="pill">{r.status}</span>
              <p>{r.note}</p>
              <small>
                {user.name} · {D.formatDate(r.date)}
              </small>
              <div className="button-row">
                <button
                  onClick={() => {
                    setNote(r.note);
                    setStatus(r.status);
                    setEdit(r.id);
                  }}
                >
                  Edit
                </button>
                <button
                  className="danger-text"
                  onClick={() =>
                    modal({
                      title: "Delete review?",
                      body: (
                        <p>
                          This removes the saved review note. It cannot be
                          undone.
                        </p>
                      ),
                      danger: true,
                      label: "Delete review",
                      action: () =>
                        act(async () => {
                          D.owned(d.id);
                          D.db.reviews = D.db.reviews.filter(
                            (x) => x.id !== r.id,
                          );
                          D.event("Deleted review for " + row.record_id);
                          await D.persist();
                          modal(null);
                        }),
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
        <section className="card">
          <h2>Saved prediction history</h2>
          <Table
            name="runs"
            data={history}
            columns={[
              { key: "date", label: "Date" },
              {
                key: "risk",
                label: "Simulated risk",
                render: (r) => (
                  <span>{(Number(r.risk) * 100).toFixed(1)}%</span>
                ),
              },
              {
                key: "action",
                label: "Action",
                render: (r) => (
                  <Link to={"/prediction-runs/" + r.id}>Open run</Link>
                ),
              },
            ]}
          />
        </section>
      </div>
    </>
  );
}
function Quality({ d }: { d: D.Dataset }) {
  return (
    <>
      <Title
        title="Data quality"
        sub={d.name + " · schema compliance, not a prediction of accuracy"}
        action={
          <Link className="button" to={"/datasets/" + d.id}>
            Back to dataset
          </Link>
        }
      />
      <div className="metric-grid">
        <section className="card metric">
          <span>Validated rows</span>
          <strong>{d.rows.length}</strong>
        </section>
        <section className="card metric">
          <span>Duplicate IDs</span>
          <strong>
            {d.rows.length - new Set(d.rows.map((r) => r.record_id)).size}
          </strong>
        </section>
        <section className="card metric">
          <span>Required fields present</span>
          <strong>100%</strong>
        </section>
      </div>
      <section className="card">
        <h2>Field observations</h2>
        <Table
          name="fields"
          data={D.headers.map((k) => ({
            field: k,
            missing: d.rows.filter((r) => String(r[k as keyof D.Row]) === "")
              .length,
            observed:
              k === "record_id"
                ? d.rows.length + " unique IDs"
                : k === "schoolsup"
                  ? [...new Set(d.rows.map((r) => r.schoolsup))].join(", ")
                  : Math.min(
                      ...d.rows.map((r) => Number(r[k as keyof D.Row])),
                    ) +
                    "–" +
                    Math.max(...d.rows.map((r) => Number(r[k as keyof D.Row]))),
          }))}
          columns={["field", "missing", "observed"].map((key) => ({
            key,
            label: key,
          }))}
          exportable
        />
        <details>
          <summary>Field dictionary</summary>
          <Schema />
        </details>
        <p className="notice">
          Passing schema checks does not establish representative data, fairness
          or predictive validity.
        </p>
      </section>
    </>
  );
}
function Analytics(ctx: Context) {
  const ds = D.db.datasets.filter((d) => d.owner === ctx.user.id);
  const [id, setId] = useState(ds[0]?.id || "");
  const d = ds.find((d) => d.id === id);
  const runs = D.db.runs.filter(
    (r) => r.dataset === id && r.status === "completed",
  );
  const [runId, setRunId] = useState("");
  const r = runs.find((r) => r.id === runId) || runs[0];
  const bins = [0, 0, 0, 0];
  r?.results.forEach((x) => bins[Math.min(3, Math.floor(x.risk * 4))]++);
  return (
    <>
      <Title
        title="Learning analytics"
        sub="One dataset. One saved run. A clearly defined perspective."
      />
      <section className="card">
        <div className="button-row">
          <label>
            Dataset
            <select
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setRunId("");
              }}
            >
              {ds.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Completed run
            <select
              value={r?.id || ""}
              onChange={(e) => setRunId(e.target.value)}
            >
              <option value="" disabled>
                No completed run
              </option>
              {runs.map((r) => (
                <option value={r.id} key={r.id}>
                  {D.formatDate(r.started)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {d ? (
        <div className="two-columns">
          <section className="card mint">
            <h2>{d.name}</h2>
            <div className="big-number">{d.rows.length}</div>
            <p>synthetic records in this scope</p>
            <Link className="text-link" to={"/datasets/" + d.id}>
              Open dataset <ArrowUpRight size={16} />
            </Link>
          </section>
          <section className="card">
            <h2>Simulated risk distribution</h2>
            {r ? (
              <>
                <div className="bar-chart">
                  {bins.map((n, i) => (
                    <Link
                      key={i}
                      to={"/prediction-runs/" + r.id}
                      aria-label={`${i * 25} to ${(i + 1) * 25} percent: ${n} records. Open results.`}
                    >
                      <strong>{n}</strong>
                      <span
                        style={{
                          height:
                            Math.max(8, (n / r.results.length) * 180) + "px",
                        }}
                      />
                      <small>
                        {i * 25}–{(i + 1) * 25}%
                      </small>
                    </Link>
                  ))}
                </div>
                <p>
                  {r.results.filter((x) => x.risk >= 0.5).length} above
                  threshold · {r.results.filter((x) => x.risk < 0.5).length}{" "}
                  below
                </p>
                <Link className="button" to={"/prediction-runs/" + r.id}>
                  Review saved results
                </Link>
                <button
                  onClick={() =>
                    ctx.act(() =>
                      D.download(
                        "analytics.csv",
                        D.csv(
                          bins.map((count, i) => ({
                            scope: d.name,
                            run: r.id,
                            bin: `${i * 25}-${(i + 1) * 25}%`,
                            count,
                          })),
                        ),
                      ),
                    )
                  }
                >
                  Export aggregate summary
                </button>
              </>
            ) : (
              <>
                <p>No completed prediction exists for this dataset.</p>
                <Link to={"/datasets/" + d.id} className="button">
                  Run prediction
                </Link>
              </>
            )}
          </section>
        </div>
      ) : (
        <ErrorPanel
          title="No datasets yet"
          text="Upload a dataset to explore analytics."
        />
      )}
    </>
  );
}
function Activity({ user, act, modal }: Context) {
  const [kind, setKind] = useState("all");
  const [after, setAfter] = useState("");
  const events = D.db.events.filter(
    (e) =>
      e.owner === user.id &&
      (kind === "all" || e.text.toLowerCase().includes(kind)) &&
      (!after || e.date.slice(0, 10) >= after),
  );
  return (
    <>
      <Title
        title="Activity history"
        sub="A trace of meaningful local changes. Private notes and raw rows are never logged."
      />
      <section className="card">
        <div className="button-row">
          <label>
            Event type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {[
                "all",
                "import",
                "prediction",
                "review",
                "deleted",
                "account",
              ].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            On or after (YYYY-MM-DD)
            <input
              placeholder="2026-10-01"
              value={after}
              onChange={(e) => setAfter(e.target.value)}
            />
          </label>
          <button
            onClick={() => {
              setKind("all");
              setAfter("");
            }}
          >
            Clear filters
          </button>
        </div>
        <Table
          name="events"
          exportable
          data={events.map((e) => ({ ...e, time: D.formatDate(e.date) }))}
          columns={[
            { key: "time", label: "Timestamp" },
            { key: "text", label: "Operation" },
            {
              key: "id",
              label: "Reference",
              render: (r) => <code>{String(r.id).slice(0, 8)}</code>,
            },
            {
              key: "read",
              label: "Status",
              render: (r) => <span>{r.read ? "Read" : "New"}</span>,
            },
            {
              key: "details",
              label: "Details",
              render: (r) => (
                <button
                  onClick={() =>
                    modal({
                      title: "Activity details",
                      body: (
                        <>
                          <p>{String(r.text)}</p>
                          <p>
                            Actor: {user.name}
                            <br />
                            Timestamp: {String(r.time)}
                            <br />
                            Reference: {String(r.id)}
                          </p>
                          <p>
                            No raw rows, password or review note contents are
                            logged.
                          </p>
                        </>
                      ),
                    })
                  }
                >
                  View event
                </button>
              ),
            },
          ]}
        />
        <button
          onClick={() =>
            act(async () => {
              events.forEach((e) => (e.read = true));
              await D.persist();
              notify("Activity marked read.");
            })
          }
        >
          Mark all read
        </button>
      </section>
    </>
  );
}
function Accounts(ctx: Context) {
  const { modal, act } = ctx;
  const edit = (a?: D.Account) => {
    let name = a?.name || "",
      email = a?.email || "",
      role = a?.role || "teacher",
      enabled = a?.enabled ?? true;
    modal({
      title: a ? "Edit demo account" : "Create demo account",
      body: (
        <>
          <p>
            Shared demo credential: <code>DemoOnly!2026</code>. No email will be
            sent.
          </p>
          <label>
            Full name
            <input
              defaultValue={name}
              onChange={(e) => (name = e.target.value)}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              defaultValue={email}
              onChange={(e) => (email = e.target.value)}
            />
          </label>
          <label>
            Role
            <select
              defaultValue={role}
              onChange={(e) => (role = e.target.value)}
            >
              {["teacher", "analyst", "administrator"].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              defaultValue={enabled ? "enabled" : "disabled"}
              onChange={(e) => (enabled = e.target.value === "enabled")}
            >
              <option>enabled</option>
              <option>disabled</option>
            </select>
          </label>
        </>
      ),
      action: () =>
        act(async () => {
          if (!name.trim() || !/^\S+@\S+\.example$/.test(email.trim()))
            throw Error("Enter a full name and a synthetic .example email.");
          if (
            D.db.accounts.some(
              (x) => x.id !== a?.id && x.email === email.trim().toLowerCase(),
            )
          )
            throw Error("This email already exists.");
          if (
            a?.role === "administrator" &&
            a.enabled &&
            (!enabled || role !== "administrator") &&
            D.db.accounts.filter((x) => x.role === "administrator" && x.enabled)
              .length === 1
          )
            throw Error(
              "The last active administrator cannot be disabled or demoted.",
            );
          const commit = async () => {
            if (D.current()?.role !== "administrator")
              throw Error("Administrator access required.");
            const account = {
              id: a?.id || D.uid(),
              name: name.trim(),
              email: email.trim().toLowerCase(),
              role,
              enabled,
            };
            await D.saveAccount(account);
            modal(null);
            notify("Demo account saved.");
          };
          if (a && (a.role !== role || a.enabled !== enabled)) {
            modal({
              title: "Change account access?",
              body: (
                <p>
                  {name} will have {role} access and be{" "}
                  {enabled ? "enabled" : "disabled"}. Disabled accounts cannot
                  sign in or make requests.
                </p>
              ),
              label: "Confirm access change",
              action: () => act(commit),
            });
          } else await commit();
        }),
    });
  };
  return (
    <>
      <Title
        title="Demo accounts"
        sub="Manage synthetic identities. Administrator access does not grant access to student rows."
        action={
          <button className="primary" onClick={() => edit()}>
            <Plus size={16} /> Create demo account
          </button>
        }
      />
      <section className="card">
        <Table
          name="accounts"
          data={D.db.accounts.map((a) => ({ ...a }))}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            {
              key: "enabled",
              label: "Status",
              render: (r) => (
                <span
                  className={"status " + (r.enabled ? "completed" : "failed")}
                >
                  {r.enabled ? "Enabled" : "Disabled"}
                </span>
              ),
            },
            {
              key: "action",
              label: "Actions",
              render: (r) => (
                <button
                  onClick={() => edit(D.db.accounts.find((a) => a.id === r.id))}
                >
                  Edit account
                </button>
              ),
            },
          ]}
        />
      </section>
    </>
  );
}
const samples = [
  ["demo-valid-12.csv", "12 varied valid records"],
  ["demo-valid-semicolon.csv", "Supported semicolon delimiter"],
  ["demo-invalid-values.csv", "Out-of-range, blank and duplicate values"],
  ["demo-missing-column.csv", "Missing required column"],
  ["demo-unknown-column.csv", "Unsupported header"],
  ["demo-empty.csv", "Headers without records"],
  ["demo-too-many-rows.csv", "501 rows, above the limit"],
  ["demo-quoted-values.csv", "Legitimate quoted CSV fields"],
  ["demo-oversized.csv", "Above the 1 MB limit"],
];
function Help({ user, modal, act }: Context) {
  const [query, setQuery] = useState(""),
    [subject, setSubject] = useState(""),
    [category, setCategory] = useState("Usability"),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const topics = [
    [
      "Getting started",
      "Import → Preview → Predict → Review. Download a sample, upload it, correct any errors, confirm once, then run a simulated prediction.",
    ],
    [
      "CSV requirements",
      "Maximum 1 MB and 500 records. Comma and semicolon delimiters are detected. Quoted fields, BOM and CRLF are supported. Strict schema: no missing, duplicate or extra headers.",
    ],
    [
      "Prediction limitations",
      "demo-rule-v1 is deterministic: clamp(0.50 − 0.04(G1−10) + 0.10 failures − 0.035(studytime−2) − 0.03 when schoolsup=yes, 0.02, 0.98). It is an invented simulator, not a validated model.",
    ],
    [
      "Recovery and troubleshooting",
      "Read failures can be retried. For uncertain imports use Check import status. Running predictions resume by saved ID after reload. Previews expire after 30 minutes.",
    ],
    [
      "Demo accounts",
      "Use maya@demo.example, noah@demo.example, analyst@demo.example or admin@demo.example with DemoOnly!2026. Disabled account: disabled@demo.example. No real credentials.",
    ],
  ];
  return (
    <>
      <Title
        title="Help & guides"
        sub="Everything you need for a thoughtful walkthrough."
        action={
          <button
            onClick={() =>
              act(() =>
                D.download(
                  "student-performance-guide.txt",
                  topics.map((t) => t.join("\n")).join("\n\n"),
                  "text/plain",
                ),
              )
            }
          >
            <Download size={15} /> Download guide
          </button>
        }
      />
      <div className="two-columns">
        <section className="card">
          <h2>Find your next step</h2>
          <div className="search">
            <Search size={17} />
            <input
              aria-label="Search help"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search help topics…"
            />
            {query && (
              <button
                aria-label="Clear help search"
                onClick={() => setQuery("")}
              >
                <X size={15} />
              </button>
            )}
          </div>
          {topics
            .filter((t) =>
              t.join(" ").toLowerCase().includes(query.toLowerCase()),
            )
            .map(([title, text]) => (
              <details key={title} open>
                <summary>{title}</summary>
                <p>{text}</p>
              </details>
            ))}
          <Schema />
        </section>
        <section className="card lavender">
          <h2>Sample datasets</h2>
          <p>Download these files and upload them to exercise validation.</p>
          {samples.map(([name, description]) => (
            <div className="sample" key={name}>
              <FileSpreadsheet size={19} />
              <span>
                <strong>{name}</strong>
                <small>{description}</small>
              </span>
              <button
                className="icon"
                title={"Download " + name}
                aria-label={"Download " + name}
                onClick={() => act(() => D.download(name, D.fixture(name)))}
              >
                <Download size={17} />
              </button>
            </div>
          ))}
        </section>
        <section className="card">
          <h2>Send demo feedback</h2>
          <p>Saved to a local outbox. No email is sent.</p>
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              if (subject.trim().length < 3 || message.trim().length < 10) {
                setError(
                  "Enter a subject (3+ characters) and message (10+ characters).",
                );
                return;
              }
              setBusy(true);
              try {
                await D.delay("feedback");
                D.db.outbox.unshift({
                  id: D.uid(),
                  owner: user.id,
                  subject,
                  category,
                  message,
                  date: new Date().toISOString(),
                });
                await D.persist();
                setSubject("");
                setMessage("");
                setError("");
                notify("Saved to demo outbox — no email was sent.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Subject
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label>
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Usability</option>
                <option>Data format</option>
                <option>Other feedback</option>
              </select>
            </label>
            <label>
              Message
              <textarea
                className="resize-none"
                style={{ resize: "none" }}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save demo feedback"}
            </button>
          </form>
        </section>
        <section className="card">
          <h2>Your demo outbox</h2>
          <p>Only feedback from {user.name} is shown.</p>
          {D.db.outbox
            .filter((o) => o.owner === user.id)
            .map((o) => (
              <article className="review-note" key={o.id}>
                <strong>{o.subject}</strong>
                <p>{o.message}</p>
                <small>
                  {D.formatDate(o.date)} · {o.id.slice(0, 8)}
                </small>
                <div className="button-row">
                  <button
                    onClick={() =>
                      act(() =>
                        D.download(
                          "feedback-" + o.id + ".json",
                          JSON.stringify(o, null, 2),
                          "application/json",
                        ),
                      )
                    }
                  >
                    Download
                  </button>
                  <button
                    className="danger-text"
                    onClick={() =>
                      modal({
                        title: "Delete feedback?",
                        body: <p>Remove this local outbox item permanently?</p>,
                        label: "Delete",
                        danger: true,
                        action: () =>
                          act(async () => {
                            D.db.outbox = D.db.outbox.filter(
                              (x) => x.id !== o.id,
                            );
                            await D.persist();
                            modal(null);
                          }),
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          {!D.db.outbox.some((o) => o.owner === user.id) && (
            <div className="empty">
              <CheckCheck size={30} />
              <p>No feedback saved yet.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
function Preferences({ user, modal, act }: Context) {
  const defaults = { density: "comfortable", size: 10, zone: "Europe/Warsaw" };
  const [prefs, setPrefs] = useState(D.db.preferences[user.id] || defaults);
  useUnsaved(
    JSON.stringify(prefs) !==
      JSON.stringify(D.db.preferences[user.id] || defaults),
    modal,
  );
  return (
    <>
      <Title
        title="Preferences"
        sub="Local display settings for your synthetic account."
      />
      <section className="card preference-card">
        <h2>{user.name}</h2>
        <p>
          {user.email} · {user.role}
        </p>
        <label>
          Table density
          <select
            value={prefs.density}
            onChange={(e) => setPrefs({ ...prefs, density: e.target.value })}
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
        <label>
          Default page size
          <select
            value={prefs.size}
            onChange={(e) => setPrefs({ ...prefs, size: +e.target.value })}
          >
            {[10, 25, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Display timezone
          <select
            value={prefs.zone}
            onChange={(e) => setPrefs({ ...prefs, zone: e.target.value })}
          >
            <option>Europe/Warsaw</option>
            <option>UTC</option>
          </select>
        </label>
        <div className="button-row">
          <button
            className="primary"
            onClick={() =>
              act(async () => {
                D.db.preferences[user.id] = prefs;
                await D.persist();
                document.documentElement.dataset.density = prefs.density;
                notify("Preferences saved.");
              })
            }
          >
            Save preferences
          </button>
          <button
            onClick={() => setPrefs(D.db.preferences[user.id] || defaults)}
          >
            Cancel changes
          </button>
          <button
            onClick={() =>
              modal({
                title: "Restore default preferences?",
                body: (
                  <p>
                    Reset your local display settings to comfortable, 10 rows
                    and Europe/Warsaw.
                  </p>
                ),
                label: "Restore defaults",
                action: () =>
                  act(async () => {
                    setPrefs(defaults);
                    D.db.preferences[user.id] = defaults;
                    await D.persist();
                    modal(null);
                  }),
              })
            }
          >
            Restore defaults
          </button>
        </div>
      </section>
    </>
  );
}
