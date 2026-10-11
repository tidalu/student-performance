import Papa from "papaparse";
import { get, set } from "idb-keyval";
export const contract = {
  schema: "demo-input-v1",
  model: "demo-rule-v1",
  thresholdVersion: "demo-threshold-v1",
  threshold: 0.5,
  maxBytes: 1048576,
  maxRows: 500,
  previewMs: 1800000,
} as const;
export type Row = {
  record_id: string;
  G1: number;
  failures: number;
  studytime: number;
  schoolsup: string;
};
export type Account = {
  id: string;
  name: string;
  email: string;
  role: string;
  enabled: boolean;
  created?: string;
  credential?: { salt: string; digest: string };
};
export type Dataset = {
  id: string;
  owner: string;
  name: string;
  file: string;
  created: string;
  rows: Row[];
};
export type Run = {
  model?: string;
  schema?: string;
  thresholdVersion?: string;
  threshold?: number;
  requested?: number;
  completed?: number;
  code?: string;
  id: string;
  dataset: string;
  status: "running" | "completed" | "failed";
  started: number;
  finish: number;
  failure: string;
  results: { id: string; risk: number }[];
};
export type Preview = {
  id: string;
  owner: string;
  file: string;
  rows: Row[];
  issues: Issue[];
  expires: number;
  dataset?: string;
};
export type Issue = {
  record_id?: string;
  row: number;
  column: string;
  value: string;
  hint: string;
};
export type Store = {
  version: 1;
  accounts: Account[];
  datasets: Dataset[];
  runs: Run[];
  previews: Preview[];
  reviews: {
    id: string;
    dataset: string;
    record: string;
    owner: string;
    note: string;
    run?: string;
    status: string;
    date: string;
  }[];
  events: {
    type?: string;
    outcome?: "success" | "failed" | "running";
    actor?: string;
    object?: string;
    objectId?: string;
    destination?: string;
    id: string;
    owner: string;
    text: string;
    date: string;
    read: boolean;
  }[];
  outbox: {
    id: string;
    owner: string;
    subject: string;
    category?: string;
    message: string;
    date: string;
  }[];
  preferences: Record<string, { density: string; size: number; zone: string }>;
};
export const uid = () => crypto.randomUUID();
export const risk = (r: Row) =>
  Math.min(
    0.98,
    Math.max(
      0.02,
      0.5 -
        0.04 * (r.G1 - 10) +
        0.1 * r.failures -
        0.035 * (r.studytime - 2) -
        (r.schoolsup === "yes" ? 0.03 : 0),
    ),
  );
export const rows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    record_id: `STU-${String(i + 1).padStart(3, "0")}`,
    G1: 6 + ((i * 7) % 15),
    failures: i % 5 === 0 ? 2 : 0,
    studytime: 1 + (i % 4),
    schoolsup: i % 3 === 0 ? "yes" : "no",
  }));
export function seed(): Store {
  const accounts = [
    ["maya", "Maya Reed", "maya", "teacher"],
    ["noah", "Noah Chen", "noah", "teacher"],
    ["analyst", "Amina Patel", "analyst", "analyst"],
    ["admin", "Alex Morgan", "admin", "administrator"],
    ["disabled", "Disabled teacher", "disabled", "teacher"],
  ].map(([id, name, email, role]) => ({
    id,
    name,
    email: email + "@demo.example",
    role,
    enabled: id !== "disabled",
    created: new Date(Date.now() - 30 * 86400000).toISOString(),
  }));
  const datasets = [24, 80, 120, 36].map((n, i) => ({
    id: `dataset-${i + 1}`,
    owner: i === 3 ? "noah" : "maya",
    name: [
      "First-year mathematics",
      "Introduction to computing",
      "Applied statistics",
      "Research methods",
    ][i],
    file: `semester-${i + 1}.csv`,
    created: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
    rows: rows(n),
  }));
  return {
    version: 1,
    accounts,
    datasets,
    runs: [
      ...datasets.slice(0, 2).map((d, i) => ({
        ...runMetadata(),
        id: `run-${i + 1}`,
        requested: Date.now() - 86400000,
        dataset: d.id,
        status: "completed" as const,
        started: Date.now() - 86400000,
        finish: Date.now() - 86000000,
        failure: "",
        results: d.rows.map((r) => ({ id: r.record_id, risk: risk(r) })),
        completed: Date.now() - 86000000,
      })),
      {
        ...runMetadata(),
        id: "run-failed",
        requested: Date.now() - 7200000,
        dataset: "dataset-3",
        status: "failed",
        started: Date.now() - 7200000,
        finish: Date.now() - 7197000,
        completed: Date.now() - 7197000,
        failure:
          "The simulated prediction service was unavailable. Start a new run when ready.",
        code: "ML_UNAVAILABLE",
        results: [],
      },
    ],
    previews: [],
    reviews: [],
    events: [],
    outbox: [],
    preferences: {},
  };
}
export let db: Store;
export let storageError = "";
export let scenario = "normal";
export let latency = 450;
const listeners = new Set<() => void>();
const update = () => listeners.forEach((fn) => fn());
let savedSnapshot: Store | undefined;
let writes: Promise<void> = Promise.resolve();
export let scenarioState = "No scenario armed";
export let sessionRevision = 0;
export function invalidateSession() {
  sessionRevision++;
}
export function runMetadata() {
  return {
    model: contract.model as string,
    schema: contract.schema as string,
    thresholdVersion: contract.thresholdVersion as string,
    threshold: contract.threshold as number,
    requested: Date.now(),
  };
}
export function consumeScenario(name: string) {
  if (scenario !== name) return false;
  scenario = "normal";
  scenarioState = name + " · consumed";
  update();
  return true;
}
export function assertActor(id: string | undefined) {
  if (!id || current()?.id !== id)
    throw Error("Session changed. This operation was cancelled.");
}
export function config(s: string, l: number) {
  scenario = s;
  scenarioState = s === "normal" ? "No scenario armed" : s + " · armed";
  latency = l;
  update();
}
export function subscribe(f: () => void) {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}
export async function init() {
  try {
    const saved = await get("student-performance-v1");
    db = saved === undefined ? seed() : migrate(validateBackup(saved));
    savedSnapshot = structuredClone(db);
    await persist();
  } catch {
    storageError =
      "Local demo storage could not be read. Restore a valid backup or reset the demo.";
    db = {
      version: 1,
      accounts: [],
      datasets: [],
      runs: [],
      previews: [],
      reviews: [],
      events: [],
      outbox: [],
      preferences: {},
    };
  }
}
export async function persist() {
  const candidate = structuredClone(db);
  const operation = writes.then(async () => {
    try {
      if (consumeScenario("storage failure"))
        throw Error("Simulated browser storage failure");
      await set("student-performance-v1", candidate);
      savedSnapshot = structuredClone(candidate);
    } catch {
      if (savedSnapshot) db = structuredClone(savedSnapshot);
      update();
      throw Error(
        "Browser storage could not save this change. The previous saved state is retained. Free browser storage and retry.",
      );
    }
    update();
  });
  writes = operation.catch(() => {});
  await operation;
}
export function current() {
  const a = db?.accounts.find(
    (a) => a.id === sessionStorage.getItem("persona"),
  );
  return a?.enabled ? a : undefined;
}
export function owned(id: string) {
  const a = current(),
    d = db.datasets.find((d) => d.id === id);
  if (!a) throw Error("Session expired. Sign in to continue.");
  if (!d) throw Error("Dataset not found. It may have been deleted.");
  if (a.role !== "teacher" || d.owner !== a.id)
    throw Error("Forbidden. This dataset belongs to another teacher.");
  return d;
}
export async function delay(operation: string) {
  const actor = current()?.id;
  await new Promise((r) => setTimeout(r, latency));
  if (consumeScenario(operation)) {
    if (current() && operation !== "login") {
      event("Failed " + operation, {
        type:
          operation === "review"
            ? "review"
            : operation === "accounts"
              ? "account"
              : operation === "validate" || operation === "import rollback"
                ? "import"
                : "dataset",
        outcome: "failed",
        object: "Demo operation",
      });
      await persist();
    }
    throw Error(
      `${operation}: simulated service interruption. Your changes were not saved. Retry when ready.`,
    );
  }
  if (operation !== "login" && actor !== current()?.id)
    throw Error("Session changed. The pending operation was cancelled.");
  if (!current() && operation !== "login")
    throw Error("Session expired. Sign in to continue.");
}
const resetRequests = new Map<string, { account: string; expires: number }>();
async function credentialFor(
  password: string,
  salt: string = crypto.randomUUID(),
) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return {
    salt,
    digest: Array.from(new Uint8Array(bits), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join(""),
  };
}
async function passwordMatches(account: Account, password: string) {
  return account.credential
    ? (await credentialFor(password, account.credential.salt)).digest ===
        account.credential.digest
    : password === "DemoOnly!2026";
}
export async function register(name: string, email: string, password: string) {
  const revision = sessionRevision;
  await delay("login");
  const normalized = email.trim().toLowerCase();
  if (!name.trim() || name.trim().length > 80)
    throw Error("Enter a name between 1 and 80 characters.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
    throw Error("Enter a valid demo email.");
  if (password.length < 8)
    throw Error("Use at least 8 characters for your demo password.");
  const credential = await credentialFor(password);
  if (revision !== sessionRevision)
    throw Error("Session changed. Please try again.");
  if (db.accounts.some((a) => a.email.toLowerCase() === normalized))
    throw Error(
      "This email already has a demo account. Sign in or reset its password.",
    );
  const account: Account = {
    id: uid(),
    name: name.trim(),
    email: normalized,
    role: "teacher",
    enabled: true,
    created: new Date().toISOString(),
    credential,
  };
  db.accounts.push(account);
  await persist();
  return account;
}
export async function requestPasswordReset(email: string) {
  await delay("login");
  const account = db.accounts.find(
    (a) => a.enabled && a.email === email.trim().toLowerCase(),
  );
  if (!account) return "";
  for (const [key, request] of resetRequests)
    if (request.account === account.id || request.expires < Date.now())
      resetRequests.delete(key);
  const token = uid();
  resetRequests.set(token, {
    account: account.id,
    expires: Date.now() + 15 * 60000,
  });
  return token;
}
export async function resetPassword(token: string, password: string) {
  await delay("login");
  const request = resetRequests.get(token);
  if (!request || request.expires < Date.now())
    throw Error("This demo reset has expired. Request a new one.");
  if (password.length < 8)
    throw Error("Use at least 8 characters for your demo password.");
  const credential = await credentialFor(password);
  const account = db.accounts.find(
    (a) => a.id === request.account && a.enabled,
  );
  if (!account || resetRequests.get(token) !== request)
    throw Error("This reset is no longer available. Request a new one.");
  account.credential = credential;
  await persist();
  resetRequests.delete(token);
}
export async function googleDemo(accountId: string) {
  const revision = sessionRevision;
  await delay("login");
  const account = db.accounts.find(
    (a) => a.id === accountId && a.enabled && a.role === "teacher",
  );
  if (!account || revision !== sessionRevision)
    throw Error("This demo account is unavailable. Choose another account.");
  sessionStorage.clear();
  sessionStorage.setItem("persona", account.id);
  sessionRevision++;
  update();
  return account;
}
export async function login(email: string, password: string) {
  const revision = sessionRevision;
  await delay("login");
  if (revision !== sessionRevision)
    throw Error(
      "A newer sign-in replaced this request. Try again deliberately.",
    );
  if (consumeScenario("invalid credentials")) {
    throw Error("Email or password is incorrect.");
  }
  const a = db.accounts.find((a) => a.email === email.trim().toLowerCase());
  if (!a || !(await passwordMatches(a, password)))
    throw Error(
      "Email or password is incorrect. Use a documented demo account.",
    );
  if (revision !== sessionRevision)
    throw Error("Session changed. Please try signing in again.");
  if (!a.enabled)
    throw Error("This demo account is disabled. Choose an active account.");
  const drafts = Object.keys(sessionStorage)
    .filter((k) => k.startsWith("draft:" + a.id + ":"))
    .map((k) => [k, sessionStorage.getItem(k)!]);
  sessionStorage.clear();
  drafts.forEach(([k, v]) => sessionStorage.setItem(k, v));
  sessionStorage.setItem("persona", a.id);
  sessionRevision++;
  update();
  return a;
}
export function event(
  text: string,
  details: Partial<Store["events"][number]> = {},
) {
  const actor = current();
  if (!actor) return;
  const type = /account/.test(text)
    ? "account"
    : /review/i.test(text)
      ? "review"
      : /prediction/i.test(text)
        ? "prediction"
        : /deleted/i.test(text)
          ? "deleted"
          : /import/i.test(text)
            ? "import"
            : "dataset";
  db.events.unshift({
    id: uid(),
    owner: actor.id,
    actor: actor.name,
    text,
    date: new Date().toISOString(),
    read: false,
    type,
    outcome: /started/i.test(text) ? "running" : "success",
    ...details,
  });
}
export function authorizedEvents() {
  const a = current();
  return db.events.filter(
    (e) =>
      e.owner === a?.id &&
      (a?.role !== "administrator" || e.type === "account"),
  );
}
export function eventDestination(e: Store["events"][number]) {
  const a = current();
  if (!a || e.owner !== a.id) return undefined;
  if (e.type === "account")
    return a.role === "administrator" ? "/admin/accounts" : undefined;
  const d = db.datasets.find((d) => d.id === e.objectId && d.owner === a.id);
  return d ? e.destination || "/datasets/" + d.id : undefined;
}
export const headers = [
  "record_id",
  "G1",
  "failures",
  "studytime",
  "schoolsup",
];
export function parse(text: string): { rows: Row[]; issues: Issue[] } {
  const result = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  });
  const h = (result.data.shift() || []).map((x) => x.trim());
  const issues: Issue[] = result.errors.map((e) => ({
    row: (e.row || 0) + 2,
    column: "CSV",
    value: "",
    hint: e.message,
  }));
  if (
    h.length !== 5 ||
    new Set(h).size !== 5 ||
    headers.some((k) => !h.includes(k))
  )
    issues.push({
      row: 1,
      column: "Headers",
      value: h.join(","),
      hint: "Use exactly: " + headers.join(", "),
    });
  if (!result.data.length)
    issues.push({
      row: 2,
      column: "Rows",
      value: "0",
      hint: "Include at least one record.",
    });
  if (result.data.length > contract.maxRows)
    issues.push({
      row: 502,
      column: "Rows",
      value: String(result.data.length),
      hint: "Maximum 500 records.",
    });
  const seen = new Set<string>();
  const parsed = result.data.map((v, i) => {
    const obj = Object.fromEntries(h.map((k, j) => [k, (v[j] ?? "").trim()]));
    if (v.length !== h.length)
      issues.push({
        row: i + 2,
        column: "CSV",
        value: String(v.length),
        hint: "Field count must match header.",
      });
    for (const k of headers) {
      const val = obj[k] || "";
      let valid = true;
      let hint = "";
      if (k === "record_id") {
        valid = !!val && !seen.has(val);
        hint = "Provide a non-empty, unique pseudonymous ID.";
        seen.add(val);
      } else if (k === "schoolsup") {
        valid = ["yes", "no"].includes(val);
        hint = "Use yes or no.";
      } else {
        const [min, max] =
          k === "G1" ? [0, 20] : k === "failures" ? [0, 4] : [1, 4];
        valid = /^\d+$/.test(val) && +val >= min && +val <= max;
        hint = `Use an integer from ${min} to ${max}.`;
      }
      if (!valid)
        issues.push({
          row: i + 2,
          record_id: obj.record_id,
          column: k,
          value: val,
          hint,
        });
    }
    return {
      ...obj,
      G1: +obj.G1,
      failures: +obj.failures,
      studytime: +obj.studytime,
    } as Row;
  });
  return { rows: parsed, issues };
}
export async function preview(
  file: File,
  signal?: AbortSignal,
  stage?: (s: string) => void,
): Promise<Preview> {
  const actor = current()?.id;
  stage?.("Checking file…");
  await delay("validate");
  signal?.throwIfAborted();
  if (file.size > contract.maxBytes)
    throw Error("File exceeds the 1 MB limit.");
  if (!file.name.toLowerCase().endsWith(".csv"))
    throw Error("Choose a CSV file.");
  stage?.("Reading and parsing CSV…");
  const text = await file.text();
  signal?.throwIfAborted();
  assertActor(actor);
  stage?.("Validating rows…");
  const p = {
    id: uid(),
    owner: actor!,
    file: file.name,
    ...parse(text),
    expires: Date.now() + contract.previewMs,
  };
  db.previews = db.previews.filter((x) => x.dataset || x.expires > Date.now());
  db.previews.push(p);
  await persist();
  return p;
}
export async function discardPreview(id: string) {
  const p = db.previews.find((p) => p.id === id);
  if (!p || p.owner !== current()?.id) throw Error("Preview unavailable.");
  if (p.dataset) return;
  db.previews = db.previews.filter((p) => p.id !== id);
  await persist();
}
export async function confirmImport(id: string) {
  const p = db.previews.find((p) => p.id === id);
  if (!p || p.owner !== current()?.id)
    throw Error("Preview unavailable or forbidden. Upload again.");
  if (p.dataset) return p.dataset;
  if (p.expires < Date.now())
    throw Error("Preview expired. Upload the file again.");
  if (p.issues.length)
    throw Error("Correct validation errors before importing.");
  await delay("import rollback");
  if (p.dataset) return p.dataset;
  if (p.expires < Date.now()) throw Error("Preview expired. Upload again.");
  const d: Dataset = {
    id: uid(),
    owner: p.owner,
    name: p.file.replace(/\.csv$/i, ""),
    file: p.file,
    created: new Date().toISOString(),
    rows: p.rows,
  };
  db.datasets.push(d);
  p.dataset = d.id;
  event("Imported " + d.name, {
    object: d.name,
    objectId: d.id,
    destination: "/datasets/" + d.id,
  });
  await persist();
  if (consumeScenario("uncertain import")) {
    throw Error(
      "Confirmation response interrupted. Check import status before proceeding.",
    );
  }
  return d.id;
}
export async function startRun(id: string) {
  const d = owned(id);
  const existing = db.runs.find(
    (r) => r.dataset === id && r.status === "running",
  );
  if (existing) return existing;
  await delay("start prediction");
  const inFlight = db.runs.find(
    (r) => r.dataset === id && r.status === "running",
  );
  if (inFlight) return inFlight;
  const interrupted = scenario === "connection loss";
  const failure = [
    "ML unavailable",
    "malformed predictions",
    "schema mismatch",
    "model mismatch",
    "duplicate IDs",
    "missing IDs",
    "out of range",
  ].includes(scenario)
    ? scenario
    : "";
  const r: Run = {
    ...runMetadata(),
    id: uid(),
    dataset: id,
    status: "running",
    started: Date.now(),
    finish: Date.now() + (scenario === "slow prediction" ? 12000 : 2200),
    failure,
    results: [],
  };
  if (scenario !== "normal") consumeScenario(scenario);
  if (interrupted) sessionStorage.setItem("interrupted-run", r.id);
  db.runs.unshift(r);
  event("Prediction started for " + d.name, {
    object: d.name,
    objectId: d.id,
    destination: "/prediction-runs/" + r.id,
  });
  await persist();
  return r;
}
export function validateResults(
  input: { id: string; risk: number }[],
  expected: Row[],
) {
  if (
    input.length !== expected.length ||
    new Set(input.map((x) => x.id)).size !== expected.length ||
    input.some(
      (x) =>
        !expected.some((row) => row.record_id === x.id) ||
        !Number.isFinite(x.risk) ||
        x.risk < 0 ||
        x.risk > 1,
    )
  )
    throw Error(
      "Malformed prediction response: matching unique IDs and finite risk values in [0,1] are required.",
    );
  return input;
}
export async function resolveRuns() {
  if (!db) return;
  let changed = false;
  for (const r of db.runs) {
    if (r.status === "running" && Date.now() >= r.finish) {
      const d = db.datasets.find((d) => d.id === r.dataset);
      if (!d) continue;
      r.status = r.failure ? "failed" : "completed";
      try {
        const result = d.rows.map((row) => ({
          id: row.record_id,
          risk: risk(row),
        }));
        if (r.failure === "malformed predictions") result[0].risk = NaN;
        if (r.failure === "duplicate IDs") result[1].id = result[0].id;
        if (r.failure === "missing IDs") result.pop();
        if (r.failure === "out of range") result[0].risk = 1.3;
        validateEnvelope({
          model:
            r.failure === "model mismatch"
              ? "unsupported"
              : r.model || contract.model,
          schema:
            r.failure === "schema mismatch"
              ? "unsupported"
              : r.schema || contract.schema,
        });
        r.results =
          r.failure === "ML unavailable" ? [] : validateResults(result, d.rows);
      } catch (e) {
        r.status = "failed";
        r.failure = (e as Error).message;
        r.results = [];
      }
      r.completed = Date.now();
      r.code =
        r.status === "failed"
          ? r.failure === "ML unavailable"
            ? "ML_UNAVAILABLE"
            : "INVALID_RESPONSE"
          : undefined;
      db.events.unshift({
        type: "prediction",
        actor: "Demo prediction service",
        object: d.name,
        objectId: d.id,
        destination: "/prediction-runs/" + r.id,
        outcome: r.status === "failed" ? "failed" : "success",
        id: uid(),
        owner: d.owner,
        text: `Prediction ${r.status} for ${d.name}`,
        date: new Date().toISOString(),
        read: false,
      });
      changed = true;
    }
  }
  if (changed) await persist();
}
export async function deleteDataset(id: string) {
  const d = owned(id);
  if (db.runs.some((r) => r.dataset === id && r.status === "running"))
    throw Error(
      "A prediction is running. Wait for completion before deleting.",
    );
  await delay("delete");
  if (db.runs.some((r) => r.dataset === id && r.status === "running"))
    throw Error(
      "A prediction is running. Wait for completion before deleting.",
    );
  db.datasets = db.datasets.filter((x) => x.id !== id);
  db.runs = db.runs.filter((x) => x.dataset !== id);
  db.reviews = db.reviews.filter((x) => x.dataset !== id);
  event("Dataset deleted: " + d.name, { object: d.name, objectId: d.id });
  await persist();
}
export function formatDate(value: string | number) {
  return new Date(value).toLocaleString("en-GB", {
    timeZone: db.preferences[current()?.id || ""]?.zone || "Europe/Warsaw",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function csv(data: Record<string, unknown>[]) {
  return Papa.unparse(
    data.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [
          k,
          typeof v === "string" && /^[=+@\-\t\r]/.test(v) ? "'" + v : v,
        ]),
      ),
    ),
  );
}
export function download(
  name: string,
  content: string,
  type = "text/csv;charset=utf-8",
) {
  if (consumeScenario("download")) {
    throw Error("Download preparation failed. Retry.");
  }
  const url = URL.createObjectURL(new Blob(["\uFEFF" + content], { type }));
  const a = document.createElement("a");
  a.style.display = "none";
  document.body.appendChild(a);
  a.href = url;
  a.download = name;
  a.click();
  a.remove();
  preparedDownloads.unshift({ name, url, owner: current()?.id });
  while (preparedDownloads.length > 5) {
    const old = preparedDownloads.pop();
    if (old) URL.revokeObjectURL(old.url);
  }
  setTimeout(() => dismissDownload(url), 300000);
  update();
}
export const preparedDownloads: {
  name: string;
  url: string;
  owner?: string;
}[] = [];
export function dismissDownload(url: string) {
  const i = preparedDownloads.findIndex((d) => d.url === url);
  if (i >= 0) {
    URL.revokeObjectURL(url);
    preparedDownloads.splice(i, 1);
    update();
  }
}
export function fixture(name: string) {
  let text = csv(rows(name.includes("too-many") ? 501 : 12));
  if (name.includes("semicolon")) text = text.replaceAll(",", ";");
  if (name.includes("quoted")) text = text.replace("STU-001", '"STU-001"');
  if (name.includes("invalid"))
    text = text
      .replace("STU-001,6", "STU-001,30")
      .replace("STU-002,13", "STU-001,")
      .replace(",3,no", ",8,maybe");
  if (name.includes("missing"))
    text = text
      .split("\r\n")
      .map((l) => l.split(",").slice(0, 4).join(","))
      .join("\r\n");
  if (name.includes("unknown")) text = text.replace("schoolsup", "unsupported");
  if (name.includes("empty")) text = headers.join(",");
  if (name.includes("oversized")) text += "\n" + "x".repeat(1048576);
  return text;
}
export function validateBackup(value: unknown): Store {
  const s = value as Store;
  if (
    !s ||
    s.version !== 1 ||
    ![
      "accounts",
      "datasets",
      "runs",
      "previews",
      "reviews",
      "events",
      "outbox",
    ].every((k) =>
      Array.isArray((s as unknown as Record<string, unknown>)[k]),
    ) ||
    !s.preferences
  )
    throw Error(
      "Unsupported or corrupt prototype backup. Existing data preserved.",
    );
  const lists = [
    s.accounts,
    s.datasets,
    s.runs,
    s.previews,
    s.reviews,
    s.events,
    s.outbox,
  ];
  for (const list of lists) {
    const unique = new Set<string>();
    for (const item of list) {
      if (
        !item ||
        typeof item.id !== "string" ||
        !item.id ||
        unique.has(item.id)
      )
        throw Error("Backup has missing or duplicate IDs.");
      unique.add(item.id);
    }
  }
  const emails = new Set<string>();
  for (const a of s.accounts) {
    if (typeof a.email !== "string" || emails.has(a.email.toLowerCase()))
      throw Error("Invalid duplicate email.");
    emails.add(a.email.toLowerCase());
  }
  const ids = new Set<string>();
  for (const a of s.accounts) {
    if (
      !a.id ||
      ids.has(a.id) ||
      !a.name ||
      !a.email ||
      !["teacher", "analyst", "administrator"].includes(a.role) ||
      typeof a.enabled !== "boolean"
    )
      throw Error("Invalid account in backup.");
    if (
      a.credential &&
      (typeof a.credential.salt !== "string" ||
        !a.credential.salt ||
        !/^[a-f0-9]{64}$/.test(a.credential.digest))
    )
      throw Error("Invalid demo credential in backup.");
    ids.add(a.id);
  }
  if (!s.accounts.some((a) => a.role === "administrator" && a.enabled))
    throw Error("Backup needs an active administrator.");
  for (const d of s.datasets) {
    if (
      !ids.has(d.owner) ||
      !d.id ||
      !d.name ||
      !Number.isFinite(Date.parse(d.created)) ||
      typeof d.file !== "string" ||
      !Array.isArray(d.rows) ||
      parse(csv(d.rows)).issues.length
    )
      throw Error("Invalid dataset in backup.");
  }
  for (const r of s.runs) {
    const d = s.datasets.find((d) => d.id === r.dataset);
    if (
      !d ||
      !["running", "completed", "failed"].includes(r.status) ||
      !Array.isArray(r.results) ||
      !Number.isFinite(r.started) ||
      !Number.isFinite(r.finish) ||
      (r.threshold !== undefined &&
        (!Number.isFinite(r.threshold) ||
          r.threshold < 0 ||
          r.threshold > 1)) ||
      (r.schema !== undefined && r.schema !== contract.schema) ||
      (r.model !== undefined && r.model !== contract.model) ||
      r.results.some(
        (x) => !Number.isFinite(x.risk) || x.risk < 0 || x.risk > 1,
      ) ||
      (r.status === "completed" &&
        (r.results.length !== d.rows.length ||
          new Set(r.results.map((x) => x.id)).size !== d.rows.length ||
          r.results.some((x) => !d.rows.some((row) => row.record_id === x.id))))
    )
      throw Error("Invalid run in backup.");
  }
  for (const r of s.reviews)
    if (
      !["Not reviewed", "Needs review", "Reviewed"].includes(r.status) ||
      typeof r.note !== "string" ||
      r.note.length < 5 ||
      r.note.length > 1000 ||
      !Number.isFinite(Date.parse(r.date)) ||
      (r.run &&
        !s.runs.some((run) => run.id === r.run && run.dataset === r.dataset)) ||
      !s.datasets.some((d) => d.id === r.dataset && d.owner === r.owner) ||
      !ids.has(r.owner) ||
      !s.datasets.some(
        (d) =>
          d.id === r.dataset &&
          d.rows.some((row) => row.record_id === r.record),
      )
    )
      throw Error("Invalid review reference.");
  for (const p of s.previews) {
    if (
      !ids.has(p.owner) ||
      !Array.isArray(p.rows) ||
      !Array.isArray(p.issues) ||
      typeof p.expires !== "number" ||
      !Number.isFinite(p.expires) ||
      typeof p.file !== "string"
    )
      throw Error("Invalid preview in backup.");
    if (p.dataset && typeof p.dataset !== "string")
      throw Error("Invalid consumed preview.");
  }
  for (const e of s.events) {
    if (
      !ids.has(e.owner) ||
      typeof e.text !== "string" ||
      typeof e.read !== "boolean" ||
      !Number.isFinite(Date.parse(e.date))
    )
      throw Error("Invalid activity in backup.");
  }
  for (const o of s.outbox) {
    if (
      !ids.has(o.owner) ||
      typeof o.subject !== "string" ||
      typeof o.message !== "string" ||
      !Number.isFinite(Date.parse(o.date))
    )
      throw Error("Invalid feedback in backup.");
  }
  for (const [id, p] of Object.entries(s.preferences)) {
    if (
      !ids.has(id) ||
      !p ||
      !["comfortable", "compact"].includes(p.density) ||
      ![10, 25, 50].includes(p.size) ||
      !["Europe/Warsaw", "UTC"].includes(p.zone)
    )
      throw Error("Invalid preferences in backup.");
  }
  return s;
}
export async function restore(s: Store) {
  const candidate = migrate(validateBackup(s));
  db = candidate;
  await persist();
  storageError = "";
  sessionStorage.clear();
  sessionRevision++;
  update();
}
export async function saveAccount(account: Account) {
  if (current()?.role !== "administrator")
    throw Error("Administrator access required.");
  if (!account.name.trim() || !/^\S+@\S+\.example$/.test(account.email))
    throw Error("Use a full name and synthetic .example email.");
  const a = db.accounts.find((x) => x.id === account.id);
  if (
    db.accounts.some(
      (x) =>
        x.id !== account.id && x.email === account.email.trim().toLowerCase(),
    )
  )
    throw Error("Email already exists.");
  if (
    a?.role === "administrator" &&
    a.enabled &&
    (!account.enabled || account.role !== "administrator") &&
    db.accounts.filter((x) => x.role === "administrator" && x.enabled)
      .length === 1
  )
    throw Error("The last active administrator cannot be disabled or demoted.");
  account.credential = a?.credential;
  account.created = a?.created || new Date().toISOString();
  await delay("accounts");
  if (current()?.role !== "administrator")
    throw Error("Administrator access required.");
  if (
    db.accounts.some(
      (x) =>
        x.id !== account.id && x.email === account.email.trim().toLowerCase(),
    )
  )
    throw Error("Email already exists.");
  event((a ? "Updated" : "Created") + " demo account " + account.name, {
    type: "account",
    object: account.name,
    objectId: account.id,
    destination: "/admin/accounts",
  });
  if (a) db.accounts = db.accounts.map((x) => (x.id === a.id ? account : x));
  else db.accounts.push(account);
  await persist();
}
export async function saveReview(item: Store["reviews"][number]) {
  const d = owned(item.dataset);
  if (
    item.owner !== current()?.id ||
    !d.rows.some((r) => r.record_id === item.record)
  )
    throw Error("Forbidden review.");
  if (
    item.run &&
    !db.runs.some((r) => r.id === item.run && r.dataset === item.dataset)
  )
    throw Error("Associated prediction does not belong to this dataset.");
  if (item.note.trim().length < 5 || item.note.length > 1000)
    throw Error("Write a note between 5 and 1,000 characters.");
  await delay("review");
  owned(item.dataset);
  const exists = db.reviews.find((x) => x.id === item.id);
  if (exists && exists.owner !== current()?.id)
    throw Error("Forbidden review.");
  if (exists) db.reviews = db.reviews.map((x) => (x.id === item.id ? item : x));
  else db.reviews.push(item);
  event("Saved review for " + item.record, {
    object: d.name + " / " + item.record,
    objectId: d.id,
    destination:
      "/datasets/" + d.id + "/records/" + encodeURIComponent(item.record),
  });
  await persist();
}

export function migrate(state: Store): Store {
  state.runs.forEach((r) =>
    Object.assign(r, {
      ...runMetadata(),
      ...r,
      requested: r.requested ?? r.started,
      completed: r.completed ?? (r.status !== "running" ? r.finish : undefined),
    }),
  );
  state.accounts.forEach(
    (a) =>
      (a.created ||=
        state.datasets.find((d) => d.owner === a.id)?.created ||
        new Date(0).toISOString()),
  );
  state.events.forEach((e) => {
    e.type ||= /account/.test(e.text)
      ? "account"
      : /review/i.test(e.text)
        ? "review"
        : /prediction/i.test(e.text)
          ? "prediction"
          : /deleted/i.test(e.text)
            ? "deleted"
            : "import";
    e.actor ||=
      state.accounts.find((a) => a.id === e.owner)?.name || "Demo service";
    e.outcome ||= /failed/i.test(e.text)
      ? "failed"
      : /started/i.test(e.text)
        ? "running"
        : "success";
  });
  return state;
}
export function validateEnvelope(value: { model: string; schema: string }) {
  if (value.schema !== contract.schema)
    throw Error(
      "SCHEMA_MISMATCH: Unsupported response schema. No results were saved.",
    );
  if (value.model !== contract.model)
    throw Error(
      "MODEL_MISMATCH: Unsupported response model. No results were saved.",
    );
}
export function ownedDatasets() {
  const a = current();
  return db.datasets.filter((d) => a?.role === "teacher" && d.owner === a.id);
}
export function datasetRuns(id: string) {
  owned(id);
  return db.runs
    .filter((r) => r.dataset === id)
    .sort((a, b) => b.started - a.started);
}
export function runResults(run: Run, selection = "all", bin = "") {
  const d = owned(run.dataset),
    threshold = run.threshold ?? contract.threshold;
  return run.results
    .filter(
      (r) =>
        (selection === "all" ||
          (selection === "above" ? r.risk >= threshold : r.risk < threshold)) &&
        (bin === "" || Math.min(3, Math.floor(r.risk * 4)) === Number(bin)),
    )
    .map((r) => ({
      ...d.rows.find((row) => row.record_id === r.id)!,
      id: r.id,
      risk: r.risk,
      label:
        r.risk >= threshold ? "Above demo threshold" : "Below demo threshold",
    }));
}
export const fieldRules: Record<string, string> = {
  record_id: "Unique non-empty string",
  G1: "Integer 0–20",
  failures: "Integer 0–4",
  studytime: "Integer category 1–4",
  schoolsup: "yes or no",
};
export function fieldDistribution(d: Dataset, field: string) {
  const counts = new Map<string, number>();
  d.rows.forEach((r) => {
    const v = String(r[field as keyof Row] ?? "");
    counts.set(v, (counts.get(v) || 0) + 1);
  });
  return [...counts].map(([value, count]) => ({
    value,
    count,
    share: Number(((count / d.rows.length) * 100).toFixed(1)),
  }));
}
export function qualitySummary(d: Dataset) {
  const observations = headers.map((field) => {
    const values = d.rows.map((r) => r[field as keyof Row]);
    return {
      field,
      allowed: fieldRules[field],
      missing: values.filter((v) => v == null || String(v).trim() === "")
        .length,
      observed:
        field === "record_id"
          ? new Set(values).size + " unique IDs"
          : field === "schoolsup"
            ? [...new Set(values)].join(", ")
            : Math.min(...values.map(Number)) +
              "–" +
              Math.max(...values.map(Number)),
    };
  });
  return {
    dataset: d.id,
    name: d.name,
    schema: contract.schema,
    records: d.rows.length,
    duplicateIds: d.rows.length - new Set(d.rows.map((r) => r.record_id)).size,
    completeness:
      100 *
      (1 -
        observations.reduce((n, x) => n + x.missing, 0) /
          (d.rows.length * headers.length)),
    issues: parse(csv(d.rows)).issues.length,
    observations,
  };
}
export function reviewStatus(dataset: string, record: string) {
  return (
    db.reviews
      .filter((r) => r.dataset === dataset && r.record === record)
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]?.status ||
    "Not reviewed"
  );
}
export function safeReturn(
  value: string | null | undefined,
  account: Account,
  full = true,
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return undefined;
  const path = value.split(/[?#]/)[0];
  if (
    path === "/" ||
    path === "/help" ||
    path.startsWith("/evaluations/") ||
    (path === "/settings" && full)
  )
    return value;
  if (
    account.role === "teacher" &&
    (/^\/(datasets|imports|prediction-runs)(\/|$)/.test(path) ||
      (full && ["/analytics", "/activity"].includes(path)))
  )
    return value;
  if (
    account.role === "administrator" &&
    full &&
    ["/admin/accounts", "/activity"].includes(path)
  )
    return value;
  return undefined;
}
export type EvaluationArtifact = {
  version: string;
  date: string;
  population: string;
  count: number;
  positive: string;
  threshold: number;
  selected: string;
  matrix: number[];
  comparison: { model: string; accuracy: number }[];
};
export function evaluationFixture(version: string): EvaluationArtifact {
  if (!["demo-eval-v1", "one-class"].includes(version))
    throw Error("Evaluation not found. Choose an available fixture.");
  return {
    version,
    date: "2026-10-01T12:00:00Z",
    population: "Test",
    count: 100,
    positive: "Demo academic-risk flag",
    threshold: contract.threshold,
    selected: "Random forest",
    matrix: version === "one-class" ? [0, 0, 0, 100] : [32, 8, 12, 48],
    comparison: [
      { model: "Dummy baseline", accuracy: 0.6 },
      { model: "Logistic regression", accuracy: 0.76 },
      { model: "Random forest", accuracy: 0.81 },
    ],
  };
}
export async function readEvaluation(version: string) {
  await delay("evaluation unavailable");
  return evaluationFixture(version);
}
export async function readWorkspace() {
  await delay("read workspace");
}
export function exportMetadata() {
  const path = location.pathname;
  const run = path.startsWith("/prediction-runs/")
    ? db.runs.find((r) => r.id === path.split("/")[2])
    : undefined;
  const d = run
    ? db.datasets.find((d) => d.id === run.dataset)
    : path.startsWith("/datasets/")
      ? db.datasets.find((d) => d.id === path.split("/")[2])
      : undefined;
  return {
    synthetic: true,
    dataset: d?.name || "",
    dataset_id: d?.id || "",
    run_id: run?.id || "",
    schema: run?.schema || contract.schema,
    model: run?.model || "",
    threshold_version: run?.thresholdVersion || "",
    threshold: run?.threshold ?? "",
  };
}
