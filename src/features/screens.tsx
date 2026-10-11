import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useBlocker } from "react-router-dom";
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
import { Link, FormMessage, useQuery, useOperation } from "../ui";
import { Evaluation, Quality, Analytics, Activity } from "./insights";
import { Outbox, guideDownloads, helpTopics } from "./support";
import { notify } from "../notifications";
import type { Context } from "../types";
import { Title, Steps, ErrorPanel, Table, Schema } from "../components";
const Plan = React.lazy(() => import("./plan/Plan"));
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
    if (pathname === "/plan")
      return (
        <React.Suspense fallback={<p role="status">Loading project plan…</p>}>
          <Plan />
        </React.Suspense>
      );
    if (pathname.startsWith("/evaluations/")) return <Evaluation full={full} />;
    if (pathname === "/help") return <Help {...ctx} />;
    if (pathname === "/settings" && full) return <Preferences {...ctx} />;
    if (pathname === "/admin/accounts" && full) {
      if (user.role !== "administrator")
        throw Error("Forbidden. Account management is administrator-only.");
      return <Accounts {...ctx} />;
    }
    if (pathname === "/activity" && full && user.role === "administrator")
      return <Activity {...ctx} />;
    if (
      !/^\/(datasets|imports|prediction-runs|analytics|activity)(\/|$)/.test(
        pathname,
      )
    )
      return (
        <ErrorPanel
          title="Page not found"
          text="This address does not match a page in the prototype."
        />
      );
    if (pathname.startsWith("/prediction-runs/")) {
      const run = D.db.runs.find((r) => r.id === pathname.split("/")[2]);
      if (run) D.owned(run.dataset);
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
  const ds = D.ownedDatasets();
  const completed = D.db.runs.filter(
    (r) => r.status === "completed" && ds.some((d) => d.id === r.dataset),
  );
  completed.sort((a, b) => b.started - a.started);
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
      {full && (
        <section className="card recent-activity">
          <div className="section-heading">
            <h2>Recent activity</h2>
            <Link to="/activity">View all activity</Link>
          </div>
          {D.authorizedEvents().length ? (
            D.authorizedEvents()
              .slice(0, 3)
              .map((e) => (
                <p key={e.id}>
                  {e.text} <small>{D.formatDate(e.date)}</small>{" "}
                  {D.eventDestination(e) && (
                    <Link to={D.eventDestination(e)!}>Open</Link>
                  )}
                </p>
              ))
          ) : (
            <p>
              No changes yet. Imports, predictions and reviews will appear here.
            </p>
          )}
        </section>
      )}
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
              const run = D.datasetRuns(d.id)[0];
              return {
                id: d.id,
                name: d.name,
                schema: "demo-input-v1",
                count: d.rows.length,
                date: Date.parse(d.created),
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
              {
                key: "date",
                label: "Imported",
                render: (r) => D.formatDate(Number(r.date)),
              },
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
          required
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
        D.event("Renamed dataset", {
          object: d.name,
          objectId: d.id,
          destination: "/datasets/" + d.id,
        });
        await D.persist();
        modal(null);
        notify("Dataset renamed.");
      }),
  });
}
function UploadPage() {
  const controller = useRef<AbortController | null>(null);
  const live = useOperation();
  const [stage, setStage] = useState("");
  useEffect(() => () => controller.current?.abort(), []);
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
              if (busy) return;
              setFile(e.dataTransfer.files[0] || null);
              setError("");
            }}
          >
            <span className="upload-symbol">
              <Upload size={30} strokeWidth={1.5} />
            </span>
            <h3>{file ? file.name : "Drop a dataset here"}</h3>
            <p>
              {file
                ? `${(file.size / 1024).toFixed(1)} KB · ${file.type || "unknown MIME type"} · ready to validate`
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
            <button disabled={busy} onClick={() => input.current?.click()}>
              {file ? "Replace file" : "Browse files"}
            </button>
            {file && (
              <button
                disabled={busy}
                onClick={() => {
                  setFile(null);
                  if (input.current) input.current.value = "";
                }}
              >
                Remove
              </button>
            )}
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
          <FormMessage error={error} />
          <p className="upload-status" role="status">
            {stage}
          </p>
          {busy && (
            <button
              onClick={() => {
                controller.current?.abort();
                setBusy(false);
                setStage(
                  "Validation cancelled. Your selected file is unchanged.",
                );
              }}
            >
              Cancel validation
            </button>
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
                  controller.current = new AbortController();
                  const p = await D.preview(
                    file,
                    controller.current.signal,
                    setStage,
                  );
                  if (!live() || controller.current.signal.aborted) return;
                  nav("/imports/" + p.id);
                } catch (e) {
                  if ((e as Error).name !== "AbortError" && live())
                    setError((e as Error).message);
                } finally {
                  if (live()) setBusy(false);
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
            Schema <code>{D.contract.schema}</code>. Include exactly these five
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
            <button
              onClick={() =>
                D.download("demo-invalid-values.csv", D.fixture("invalid"))
              }
            >
              Invalid sample
            </button>
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
  const live = useOperation();
  const p = D.db.previews.find((p) => p.id === id);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const nav = useNavigate();
  if (!p || p.owner !== user.id)
    return (
      <ErrorPanel
        title={!p ? "Preview not found" : "Access restricted"}
        text={
          !p
            ? "The staged preview is missing or was cleaned up. Re-upload the file."
            : "Forbidden. This preview belongs to another teacher."
        }
        action={
          <Link className="button" to="/datasets/new">
            Re-upload
          </Link>
        }
      />
    );
  const invalidRows = new Set(
    p.issues
      .filter((i) => i.row > 1 && i.row <= p.rows.length + 1)
      .map((i) => i.row),
  ).size;
  const validRows = p.issues.some((i) => i.row === 1)
    ? 0
    : Math.max(0, p.rows.length - invalidRows);
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
              invalid rows · {validRows} valid rows · {D.contract.schema}
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
                D.formatDate(p.expires) +
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
              ? ["row", "record_id", "column", "value", "hint"].map((key) => ({
                  key,
                  label: key === "hint" ? "How to correct" : key,
                }))
              : D.headers.map((key) => ({ key, label: key }))
          }
        />
        <details>
          <summary>Field explanations</summary>
          <Schema />
        </details>
        {p.issues.length > 0 && p.rows.length > 0 && (
          <details>
            <summary>Inspect parsed rows ({p.rows.length})</summary>
            <Table
              name="parsed rows"
              data={p.rows.map((r) => ({ ...r }))}
              columns={D.headers.map((key) => ({ key, label: key }))}
            />
          </details>
        )}
        <div className="form-actions">
          <button
            onClick={() =>
              act(async () => {
                await D.discardPreview(id);
                nav("/datasets");
              })
            }
          >
            Cancel preview
          </button>
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
                  const dataset = await D.confirmImport(id);
                  if (live()) nav("/datasets/" + dataset);
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
  const live = useOperation();
  const { d, full, act, modal } = ctx;
  const query = useQuery();
  const tab = query.params.get("tab") === "runs" ? "runs" : "records";
  const setTab = (tab: string) =>
    query.set({ tab, page: "1", sort: "", dir: "" });
  const [busy, setBusy] = useState(false);
  const nav = useNavigate(),
    runs = D.datasetRuns(d.id);
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
                    if (live()) nav("/prediction-runs/" + r.id);
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
          <strong>{D.formatDate(d.created)}</strong>
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
        <div
          className="tabs"
          role="tablist"
          aria-label="Dataset views"
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? "records"
                  : e.key === "End"
                    ? "runs"
                    : tab === "records"
                      ? "runs"
                      : "records";
              setTab(next);
              document.getElementById("tab-" + next)?.focus();
            }
          }}
        >
          <button
            id="tab-records"
            aria-controls="dataset-panel"
            tabIndex={tab === "records" ? 0 : -1}
            role="tab"
            aria-selected={tab === "records"}
            className={tab === "records" ? "active" : ""}
            onClick={() => setTab("records")}
          >
            Records <span>{d.rows.length}</span>
          </button>
          <button
            id="tab-runs"
            aria-controls="dataset-panel"
            tabIndex={tab === "runs" ? 0 : -1}
            role="tab"
            aria-selected={tab === "runs"}
            className={tab === "runs" ? "active" : ""}
            onClick={() => setTab("runs")}
          >
            Prediction runs <span>{runs.length}</span>
          </button>
        </div>
        <div
          id="dataset-panel"
          role="tabpanel"
          aria-labelledby={"tab-" + tab}
          tabIndex={0}
        >
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
              data={runs.map((r) => ({ ...r, date: r.started }))}
              columns={[
                { key: "id", label: "Run ID" },
                {
                  key: "date",
                  label: "Requested / started",
                  render: (r) => D.formatDate(Number(r.date)),
                },
                {
                  key: "completed",
                  label: "Completed",
                  render: (r) =>
                    r.completed ? D.formatDate(Number(r.completed)) : "—",
                },
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
                  render: (r) => (
                    <code>{String(r.model || D.contract.model)}</code>
                  ),
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
        </div>
        <details>
          <summary>Input field definitions</summary>
          <Schema />
        </details>
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
function RunPage({ id, full, act, modal }: Context & { id: string }) {
  const query = useQuery();
  const run = D.db.runs.find((r) => r.id === id);
  const [, tick] = useState(0);
  useEffect(() => {
    if (run?.status !== "running") return;
    const timer = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(timer);
  }, [run?.status, id]);
  const filter = ["above", "below"].includes(query.params.get("risk") || "")
    ? query.params.get("risk")!
    : "all";
  const bin = /^[0-3]$/.test(query.params.get("bin") || "")
    ? query.params.get("bin")!
    : "";
  const setFilter = (risk: string) => query.set({ risk, bin: "" });
  const [interrupted, setInterrupted] = useState(
    sessionStorage.getItem("interrupted-run") === id,
  );
  if (!run)
    return (
      <ErrorPanel text="Prediction run not found. It may have been deleted." />
    );
  const d = D.owned(run.dataset),
    threshold = run.threshold ?? D.contract.threshold,
    above = run.results.filter((r) => r.risk >= threshold).length;
  const data = D.runResults(run, filter, bin);
  const stage = Math.min(
    3,
    Math.floor(
      (Math.max(0, Date.now() - run.started) /
        Math.max(1, run.finish - run.started)) *
        4,
    ),
  );
  const metadata = (
    <dl className="detail-list">
      <dt>Run ID</dt>
      <dd>
        <code>{run.id}</code>
      </dd>
      <dt>Requested</dt>
      <dd>{D.formatDate(run.requested || run.started)}</dd>
      <dt>Started</dt>
      <dd>{D.formatDate(run.started)}</dd>
      <dt>Completed</dt>
      <dd>{run.completed ? D.formatDate(run.completed) : "Not completed"}</dd>
      <dt>Model</dt>
      <dd>{run.model}</dd>
      <dt>Schema</dt>
      <dd>{run.schema}</dd>
      <dt>Threshold</dt>
      <dd>
        {run.thresholdVersion} · {threshold}
      </dd>
    </dl>
  );
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
      <div className="button-row contextual-tools">
        <button
          onClick={() =>
            modal({ title: "Run metadata", variant: "drawer", body: metadata })
          }
        >
          Run details
        </button>
        <details className="explanation-popover">
          <summary>What does simulated risk mean?</summary>
          <p>
            The deterministic demo rule produces a value between 0 and 1. A
            saved threshold of {threshold.toFixed(2)} separates the two labels.
            It is not a diagnosis, confidence interval, causal explanation or
            validated prediction.
          </p>
        </details>
      </div>
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
          Simulated prediction · {run.model} · threshold {threshold.toFixed(2)}.
          An invented rule for demonstrating the interface, not a validated
          educational model.
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
            <code>{run.model}</code>
          </div>
          <div>
            <small>Schema</small>
            <code>{run.schema}</code>
          </div>
          <div>
            <small>Saved threshold</small>
            <code>
              {run.thresholdVersion} · {threshold.toFixed(2)}
            </code>
          </div>
        </div>
        {run.status === "running" ? (
          <div className="empty">
            <div className="spinner" />
            <h3 role="status">
              {
                [
                  "Preparing records",
                  "Simulating prediction",
                  "Validating response",
                  "Saving results",
                ][stage]
              }
            </h3>
            <p>
              Demonstration stages derived from recorded timing, not measured
              service progress.
            </p>
            <p>This run is saved. You can return to it after refresh.</p>
            <button onClick={() => act(() => D.resolveRuns())}>
              Check run status
            </button>
          </div>
        ) : run.status === "failed" ? (
          <div className="error-panel">
            <code>{run.code || "PREDICTION_FAILED"}</code>
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
                {bin !== "" && (
                  <>
                    <span>
                      Range {Number(bin) * 25}–{(Number(bin) + 1) * 25}% ·{" "}
                      {data.length} matching
                    </span>
                    <button onClick={() => query.set({ bin: "", risk: "" })}>
                      Clear range
                    </button>
                  </>
                )}
                {["all", "above", "below"].map((s) => (
                  <button
                    aria-pressed={filter === s && bin === ""}
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
                        "pill " +
                        (Number(r.risk) >= threshold ? "warm" : "mint")
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
  const query = useQuery();
  const origin = useLocation().state?.from as string | undefined;
  const draftKey = "draft:" + user.id + ":" + d.id + ":" + record;
  const [initial] = useState<{
    note: string;
    status: string;
    association: string;
    edit: string;
    baseline?: string;
  }>(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem(draftKey) || "null") || {
          note: "",
          status: "Needs review",
          association: "",
          edit: "",
        }
      );
    } catch {
      return { note: "", status: "Needs review", association: "", edit: "" };
    }
  });
  const [note, setNote] = useState(initial.note),
    [status, setStatus] = useState(initial.status),
    [association, setAssociation] = useState(initial.association),
    [edit, setEdit] = useState(initial.edit),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const blank = JSON.stringify({
    note: "",
    status: "Needs review",
    association: "",
    edit: "",
  });
  const [baseline, setBaseline] = useState(initial.baseline || blank);
  const draft = JSON.stringify({ note, status, association, edit });
  useUnsaved(draft !== baseline, modal);
  useEffect(() => {
    if (draft !== blank)
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ note, status, association, edit, baseline }),
      );
    else sessionStorage.removeItem(draftKey);
  }, [draft, baseline]);
  const resetDraft = () => {
    setNote("");
    setStatus("Needs review");
    setAssociation("");
    setEdit("");
    setError("");
    setBaseline(blank);
    sessionStorage.removeItem(draftKey);
  };
  if (!row) return <ErrorPanel text="Record not found in this dataset." />;
  const history = D.db.runs
    .filter((r) => r.dataset === d.id && r.status === "completed")
    .map((r) => ({
      id: r.id,
      date: r.started,
      risk: r.results.find((x) => x.id === row.record_id)!.risk,
    }));
  return (
    <>
      <Title
        title={row.record_id}
        sub={d.name + " · record review"}
        action={
          <Link
            className="button"
            to={
              origin?.startsWith("/prediction-runs/")
                ? origin
                : "/datasets/" + d.id
            }
          >
            {origin?.startsWith("/prediction-runs/")
              ? "Back to results"
              : "Back to dataset"}
          </Link>
        }
      />
      <p className="notice">
        Current review status: {D.reviewStatus(d.id, row.record_id)}
      </p>
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
                resetDraft();
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
                      {D.formatDate(r.started)} · {r.status}
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
                minLength={5}
                required
                maxLength={1000}
                placeholder="What would you like to verify or discuss?"
              />
            </label>
            <small>{note.length}/1,000 characters</small>
            <FormMessage error={error} />
            <div className="button-row">
              <button className="primary" disabled={busy}>
                {busy ? "Saving…" : edit ? "Save changes" : "Save review"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetDraft();
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
                    setAssociation(r.run || "");
                    setBaseline(
                      JSON.stringify({
                        note: r.note,
                        status: r.status,
                        association: r.run || "",
                        edit: r.id,
                      }),
                    );
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
                          D.event("Deleted review for " + row.record_id, {
                            objectId: d.id,
                            object: d.name + " / " + row.record_id,
                            destination:
                              "/datasets/" +
                              d.id +
                              "/records/" +
                              encodeURIComponent(row.record_id),
                          });
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
          <label>
            Selected prediction
            <select
              value={query.params.get("run") || history[0]?.id || ""}
              onChange={(e) => query.set({ run: e.target.value })}
            >
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.id.slice(0, 8)} · {D.formatDate(h.date)}
                </option>
              ))}
            </select>
          </label>
          {(() => {
            const selected = D.db.runs.find(
              (r) =>
                r.id === (query.params.get("run") || history[0]?.id) &&
                r.dataset === d.id &&
                r.status === "completed",
            );
            const result = selected?.results.find(
              (x) => x.id === row.record_id,
            );
            return selected && result ? (
              <p className="notice">
                {(result.risk * 100).toFixed(1)}% simulated risk ·{" "}
                {result.risk >= (selected.threshold ?? D.contract.threshold)
                  ? "Above"
                  : "Below"}{" "}
                saved threshold {selected.threshold} · {selected.model} ·{" "}
                {selected.schema} · {D.formatDate(selected.started)}
              </p>
            ) : (
              <p>No completed prediction for this record.</p>
            );
          })()}
          <Table
            name="runs"
            data={history}
            columns={[
              {
                key: "date",
                label: "Date",
                render: (r) => D.formatDate(Number(r.date)),
              },
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
function Accounts(ctx: Context) {
  const { modal, act } = ctx;
  const query = useQuery();
  const roleFilter = query.params.get("role") || "all",
    enabledFilter = query.params.get("status") || "all";
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
            {a?.credential ? (
              "This account uses a chosen demo password. Editing access preserves it."
            ) : (
              <>
                Shared demo credential: <code>DemoOnly!2026</code>.
              </>
            )}{" "}
            No email will be sent.
          </p>
          <label>
            Full name
            <input
              required
              defaultValue={name}
              onChange={(e) => (name = e.target.value)}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              required
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
        <div className="button-row">
          <label>
            Role
            <select
              value={roleFilter}
              onChange={(e) => query.set({ role: e.target.value })}
            >
              {["all", "teacher", "analyst", "administrator"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Account status
            <select
              value={enabledFilter}
              onChange={(e) => query.set({ status: e.target.value })}
            >
              {["all", "enabled", "disabled"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <button onClick={() => query.set({ role: "", status: "" })}>
            Clear filters
          </button>
        </div>
        <Table
          name="accounts"
          data={D.db.accounts
            .filter(
              (a) =>
                (roleFilter === "all" || a.role === roleFilter) &&
                (enabledFilter === "all" ||
                  a.enabled === (enabledFilter === "enabled")),
            )
            .map((a) => ({
              ...a,
              created: Date.parse(a.created || new Date(0).toISOString()),
            }))}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            {
              key: "created",
              label: "Created",
              render: (r) => D.formatDate(Number(r.created)),
            },
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
                <details className="row-menu">
                  <summary aria-label={"Actions for " + r.name}>
                    Account actions
                  </summary>
                  <div>
                    <button
                      onClick={() =>
                        edit(D.db.accounts.find((a) => a.id === r.id))
                      }
                    >
                      Edit account
                    </button>
                  </div>
                </details>
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
  const topics = helpTopics;
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
                  guideDownloads.guide,
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
          {!topics.some((t) =>
            t.join(" ").toLowerCase().includes(query.toLowerCase()),
          ) && (
            <p role="status">
              No help topics match. Clear the search to see all topics.
            </p>
          )}
          <Schema />
          <div className="button-row">
            <button
              onClick={() =>
                act(() =>
                  D.download(
                    "csv-schema-guide.txt",
                    guideDownloads.schema,
                    "text/plain",
                  ),
                )
              }
            >
              Download schema guide
            </button>
            <button
              onClick={() =>
                act(() =>
                  D.download(
                    "troubleshooting.txt",
                    guideDownloads.troubleshooting,
                    "text/plain",
                  ),
                )
              }
            >
              Download troubleshooting
            </button>
          </div>
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
              <a
                className="icon button"
                title={"Download " + name}
                aria-label={"Download " + name}
                href={"/fixtures/" + name}
                download={name}
                onClick={(e) => {
                  if (D.consumeScenario("download")) {
                    e.preventDefault();
                    notify("Download preparation failed. Retry.", "error");
                  }
                }}
              >
                <Download size={17} />
              </a>
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
                required
                minLength={3}
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
                required
                minLength={10}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>
            <FormMessage error={error} />
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save demo feedback"}
            </button>
          </form>
        </section>
        <section className="card">
          <h2>Your demo outbox</h2>
          <p>
            {D.db.outbox.filter((o) => o.owner === user.id).length} saved items
            · No email was sent.
          </p>
          <button
            onClick={() =>
              modal({
                title: "Demo outbox",
                variant: "drawer",
                body: <Outbox user={user} act={act} />,
              })
            }
          >
            Open demo outbox
          </button>
        </section>
      </div>
    </>
  );
}
function Preferences({ user, modal, act }: Context) {
  const clearSize = () => {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("view:" + user.id + ":"))
      .forEach((k) => {
        const v = sessionStorage.getItem(k)!;
        const u = new URL(v, location.origin);
        u.searchParams.delete("size");
        u.searchParams.delete("page");
        sessionStorage.setItem(k, u.pathname + u.search);
      });
  };
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
                clearSize();
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
                    clearSize();
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
