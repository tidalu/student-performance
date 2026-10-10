import Papa from "papaparse";
import { get, set } from "idb-keyval";
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
    runs: datasets.slice(0, 2).map((d, i) => ({
      id: `run-${i + 1}`,
      dataset: d.id,
      status: "completed",
      started: Date.now() - 86400000,
      finish: Date.now() - 86000000,
      failure: "",
      results: d.rows.map((r) => ({ id: r.record_id, risk: risk(r) })),
    })),
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
let update = () => {};
export function config(s: string, l: number) {
  scenario = s;
  latency = l;
}
export function subscribe(f: () => void) {
  update = f;
  return () => {
    update = () => {};
  };
}
export async function init() {
  try {
    const saved = await get("student-performance-v1");
    db = saved === undefined ? seed() : validateBackup(saved);
    await persist();
  } catch {
    storageError =
      "Local demo storage could not be read. Restore a valid backup or reset the demo.";
    db = seed();
  }
}
export async function persist() {
  await set("student-performance-v1", db);
  update();
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
  if (scenario === operation) {
    scenario = "normal";
    update();
    throw Error(
      `${operation}: simulated service interruption. Your changes were not saved. Retry when ready.`,
    );
  }
  if (operation !== "login" && actor !== current()?.id)
    throw Error("Session changed. The pending operation was cancelled.");
  if (!current() && operation !== "login")
    throw Error("Session expired. Sign in to continue.");
}
export async function login(email: string, password: string) {
  await delay("login");
  if (scenario === "invalid credentials") {
    scenario = "normal";
    throw Error("Email or password is incorrect.");
  }
  const a = db.accounts.find((a) => a.email === email.trim().toLowerCase());
  if (!a || password !== "DemoOnly!2026")
    throw Error(
      "Email or password is incorrect. Use a documented demo account.",
    );
  if (!a.enabled)
    throw Error("This demo account is disabled. Choose an active account.");
  sessionStorage.clear();
  sessionStorage.setItem("persona", a.id);
  update();
  return a;
}
export function event(text: string) {
  db.events.unshift({
    id: uid(),
    owner: current()!.id,
    text,
    date: new Date().toISOString(),
    read: false,
  });
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
  if (result.data.length > 500)
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
      if (!valid) issues.push({ row: i + 2, column: k, value: val, hint });
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
export async function preview(file: File): Promise<Preview> {
  await delay("validate");
  if (file.size > 1048576) throw Error("File exceeds the 1 MB limit.");
  if (!file.name.toLowerCase().endsWith(".csv"))
    throw Error("Choose a CSV file.");
  const p = {
    id: uid(),
    owner: current()!.id,
    file: file.name,
    ...parse(await file.text()),
    expires: Date.now() + 1800000,
  };
  db.previews = db.previews.filter((x) => x.dataset || x.expires > Date.now());
  db.previews.push(p);
  await persist();
  return p;
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
  event("Imported " + d.name);
  await persist();
  if (scenario === "uncertain import") {
    scenario = "normal";
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
  const failure = ["ML unavailable", "malformed predictions"].includes(scenario)
    ? scenario
    : "";
  const r: Run = {
    id: uid(),
    dataset: id,
    status: "running",
    started: Date.now(),
    finish: Date.now() + (scenario === "slow prediction" ? 12000 : 2200),
    failure,
    results: [],
  };
  scenario = "normal";
  if (interrupted) sessionStorage.setItem("interrupted-run", r.id);
  db.runs.unshift(r);
  event("Prediction started for " + d.name);
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
        r.results =
          r.failure === "ML unavailable" ? [] : validateResults(result, d.rows);
      } catch (e) {
        r.status = "failed";
        r.failure = (e as Error).message;
        r.results = [];
      }
      db.events.unshift({
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
  db.datasets = db.datasets.filter((x) => x.id !== id);
  db.runs = db.runs.filter((x) => x.dataset !== id);
  db.reviews = db.reviews.filter((x) => x.dataset !== id);
  event("Dataset deleted: " + d.name);
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
  if (scenario === "download") {
    scenario = "normal";
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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
  storageError = "";
  db = validateBackup(s);
  await persist();
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
  event((a ? "Updated" : "Created") + " demo account " + account.name);
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
  event("Saved review for " + item.record);
  await persist();
}
