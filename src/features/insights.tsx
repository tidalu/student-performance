import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as D from "../domain";
import type { Context } from "../types";
import { Title, Table, Schema, ErrorPanel } from "../components";
import { Link, useQuery, Loading, FormMessage } from "../ui";
import { notify } from "../notifications";

export function Evaluation({ full }: { full: boolean }) {
  const nav = useNavigate();
  const version = useLocation().pathname.split("/")[2];
  const [artifact, setArtifact] = useState<D.EvaluationArtifact | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [reportError, setReportError] = useState("");
  useEffect(() => {
    let active = true;
    setArtifact(null);
    setError("");
    D.readEvaluation(version)
      .then((a) => {
        if (active) setArtifact(a);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [version, attempt]);
  if (error)
    return (
      <ErrorPanel
        title={
          error.includes("not found")
            ? "Evaluation not found"
            : "Evaluation artifact unavailable"
        }
        text={error}
        action={
          <>
            <button onClick={() => setAttempt((n) => n + 1)}>
              Retry evaluation
            </button>
            <Link className="button" to="/evaluations/demo-eval-v1">
              Open evaluation
            </Link>
          </>
        }
      />
    );
  if (!artifact)
    return <Loading label="Loading synthetic evaluation artifact…" />;
  const a = artifact,
    [tp, fn, fp, tn] = a.matrix;
  const ratio = (n: number, d: number) => (d ? n / d : null);
  const values: [string, number | null, string][] = [
    ["Accuracy", ratio(tp + tn, a.count), "(TP + TN) / N"],
    ["Precision", ratio(tp, tp + fp), "TP / (TP + FP)"],
    ["Recall", ratio(tp, tp + fn), "TP / (TP + FN)"],
    ["F1", ratio(2 * tp, 2 * tp + fp + fn), "2TP / (2TP + FP + FN)"],
    ["Specificity", ratio(tn, tn + fp), "TN / (TN + FP)"],
  ];
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
                      "synthetic-evaluation-" + a.version + ".json",
                      JSON.stringify(
                        {
                          synthetic: true,
                          notice:
                            "Illustrative fixtures; not measured project performance",
                          ...a,
                          comparisonPopulation:
                            "Separate validation fixture shared by both test examples",
                          metrics: values.map(([name, value, formula]) => ({
                            name,
                            value,
                            formula,
                            reason:
                              value === null
                                ? "Denominator is zero"
                                : undefined,
                          })),
                        },
                        null,
                        2,
                      ),
                      "application/json",
                    );
                    notify("Evaluation report prepared.");
                  } catch (e) {
                    setReportError((e as Error).message);
                  }
                }}
              >
                Download report
              </button>
            )}
            <button onClick={() => window.print()}>Print / Save as PDF</button>
          </>
        }
      />
      <FormMessage error={reportError} />
      <p className="notice">
        Illustrative synthetic evaluation. Separate from the invented{" "}
        {D.contract.model} prediction simulator; this does not establish project
        accuracy.
      </p>
      <section className="card evaluation-top">
        <label>
          Evaluation fixture
          <select
            value={version}
            onChange={(e) => nav("/evaluations/" + e.target.value)}
          >
            <option value="demo-eval-v1">Binary test example</option>
            <option value="one-class">One-class test example</option>
          </select>
        </label>
        <span className="pill mint">
          {a.population} population · {a.count} synthetic records
        </span>
        <span>
          {a.positive} · threshold {a.threshold.toFixed(2)}
        </span>
        <small>
          {a.version} · Published {D.formatDate(a.date)} · Illustrative selected
          model: {a.selected}
        </small>
      </section>
      <div className="metric-grid">
        {values.map(([name, value, formula]) => (
          <section key={name} className="card metric">
            <span>{name}</span>
            <strong>
              {value === null ? "Not defined" : (value * 100).toFixed(1) + "%"}
            </strong>
            <details>
              <summary>Definition and calculation</summary>
              <p>
                {formula} · TP {tp}, FN {fn}, FP {fp}, TN {tn}, N {a.count}.
              </p>
              {value === null && (
                <p>
                  The denominator is zero: this fixture has no positive examples
                  or positive predictions.
                </p>
              )}
            </details>
          </section>
        ))}
      </div>
      <div className="two-columns">
        <section className="card">
          <h2>Confusion matrix</h2>
          <p>
            Actual rows and predicted columns · threshold{" "}
            {a.threshold.toFixed(2)}
          </p>
          <table
            className={full ? "matrix" : ""}
            aria-label="Synthetic confusion matrix"
          >
            <thead>
              <tr>
                <th scope="col">Actual / Predicted</th>
                <th scope="col">Positive</th>
                <th scope="col">Negative</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Positive</th>
                <td className={full ? "mint" : ""}>
                  {tp}
                  <small>True positive</small>
                </td>
                <td>
                  {fn}
                  <small>False negative</small>
                </td>
              </tr>
              <tr>
                <th scope="row">Negative</th>
                <td>
                  {fp}
                  <small>False positive</small>
                </td>
                <td className={full ? "lavender" : ""}>
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
            Shared validation fixture · used to illustrate model selection. The
            test fixture selector changes test metrics above, not this separate
            validation comparison.
          </p>
          <table aria-label="Validation model comparison">
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Validation accuracy</th>
              </tr>
            </thead>
            <tbody>
              {a.comparison.map((m) => (
                <tr key={m.model}>
                  <td>
                    {m.model}
                    {m.model === a.selected && (
                      <span className="pill mint">Selected</span>
                    )}
                  </td>
                  <td>{(m.accuracy * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          {full && (
            <div
              className="comparison-chart"
              aria-label="Validation accuracy chart"
            >
              {a.comparison.map((m) => (
                <details key={m.model}>
                  <summary>
                    <span>{m.model}</span>
                    <strong>{(m.accuracy * 100).toFixed(0)}%</strong>
                    <span className="chart-track">
                      <i style={{ width: m.accuracy * 100 + "%" }} />
                    </span>
                  </summary>
                  <p>
                    Validation accuracy: {(m.accuracy * 100).toFixed(0)}%.
                    Synthetic comparison value; also available in the table.
                  </p>
                </details>
              ))}
            </div>
          )}
          <details open>
            <summary>Interpretation & limitations</summary>
            <p>
              Selection is illustrated using validation accuracy, followed by
              separate test evaluation. These synthetic fixtures provide no
              evidence of generalization, fairness or causal effects. No ROC-AUC
              is inferred from a confusion matrix. Verify source data and use
              human judgement.
            </p>
          </details>
        </section>
      </div>
    </>
  );
}

export function Quality({ d }: { d: D.Dataset }) {
  const q = useQuery(),
    field = D.headers.includes(q.params.get("field") || "")
      ? q.params.get("field")!
      : "G1",
    summary = D.qualitySummary(d);
  const [error, setError] = useState("");
  return (
    <>
      <Title
        title="Data quality"
        sub={d.name + " · schema compliance, not prediction accuracy"}
        action={
          <>
            <Link className="button" to={"/datasets/" + d.id}>
              Back to dataset
            </Link>
            <button
              onClick={() => {
                try {
                  D.download(
                    "quality-" + d.id + ".json",
                    JSON.stringify(
                      {
                        synthetic: true,
                        ...summary,
                        selectedField: field,
                        distribution: D.fieldDistribution(d, field),
                      },
                      null,
                      2,
                    ),
                    "application/json",
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Download quality summary
            </button>
          </>
        }
      />
      <FormMessage error={error} />
      <div className="metric-grid">
        <section className="card metric">
          <span>Validated rows</span>
          <strong>{summary.records}</strong>
        </section>
        <section className="card metric">
          <span>Duplicate IDs</span>
          <strong>{summary.duplicateIds}</strong>
        </section>
        <section className="card metric">
          <span>Required fields present</span>
          <strong>{summary.completeness.toFixed(1)}%</strong>
        </section>
      </div>
      <section className="card">
        <h2>Schema compliance</h2>
        <p>
          {summary.issues} required-value or schema issues. Figures are computed
          from the stored rows.
        </p>
        <Table
          name="fields"
          data={summary.observations}
          columns={[
            { key: "field", label: "Field" },
            { key: "allowed", label: "Allowed type / range" },
            { key: "missing", label: "Missing" },
            { key: "observed", label: "Observed range / categories" },
          ]}
          exportable
        />
        <label>
          Inspect field
          <select
            value={field}
            onChange={(e) => q.set({ field: e.target.value })}
          >
            {D.headers.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <Table
          name="field values"
          data={D.fieldDistribution(d, field)}
          columns={[
            { key: "value", label: "Observed value" },
            { key: "count", label: "Records" },
            { key: "share", label: "Share (%)" },
          ]}
        />
        <details>
          <summary>Field dictionary & upload requirements</summary>
          <Schema />
          <Link to="/datasets/new">Upload a replacement as a new dataset</Link>
        </details>
        <p className="notice">
          Passing schema checks does not establish representative data, fairness
          or predictive validity.
        </p>
      </section>
    </>
  );
}

export function Analytics(ctx: Context) {
  const q = useQuery(),
    datasets = D.ownedDatasets(),
    d = datasets.find((d) => d.id === q.params.get("dataset")) || datasets[0];
  const runs = d
      ? D.datasetRuns(d.id).filter((r) => r.status === "completed")
      : [],
    r = runs.find((r) => r.id === q.params.get("run")) || runs[0];
  const selected = /^[0-3]$/.test(q.params.get("bin") || "")
    ? q.params.get("bin")!
    : "";
  const bins = [0, 0, 0, 0];
  r?.results.forEach((x) => bins[Math.min(3, Math.floor(x.risk * 4))]++);
  const [error, setError] = useState("");
  if (!d)
    return (
      <ErrorPanel
        title="No datasets yet"
        text="Upload a dataset to explore analytics."
        action={
          <Link className="button" to="/datasets/new">
            Upload dataset
          </Link>
        }
      />
    );
  const inputs = ["G1", "failures", "studytime", "schoolsup"].flatMap((field) =>
    D.fieldDistribution(d, field).map((x) => ({ field, ...x })),
  );
  const threshold = r?.threshold ?? D.contract.threshold,
    above = r?.results.filter((x) => x.risk >= threshold).length || 0;
  return (
    <>
      <Title
        title="Learning analytics"
        sub="One dataset. One saved run. A clearly defined perspective."
        action={
          <button
            onClick={() => {
              try {
                D.download(
                  "analytics-" + d.id + ".json",
                  JSON.stringify(
                    {
                      synthetic: true,
                      dataset: d.id,
                      name: d.name,
                      run: r?.id,
                      schema: r?.schema || D.contract.schema,
                      model: r?.model,
                      threshold,
                      recordCount: d.rows.length,
                      above: r ? above : undefined,
                      below: r ? r.results.length - above : undefined,
                      selection: selected === "" ? "All risk ranges" : selected,
                      bins: bins.map((count, i) => ({
                        range: `${i * 25}–${(i + 1) * 25}%`,
                        count,
                        selected: selected === "" || Number(selected) === i,
                      })),
                      inputDistributions: inputs,
                    },
                    null,
                    2,
                  ),
                  "application/json",
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Export visible aggregate summary
          </button>
        }
      />
      <FormMessage error={error} />
      <section className="card">
        <div className="button-row">
          <label>
            Dataset
            <select
              value={d.id}
              onChange={(e) =>
                q.set({ dataset: e.target.value, run: "", bin: "" })
              }
            >
              {datasets.map((d) => (
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
              onChange={(e) => q.set({ run: e.target.value, bin: "" })}
            >
              {!r && <option value="">No completed run</option>}
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id.slice(0, 8)} · {D.formatDate(r.started)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>
          Scope: {d.name} · {d.rows.length} records
          {r ? " · " + r.id : " · descriptive inputs only"}
        </p>
      </section>
      <div className="two-columns">
        <section className="card mint">
          <h2>{d.name}</h2>
          <div className="big-number">{d.rows.length}</div>
          <p>synthetic records in this scope</p>
          {r && (
            <p>
              {above} above · {r.results.length - above} below saved threshold{" "}
              {threshold.toFixed(2)}
            </p>
          )}
          <Link className="button" to={"/datasets/" + d.id}>
            Open dataset
          </Link>
        </section>
        <section className="card">
          <h2>Simulated risk distribution</h2>
          {r ? (
            <>
              <div className="bar-chart">
                {bins.map((n, i) => (
                  <button
                    key={i}
                    aria-pressed={selected === String(i)}
                    onClick={() => q.set({ bin: String(i) })}
                    aria-label={`${i * 25} to ${(i + 1) * 25} percent: ${n} records. Select range.`}
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
                  </button>
                ))}
              </div>
              <p role="status">
                {selected === ""
                  ? "All ranges selected"
                  : `${Number(selected) * 25}–${(Number(selected) + 1) * 25}% · ${bins[Number(selected)]} records`}
              </p>
              <div className="button-row">
                <Link
                  className="button primary"
                  to={
                    "/prediction-runs/" +
                    r.id +
                    (selected !== "" ? "?bin=" + selected : "")
                  }
                >
                  Open matching results
                </Link>
                <button
                  onClick={() => q.set({ bin: "" })}
                  disabled={selected === ""}
                >
                  Clear selection
                </button>
              </div>
              <table aria-label="Risk distribution values">
                <thead>
                  <tr>
                    <th>Range</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {bins.map((n, i) => (
                    <tr key={i}>
                      <td>
                        {i * 25}–{(i + 1) * 25}%
                      </td>
                      <td>{n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <>
              <p>
                No completed prediction exists. Input statistics below remain
                available.
              </p>
              <Link className="button" to={"/datasets/" + d.id}>
                Run prediction
              </Link>
            </>
          )}
        </section>
      </div>
      <section className="card">
        <h2>Synthetic input distributions</h2>
        <Table
          name="input distributions"
          data={inputs}
          columns={[
            { key: "field", label: "Input" },
            { key: "value", label: "Value / category" },
            { key: "count", label: "Records" },
            { key: "share", label: "Share (%)" },
          ]}
        />
      </section>
    </>
  );
}

export function Activity({ user, modal, act }: Context) {
  const q = useQuery(),
    kind = q.params.get("type") || "all",
    outcome = q.params.get("outcome") || "all",
    after = q.params.get("after") || "",
    before = q.params.get("before") || "";
  const events = D.authorizedEvents().filter(
    (e) =>
      (kind === "all" || e.type === kind) &&
      (outcome === "all" || e.outcome === outcome) &&
      (!after || e.date.slice(0, 10) >= after) &&
      (!before || e.date.slice(0, 10) <= before),
  );
  return (
    <>
      <Title
        title={
          user.role === "administrator"
            ? "Account activity"
            : "Activity history"
        }
        sub="Meaningful local operations. Raw rows, passwords and private note contents are never logged."
      />
      <section className="card">
        <div className="button-row">
          <label>
            Event type
            <select
              value={kind}
              onChange={(e) => q.set({ type: e.target.value })}
            >
              {(user.role === "administrator"
                ? ["all", "account"]
                : [
                    "all",
                    "import",
                    "prediction",
                    "review",
                    "deleted",
                    "dataset",
                  ]
              ).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Outcome
            <select
              value={outcome}
              onChange={(e) => q.set({ outcome: e.target.value })}
            >
              {["all", "success", "failed", "running"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            On or after (UTC)
            <input
              type="date"
              value={after}
              onChange={(e) => q.set({ after: e.target.value })}
            />
          </label>
          <label>
            On or before (UTC)
            <input
              type="date"
              value={before}
              onChange={(e) => q.set({ before: e.target.value })}
            />
          </label>
          <button
            onClick={() =>
              q.set({ type: "", outcome: "", after: "", before: "" })
            }
          >
            Clear filters
          </button>
        </div>
        <Table
          name="events"
          exportable
          data={events.map((e) => ({ ...e, time: Date.parse(e.date) }))}
          columns={[
            {
              key: "time",
              label: "Timestamp",
              render: (r) => D.formatDate(Number(r.time)),
            },
            { key: "actor", label: "Actor" },
            { key: "text", label: "Operation" },
            {
              key: "object",
              label: "Object",
              render: (r) =>
                String(
                  r.type === "deleted"
                    ? "Dataset deleted: " + (r.object || r.text)
                    : r.object || "Demo workspace",
                ),
            },
            { key: "outcome", label: "Outcome" },
            { key: "id", label: "Reference" },
            {
              key: "details",
              label: "Details",
              sortable: false,
              render: (r) => (
                <button
                  onClick={() => {
                    const e = events.find((e) => e.id === r.id)!;
                    modal({
                      title: "Activity details",
                      variant: "drawer",
                      body: (
                        <>
                          <dl className="detail-list">
                            <dt>Actor</dt>
                            <dd>{e.actor || user.name}</dd>
                            <dt>Operation</dt>
                            <dd>{e.text}</dd>
                            <dt>Outcome</dt>
                            <dd>{e.outcome}</dd>
                            <dt>Object</dt>
                            <dd>
                              {e.type === "deleted"
                                ? "Dataset deleted"
                                : e.object || "Demo workspace"}
                            </dd>
                            <dt>Timestamp</dt>
                            <dd>{D.formatDate(e.date)}</dd>
                            <dt>Reference</dt>
                            <dd>
                              <code>{e.id}</code>
                            </dd>
                          </dl>
                          {D.eventDestination(e) && (
                            <Link
                              className="button"
                              to={D.eventDestination(e)!}
                              onClick={() => modal(null)}
                            >
                              Open object
                            </Link>
                          )}
                          <p>
                            No raw rows, passwords or note text are included.
                          </p>
                        </>
                      ),
                    });
                  }}
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
