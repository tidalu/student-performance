import React, { useEffect, useState } from "react";
import * as D from "../domain";
import type { Context } from "../types";
import { FormMessage } from "../ui";
import { Dialog } from "../components";
import { notify } from "../notifications";

export const helpTopics = [
  [
    "Getting started",
    "Import → Preview → Predict → Review. Download a sample, select that saved CSV, validate its actual rows, confirm once, run a simulated prediction and inspect results after refresh.",
  ],
  [
    "CSV requirements",
    `Maximum ${D.contract.maxBytes / 1048576} MB and ${D.contract.maxRows} records. Comma and semicolon delimiters are detected. Quoted fields, UTF-8 BOM and CRLF are supported. Use exactly record_id,G1,failures,studytime,schoolsup in any order. No unknown, missing or duplicate headers.`,
  ],
  [
    "Prediction limitations",
    "demo-rule-v1 = clamp(0.50 − 0.04(G1−10) + 0.10 failures − 0.035(studytime−2) − 0.03 when schoolsup=yes, 0.02, 0.98). This is an invented deterministic UI simulator, not trained educational ML. Threshold 0.50 is saved with each run. No causal prescriptions are made.",
  ],
  [
    "Model evaluation",
    "Evaluation uses separate synthetic confusion-matrix fixtures. The binary test fixture has TP 32, FN 8, FP 12, TN 48: accuracy 80%, precision 72.7%, recall 80%, F1 76.2%, specificity 80%. The validation model-comparison table is separate from this test population. Undefined metrics explain their zero denominator; no ROC-AUC is inferred.",
  ],
  [
    "Common errors and recovery",
    "Invalid CSV: use the row/column hints and re-upload. Missing/extra headers: use the schema guide. Preview expired: validate a fresh upload. Consumed preview: open its imported dataset; if deleted, start a fresh upload. Uncertain import: Check import status before retrying. Interrupted prediction: check the saved run ID; do not create a replacement silently. Failed prediction: start a deliberate new run. Forbidden: switch to the owning teacher. Missing object: return to the dataset list. Browser save failure: previous saved state is retained; free storage and retry. Corrupt backup: current state is preserved; choose a supported prototype backup.",
  ],
  [
    "Demo accounts",
    "maya@demo.example and noah@demo.example are separate teachers. analyst@demo.example sees aggregate evaluation; admin@demo.example manages accounts without student-row access. disabled@demo.example demonstrates denied login. Seed and administrator-created accounts use DemoOnly!2026 unless reset. Self-registered accounts use their chosen demo password. Registration creates teachers only. Forgot password opens a local demo inbox; Continue with Google previews a synthetic chooser without contacting Google. Never use real credentials.",
  ],
  [
    "Core and Full modes",
    "Core contains sign-in, import, datasets, basic run history, predictions, evaluation and help. Full adds reviews, quality, analytics, activity, accounts, preferences and exports. Optional prototype designs are not mandatory course commitments.",
  ],
  [
    "Local storage and backups",
    "Confirmed datasets, runs, reviews, events, accounts, outbox and preferences stay in this browser's versioned IndexedDB. Previews expire after 30 minutes; expired unconsumed previews are cleaned on the next upload. Export a prototype backup before Reset. Restore validates the whole file and downloads a backup of current data before replacing it. Files are not sent to a server.",
  ],
  [
    "Feedback",
    "Feedback is saved to a persona-local demo outbox with a reference and timestamp. No email is sent. Open the outbox to view, download or delete items. A failed save leaves your draft editable for a deliberate retry.",
  ],
] as const;
const schema = `Synthetic prototype schema ${D.contract.schema}\nLimits: 1 MB, 500 rows. UTF-8 comma or semicolon CSV. Required columns in any order.\n${Object.entries(
  D.fieldRules,
)
  .map(([k, v]) => k + ": " + v)
  .join(
    "\n",
  )}\n\nrecord_id,G1,failures,studytime,schoolsup\nSTU-001,14,0,3,yes\n\nStrict entire-file validation. Equal IDs in separate datasets remain separate identities. No mapping wizard. Use synthetic data only.`;
export const guideDownloads = {
  schema,
  troubleshooting:
    "Student Performance · synthetic prototype troubleshooting\n\n" +
    helpTopics
      .filter((t) => /errors|storage|accounts/i.test(t[0]))
      .map((t) => t.join("\n"))
      .join("\n\n"),
  guide:
    "Student Performance · synthetic prototype user guide\n\n" +
    helpTopics.map((t) => t.join("\n")).join("\n\n") +
    "\n\n" +
    schema,
};
export function Outbox({
  user,
  act,
}: {
  user: D.Account;
  act: Context["act"];
}) {
  const [, refresh] = useState(0),
    [selected, setSelected] = useState(""),
    [deleting, setDeleting] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => D.subscribe(() => refresh((n) => n + 1)), []);
  const items = D.db.outbox.filter((o) => o.owner === user.id),
    item = items.find((o) => o.id === selected);
  return (
    <>
      <p>Feedback saved locally for {user.name}. No email was sent.</p>
      <FormMessage error={error} />
      {item ? (
        <article>
          <button onClick={() => setSelected("")}>Back to outbox</button>
          <h3>{item.subject}</h3>
          <p>{item.message}</p>
          <dl className="detail-list">
            <dt>Category</dt>
            <dd>{item.category}</dd>
            <dt>Reference</dt>
            <dd>
              <code>{item.id}</code>
            </dd>
            <dt>Saved</dt>
            <dd>{D.formatDate(item.date)}</dd>
          </dl>
        </article>
      ) : items.length ? (
        items.map((o) => (
          <article className="review-note" key={o.id}>
            <strong>{o.subject}</strong>
            <small>
              {o.category} · {D.formatDate(o.date)} · {o.id.slice(0, 8)}
            </small>
            <div className="button-row">
              <button onClick={() => setSelected(o.id)}>View</button>
              <button
                onClick={() => {
                  try {
                    D.download(
                      "feedback-" + o.id + ".json",
                      JSON.stringify(
                        { synthetic: true, noEmailSent: true, ...o },
                        null,
                        2,
                      ),
                      "application/json",
                    );
                    notify("Feedback download prepared.");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Download
              </button>
              <button className="danger-text" onClick={() => setDeleting(o.id)}>
                Delete
              </button>
            </div>
            {deleting === o.id && (
              <section
                className="notice"
                role="group"
                aria-label="Confirm feedback deletion"
              >
                <p>
                  Delete “{o.subject}” permanently? This affects only this local
                  outbox item.
                </p>
                <button
                  autoFocus
                  disabled={busy}
                  onClick={() => setDeleting("")}
                >
                  Cancel deletion
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      D.assertActor(user.id);
                      await D.delay("delete feedback");
                      D.db.outbox = D.db.outbox.filter((x) => x.id !== o.id);
                      await D.persist();
                      setDeleting("");
                      notify("Feedback deleted.");
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Delete feedback
                </button>
              </section>
            )}
          </article>
        ))
      ) : (
        <p>No feedback saved yet.</p>
      )}
    </>
  );
}
