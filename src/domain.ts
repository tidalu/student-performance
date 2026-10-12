import Papa from "papaparse";

export type User = { id: string; username: string; password: string };
export type StudentRow = {
  id: string;
  sourceRowId: string;
  g1: number;
  failures: number;
  studytime: number;
};
export type Dataset = {
  id: string;
  ownerId: string;
  name: string;
  sourceName: string;
  schemaVersion: "schema-v1";
  createdAt: string;
  rows: StudentRow[];
};
export type Result = {
  rowId: string;
  sourceRowId: string;
  score: number;
  flagged: boolean;
};
export type Run = {
  id: string;
  ownerId: string;
  datasetId: string;
  createdAt: string;
  modelVersion: "DEMO-RULE-v1";
  schemaVersion: "schema-v1";
  threshold: 0.5;
  results: Result[];
};
export type Scenario =
  | "success"
  | "session-expired"
  | "missing-model"
  | "schema-mismatch"
  | "invalid-score"
  | "save-failure";
export type EvaluationState = "available" | "absent" | "malformed";
export type Store = {
  users: User[];
  currentUserId: string | null;
  datasets: Dataset[];
  runs: Run[];
  scenario: Scenario;
  evaluationState: EvaluationState;
};

export class DomainError extends Error {
  code: string;
  details: string[];
  constructor(code: string, message: string, details: string[] = []) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }
}

const listeners = new Set<() => void>();
let sequence = 100;
const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${++sequence}`;

const alexRows: StudentRow[] = [
  { id: "row-a1", sourceRowId: "DEMO-001", g1: 17, failures: 0, studytime: 3 },
  { id: "row-a2", sourceRowId: "DEMO-002", g1: 12, failures: 0, studytime: 2 },
  { id: "row-a3", sourceRowId: "DEMO-003", g1: 9, failures: 1, studytime: 2 },
  { id: "row-a4", sourceRowId: "DEMO-004", g1: 13, failures: 0, studytime: 4 },
  { id: "row-a5", sourceRowId: "DEMO-005", g1: 6, failures: 2, studytime: 1 },
];
const samRows: StudentRow[] = [
  { id: "row-s1", sourceRowId: "SAM-001", g1: 15, failures: 0, studytime: 3 },
  { id: "row-s2", sourceRowId: "SAM-002", g1: 10, failures: 1, studytime: 2 },
  { id: "row-s3", sourceRowId: "SAM-003", g1: 8, failures: 2, studytime: 1 },
];

export function riskScore(
  row: Pick<StudentRow, "g1" | "failures" | "studytime">,
) {
  const raw =
    0.72 - 0.035 * row.g1 + 0.08 * row.failures - 0.025 * (row.studytime - 1);
  return Math.min(0.95, Math.max(0.05, raw));
}
function resultsFor(rows: StudentRow[]): Result[] {
  return rows.map((row) => {
    const score = riskScore(row);
    return {
      rowId: row.id,
      sourceRowId: row.sourceRowId,
      score,
      flagged: score >= 0.5,
    };
  });
}

export function seed(): Store {
  const alexDataset: Dataset = {
    id: "dataset-alex",
    ownerId: "user-alex",
    name: "First assessment demo",
    sourceName: "demo-valid-5.csv",
    schemaVersion: "schema-v1",
    createdAt: "2026-10-01T09:30:00.000Z",
    rows: structuredClone(alexRows),
  };
  return {
    users: [
      { id: "user-alex", username: "demo_alex", password: "DemoOnly123!" },
      { id: "user-sam", username: "demo_sam", password: "DemoOnly123!" },
    ],
    currentUserId: null,
    datasets: [
      alexDataset,
      {
        id: "dataset-sam",
        ownerId: "user-sam",
        name: "Sam's separate dataset",
        sourceName: "sam-demo.csv",
        schemaVersion: "schema-v1",
        createdAt: "2026-10-02T12:00:00.000Z",
        rows: structuredClone(samRows),
      },
    ],
    runs: [
      {
        id: "run-alex",
        ownerId: "user-alex",
        datasetId: alexDataset.id,
        createdAt: "2026-10-01T09:35:00.000Z",
        modelVersion: "DEMO-RULE-v1",
        schemaVersion: "schema-v1",
        threshold: 0.5,
        results: resultsFor(alexDataset.rows),
      },
    ],
    scenario: "success",
    evaluationState: "available",
  };
}

export let store: Store = seed();
function emit() {
  listeners.forEach((listener) => listener());
}
export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function reset() {
  store = seed();
  emit();
}
export function currentUser() {
  return store.users.find((user) => user.id === store.currentUserId) ?? null;
}

export function register(
  username: string,
  password: string,
  confirmation: string,
) {
  const clean = username.trim();
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(clean))
    throw new DomainError(
      "invalid-username",
      "Use 3–32 letters, numbers, underscores or hyphens.",
    );
  if (
    store.users.some(
      (user) => user.username.toLowerCase() === clean.toLowerCase(),
    )
  )
    throw new DomainError(
      "duplicate-username",
      "That username is already used in this demo.",
    );
  if (
    password.length < 10 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/\d/.test(password)
  )
    throw new DomainError(
      "weak-password",
      "Use at least 10 characters with upper-case, lower-case and a number.",
    );
  if (password !== confirmation)
    throw new DomainError(
      "password-mismatch",
      "The two passwords do not match.",
    );
  store.users.push({ id: id("user"), username: clean, password });
  emit();
  return clean;
}
export function login(username: string, password: string) {
  const user = store.users.find(
    (candidate) =>
      candidate.username.toLowerCase() === username.trim().toLowerCase() &&
      candidate.password === password,
  );
  if (!user)
    throw new DomainError(
      "invalid-credentials",
      "Username or password is incorrect.",
    );
  store.currentUserId = user.id;
  emit();
  return user;
}
export function logout() {
  store.currentUserId = null;
  emit();
}
export function requireUser() {
  const user = currentUser();
  if (!user) throw new DomainError("unauthenticated", "Sign in to continue.");
  return user;
}
function consumeScenario() {
  const scenario = store.scenario;
  if (scenario !== "success") store.scenario = "success";
  return scenario;
}
export function expireSessionIfRequested() {
  if (store.scenario !== "session-expired") return false;
  consumeScenario();
  store.currentUserId = null;
  emit();
  return true;
}

export function ownedDatasets() {
  const user = requireUser();
  return store.datasets
    .filter((dataset) => dataset.ownerId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function ownedRuns() {
  const user = requireUser();
  return store.runs
    .filter((run) => run.ownerId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function ownedDataset(datasetId: string) {
  const user = requireUser();
  const dataset = store.datasets.find(
    (candidate) => candidate.id === datasetId && candidate.ownerId === user.id,
  );
  if (!dataset)
    throw new DomainError(
      "not-found",
      "This dataset is unavailable or does not belong to this account.",
    );
  return dataset;
}
export function ownedRun(runId: string) {
  const user = requireUser();
  const run = store.runs.find(
    (candidate) => candidate.id === runId && candidate.ownerId === user.id,
  );
  if (!run)
    throw new DomainError(
      "not-found",
      "This saved run is unavailable or does not belong to this account.",
    );
  return run;
}

const headers = ["source_row_id", "G1", "failures", "studytime"];
export function validateCsvText(
  text: string,
): Pick<Dataset, "schemaVersion" | "rows"> {
  const parsed = Papa.parse<Record<string, string>>(
    text.replace(/^\uFEFF/, ""),
    {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (value) => value.trim(),
    },
  );
  const errors: string[] = parsed.errors
    .slice(0, 12)
    .map((error) => `Row ${(error.row ?? 0) + 2}: ${error.message}`);
  const actual = parsed.meta.fields ?? [];
  const duplicates = actual.filter(
    (header, index) => actual.indexOf(header) !== index,
  );
  if (duplicates.length)
    errors.push(`Header: duplicate ${[...new Set(duplicates)].join(", ")}.`);
  const missing = headers.filter((header) => !actual.includes(header));
  const extra = actual.filter((header) => !headers.includes(header));
  if (missing.length) errors.push(`Header: missing ${missing.join(", ")}.`);
  if (extra.length) errors.push(`Header: unexpected ${extra.join(", ")}.`);
  if (parsed.data.length < 1)
    errors.push("File: include at least one data row.");
  if (parsed.data.length > 500)
    errors.push(`File: ${parsed.data.length} rows exceeds the 500-row limit.`);
  const seen = new Set<string>();
  const rows: StudentRow[] = [];
  parsed.data.forEach((raw, index) => {
    const rowNumber = index + 2;
    const sourceRowId = String(raw.source_row_id ?? "").trim();
    const g1 = Number(raw.G1),
      failures = Number(raw.failures),
      studytime = Number(raw.studytime);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(sourceRowId))
      errors.push(
        `Row ${rowNumber}, source_row_id: use 1–64 safe letters, numbers, hyphens or underscores.`,
      );
    else if (seen.has(sourceRowId))
      errors.push(`Row ${rowNumber}, source_row_id: duplicate ${sourceRowId}.`);
    seen.add(sourceRowId);
    if (!Number.isInteger(g1) || g1 < 0 || g1 > 20)
      errors.push(`Row ${rowNumber}, G1: expected an integer from 0 to 20.`);
    if (!Number.isInteger(failures) || failures < 0 || failures > 4)
      errors.push(
        `Row ${rowNumber}, failures: expected an integer from 0 to 4.`,
      );
    if (!Number.isInteger(studytime) || studytime < 1 || studytime > 4)
      errors.push(
        `Row ${rowNumber}, studytime: expected an integer from 1 to 4.`,
      );
    rows.push({ id: id("row"), sourceRowId, g1, failures, studytime });
  });
  if (errors.length)
    throw new DomainError(
      "invalid-csv",
      `The CSV has ${errors.length} validation issue${errors.length === 1 ? "" : "s"}. Nothing was imported.`,
      errors.slice(0, 12),
    );
  return { schemaVersion: "schema-v1", rows };
}

export async function importCsv(file: File) {
  const user = requireUser();
  if (!file.name.toLowerCase().endsWith(".csv"))
    throw new DomainError("invalid-file", "Choose a .csv file.");
  if (file.size === 0)
    throw new DomainError("invalid-file", "The selected file is empty.");
  if (file.size > 1024 * 1024)
    throw new DomainError(
      "invalid-file",
      "The selected file exceeds the 1 MiB limit.",
    );
  const validated = validateCsvText(await file.text());
  if (store.scenario === "save-failure") {
    consumeScenario();
    throw new DomainError(
      "save-failure",
      "The simulated save failed. No dataset or rows were added.",
    );
  }
  const dataset: Dataset = {
    ...validated,
    id: id("dataset"),
    ownerId: user.id,
    name: file.name.replace(/\.csv$/i, "").replace(/[-_]+/g, " "),
    sourceName: file.name,
    createdAt: now(),
  };
  store.datasets.push(dataset);
  emit();
  return dataset;
}

export function predict(datasetId: string) {
  const user = requireUser(),
    dataset = ownedDataset(datasetId),
    scenario = consumeScenario();
  if (scenario === "missing-model")
    throw new DomainError(
      "missing-model",
      "The saved model is unavailable. The dataset was kept and no run was created.",
    );
  if (scenario === "schema-mismatch")
    throw new DomainError(
      "schema-mismatch",
      "The dataset schema does not match the saved model. No run was created.",
    );
  let results = resultsFor(dataset.rows);
  if (scenario === "invalid-score" && results[0])
    results = [{ ...results[0], score: Number.NaN }, ...results.slice(1)];
  const valid =
    results.length === dataset.rows.length &&
    new Set(results.map((result) => result.rowId)).size ===
      dataset.rows.length &&
    results.every(
      (result) =>
        Number.isFinite(result.score) && result.score >= 0 && result.score <= 1,
    );
  if (!valid)
    throw new DomainError(
      "invalid-output",
      "The simulated model returned invalid results. The dataset was kept and no run was created.",
    );
  if (scenario === "save-failure")
    throw new DomainError(
      "save-failure",
      "The simulated result save failed. No partial run or results were added.",
    );
  const run: Run = {
    id: id("run"),
    ownerId: user.id,
    datasetId: dataset.id,
    createdAt: now(),
    modelVersion: "DEMO-RULE-v1",
    schemaVersion: dataset.schemaVersion,
    threshold: 0.5,
    results,
  };
  store.runs.push(run);
  emit();
  return run;
}

export function setScenario(scenario: Scenario) {
  store.scenario = scenario;
  emit();
}
export function setEvaluationState(state: EvaluationState) {
  store.evaluationState = state;
  emit();
}
export function statistics(dataset: Dataset) {
  const values = dataset.rows.map((row) => row.g1);
  return {
    count: values.length,
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}
export type Confusion = { tp: number; fp: number; fn: number; tn: number };
export function metrics(counts: Confusion) {
  const precisionDenominator = counts.tp + counts.fp,
    recallDenominator = counts.tp + counts.fn;
  const precision = precisionDenominator
    ? counts.tp / precisionDenominator
    : null;
  const recall = recallDenominator ? counts.tp / recallDenominator : null;
  const f1 =
    precision !== null && recall !== null && precision + recall
      ? (2 * precision * recall) / (precision + recall)
      : 0;
  return { precision, recall, f1 };
}
export const evaluation = {
  target: "Final grade below 10/20",
  schema: "schema-v1",
  threshold: 0.5,
  validation: [
    {
      model: "Most-frequent baseline",
      selected: false,
      counts: { tp: 0, fp: 0, fn: 8, tn: 12 },
    },
    {
      model: "Logistic example",
      selected: true,
      counts: { tp: 6, fp: 2, fn: 2, tn: 10 },
    },
    {
      model: "Fixed forest example",
      selected: false,
      counts: { tp: 5, fp: 2, fn: 3, tn: 10 },
    },
  ],
  heldOut: {
    model: "Frozen logistic example",
    counts: { tp: 5, fp: 2, fn: 3, tn: 10 },
  },
};

export const fixtures = {
  valid5: `source_row_id,G1,failures,studytime\nDEMO-001,17,0,3\nDEMO-002,12,0,2\nDEMO-003,9,1,2\nDEMO-004,13,0,4\nDEMO-005,6,2,1\n`,
  invalidRange: `source_row_id,G1,failures,studytime\nDEMO-001,24,0,3\nDEMO-002,12,7,2\n`,
  duplicateId: `source_row_id,G1,failures,studytime\nDEMO-001,17,0,3\nDEMO-001,12,0,2\n`,
  unsupportedColumn: `source_row_id,G1,failures,studytime,G3\nDEMO-001,17,0,3,18\n`,
  valid31:
    [
      "source_row_id,G1,failures,studytime",
      ...Array.from(
        { length: 31 },
        (_, index) =>
          `PAGE-${String(index + 1).padStart(3, "0")},${5 + (index % 15)},${index % 3},${1 + (index % 4)}`,
      ),
    ].join("\n") + "\n",
  tooManyRows:
    [
      "source_row_id,G1,failures,studytime",
      ...Array.from({ length: 501 }, (_, index) => `LIMIT-${index + 1},10,0,2`),
    ].join("\n") + "\n",
};
export function download(
  name: string,
  content: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type })),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
