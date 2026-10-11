import { describe, it, expect, vi, beforeAll } from "vitest";
vi.mock("idb-keyval", () => ({ get: vi.fn(), set: vi.fn(async () => {}) }));
import * as D from "./domain";
beforeAll(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => storage.get(k),
    clear: () => storage.clear(),
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  });
});
describe("CSV contract", () => {
  it("accepts valid, semicolon, quoted, BOM and CRLF examples", () => {
    for (const n of ["valid", "semicolon", "quoted"])
      expect(D.parse("\uFEFF" + D.fixture(n)).issues).toEqual([]);
  });
  it("rejects missing, unknown, empty, row limit and invalid fields", () => {
    for (const n of ["missing", "unknown", "empty", "too-many", "invalid"])
      expect(D.parse(D.fixture(n)).issues.length).toBeGreaterThan(0);
  });
  it("does not coerce malformed or blank numeric values", () => {
    expect(
      D.parse(
        "record_id,G1,failures,studytime,schoolsup\na,12abc,,2,no",
      ).issues.filter((x) => ["G1", "failures"].includes(x.column)),
    ).toHaveLength(2);
  });
  it("escapes formulas and quotes in exported text", () => {
    expect(D.csv([{ name: "=SUM(1,2)", note: 'a"b' }])).toContain("'=SUM");
  });
});
describe("domain state", () => {
  it("enforces ownership and role boundaries", async () => {
    await D.init();
    await D.login("maya@demo.example", "DemoOnly!2026");
    expect(D.owned("dataset-1").rows).toHaveLength(24);
    expect(() => D.owned("dataset-4")).toThrow("Forbidden");
    await D.login("analyst@demo.example", "DemoOnly!2026");
    expect(() => D.owned("dataset-1")).toThrow("Forbidden");
  });
  it("confirms once even concurrently and after dataset deletion", async () => {
    await D.login("maya@demo.example", "DemoOnly!2026");
    const p = await D.preview(new File([D.fixture("valid")], "test.csv"));
    const count = D.db.datasets.length;
    const [a, b] = await Promise.all([
      D.confirmImport(p.id),
      D.confirmImport(p.id),
    ]);
    expect(a).toBe(b);
    expect(D.db.datasets).toHaveLength(count + 1);
    await D.deleteDataset(a);
    expect(await D.confirmImport(p.id)).toBe(a);
    expect(D.db.datasets).toHaveLength(count);
  });
  it("rejects invalid/expired previews and rolls back failure", async () => {
    const p = await D.preview(new File([D.fixture("invalid")], "invalid.csv"));
    await expect(D.confirmImport(p.id)).rejects.toThrow("Correct");
    const q = await D.preview(new File([D.fixture("valid")], "valid.csv"));
    q.expires = 0;
    await expect(D.confirmImport(q.id)).rejects.toThrow("expired");
    const r = await D.preview(new File([D.fixture("valid")], "valid.csv"));
    const n = D.db.datasets.length;
    D.config("import rollback", 1);
    await expect(D.confirmImport(r.id)).rejects.toThrow("interruption");
    expect(D.db.datasets).toHaveLength(n);
  });
  it("reconciles uncertain import to the single saved dataset", async () => {
    const p = await D.preview(new File([D.fixture("valid")], "valid.csv"));
    const n = D.db.datasets.length;
    D.config("uncertain import", 1);
    await expect(D.confirmImport(p.id)).rejects.toThrow("Check import status");
    expect(D.db.datasets).toHaveLength(n + 1);
    expect(await D.confirmImport(p.id)).toBe(p.dataset);
  });
  it("rejects malformed inference without publishing results", async () => {
    D.config("malformed predictions", 1);
    const r = await D.startRun("dataset-1");
    r.finish = 0;
    await D.resolveRuns();
    expect(r.status).toBe("failed");
    expect(r.results).toEqual([]);
  });
  it("keeps predictions deterministic and protects running datasets", async () => {
    D.config("normal", 1);
    const r = await D.startRun("dataset-1");
    await expect(D.deleteDataset("dataset-1")).rejects.toThrow("running");
    r.finish = 0;
    await D.resolveRuns();
    expect(r.results[0].risk).toBe(D.risk(D.owned("dataset-1").rows[0]));
    expect(r.results).toHaveLength(24);
  });
  it("rejects corrupt backup without replacing state", () => {
    const old = D.db;
    expect(() => D.validateBackup({ version: 999 })).toThrow();
    expect(D.db).toBe(old);
  });
});
describe("administration, reviews and response validation", () => {
  it("validates response IDs, count and finite ranges", () => {
    const input = D.rows(2);
    expect(() =>
      D.validateResults([{ id: "STU-001", risk: 0.3 }], input),
    ).toThrow();
    expect(() =>
      D.validateResults(
        [
          { id: "STU-001", risk: NaN },
          { id: "STU-002", risk: 0.2 },
        ],
        input,
      ),
    ).toThrow();
    expect(() =>
      D.validateResults(
        [
          { id: "STU-001", risk: 0.3 },
          { id: "STU-001", risk: 0.2 },
        ],
        input,
      ),
    ).toThrow();
  });
  it("creates a usable teacher and blocks last administrator disable", async () => {
    D.config("normal", 1);
    await D.login("admin@demo.example", "DemoOnly!2026");
    const a = {
      id: D.uid(),
      name: "Taylor Demo",
      email: "taylor@demo.example",
      role: "teacher",
      enabled: true,
    };
    await D.saveAccount(a);
    await expect(
      D.saveAccount({ ...D.current()!, enabled: false }),
    ).rejects.toThrow("last active administrator");
    await D.login(a.email, "DemoOnly!2026");
    expect(D.db.datasets.filter((d) => d.owner === a.id)).toHaveLength(0);
    await expect(
      D.saveAccount({ ...a, role: "administrator" }),
    ).rejects.toThrow("Administrator access");
    await D.login("admin@demo.example", "DemoOnly!2026");
    await D.saveAccount({ ...a, enabled: false });
    await expect(D.login(a.email, "DemoOnly!2026")).rejects.toThrow("disabled");
  });
  it("saves private review without logging note contents, rejects another teacher", async () => {
    await D.login("maya@demo.example", "DemoOnly!2026");
    const note = {
      id: D.uid(),
      dataset: "dataset-1",
      record: "STU-007",
      owner: "maya",
      note: "Private text that must never enter activity.",
      status: "Reviewed",
      date: new Date().toISOString(),
    };
    await D.saveReview(note);
    expect(D.db.events[0].text).not.toContain(note.note);
    await D.login("noah@demo.example", "DemoOnly!2026");
    await expect(D.saveReview({ ...note, owner: "noah" })).rejects.toThrow(
      "Forbidden",
    );
  });
  it("rejects duplicate IDs and broken references in backups", () => {
    const copy = structuredClone(D.db);
    copy.datasets.push(copy.datasets[0]);
    expect(() => D.validateBackup(copy)).toThrow("duplicate IDs");
    const broken = structuredClone(D.db);
    broken.runs[0].dataset = "missing";
    expect(() => D.validateBackup(broken)).toThrow("Invalid run");
  });
});

describe("frontend completion contracts", () => {
  it("rolls back a failed import persistence without consuming its token", async () => {
    D.config("normal", 1);
    await D.restore(D.seed());
    await D.login("maya@demo.example", "DemoOnly!2026");
    const p = await D.preview(new File([D.fixture("valid")], "persist.csv"));
    const n = D.db.datasets.length;
    D.config("storage failure", 1);
    await expect(D.confirmImport(p.id)).rejects.toThrow("previous saved state");
    expect(D.db.datasets).toHaveLength(n);
    expect(D.db.previews.find((x) => x.id === p.id)?.dataset).toBeUndefined();
    const id = await D.confirmImport(p.id);
    expect(D.db.datasets.find((d) => d.id === id)?.rows).toHaveLength(12);
  });
  it.each([
    "schema mismatch",
    "model mismatch",
    "duplicate IDs",
    "missing IDs",
    "out of range",
    "malformed predictions",
    "ML unavailable",
  ])("rejects %s without successful results", async (scenario) => {
    D.config(scenario, 1);
    const r = await D.startRun("dataset-1");
    r.finish = 0;
    await D.resolveRuns();
    expect(r.status).toBe("failed");
    expect(r.results).toEqual([]);
    expect(r.code).toBeTruthy();
  });
  it("matches chart bin counts to result filters and stored threshold", () => {
    const run = D.db.runs.find((r) => r.id === "run-1")!;
    let total = 0;
    for (let i = 0; i < 4; i++) {
      const selected = D.runResults(run, "all", String(i));
      expect(
        selected.every((r) => Math.min(3, Math.floor(r.risk * 4)) === i),
      ).toBe(true);
      total += selected.length;
    }
    expect(total).toBe(run.results.length);
    const custom = { ...run, threshold: 0.8 };
    expect(D.runResults(custom, "above").every((r) => r.risk >= 0.8)).toBe(
      true,
    );
  });
  it("computes quality and observed field distributions from stored rows", () => {
    const d = D.owned("dataset-1"),
      quality = D.qualitySummary(d);
    expect(quality.records).toBe(24);
    expect(quality.completeness).toBe(100);
    expect(quality.duplicateIds).toBe(0);
    expect(quality.issues).toBe(0);
    expect(
      D.fieldDistribution(d, "studytime").reduce((n, x) => n + x.count, 0),
    ).toBe(24);
    const dirty = { ...d, rows: [...d.rows, { ...d.rows[0], schoolsup: "" }] };
    expect(D.qualitySummary(dirty).completeness).toBeLessThan(100);
    expect(D.qualitySummary(dirty).duplicateIds).toBe(1);
  });
  it("preserves associated review metadata and derives current record status", async () => {
    const item = {
      id: D.uid(),
      dataset: "dataset-1",
      record: "STU-001",
      owner: "maya",
      note: "Verify imported assessment",
      run: "run-1",
      status: "Needs review",
      date: new Date().toISOString(),
    };
    await D.saveReview(item);
    await D.saveReview({
      ...item,
      note: "Verify edited imported assessment",
      status: "Reviewed",
    });
    expect(D.db.reviews.find((r) => r.id === item.id)?.run).toBe("run-1");
    expect(D.reviewStatus(item.dataset, item.record)).toBe("Reviewed");
  });
  it("limits administrator history to account operations and live authorized links", async () => {
    await D.login("admin@demo.example", "DemoOnly!2026");
    await D.saveAccount({
      id: D.uid(),
      name: "History Teacher",
      email: "history@demo.example",
      role: "teacher",
      enabled: true,
    });
    expect(D.authorizedEvents().every((e) => e.type === "account")).toBe(true);
    expect(D.eventDestination(D.authorizedEvents()[0])).toBe("/admin/accounts");
    await D.login("maya@demo.example", "DemoOnly!2026");
    const p = await D.preview(new File([D.fixture("valid")], "link.csv"));
    const id = await D.confirmImport(p.id);
    const e = D.authorizedEvents().find((e) => e.objectId === id)!;
    expect(D.eventDestination(e)).toBe("/datasets/" + id);
    await D.deleteDataset(id);
    expect(D.eventDestination(e)).toBeUndefined();
  });
  it("allows only internal role-permitted return contexts", () => {
    const analyst = D.db.accounts.find((a) => a.id === "analyst")!,
      maya = D.db.accounts.find((a) => a.id === "maya")!;
    expect(D.safeReturn("https://evil.example", maya)).toBeUndefined();
    expect(D.safeReturn("//evil.example", maya)).toBeUndefined();
    expect(D.safeReturn("/datasets/dataset-1", analyst)).toBeUndefined();
    expect(D.safeReturn("/datasets/dataset-1?page=2&sort=G1", maya)).toContain(
      "page=2",
    );
  });
  it("cancels upload after identity changes during file reading", async () => {
    D.config("normal", 1);
    const f = new File([D.fixture("valid")], "stale.csv");
    let complete!: (v: string) => void;
    vi.spyOn(f, "text").mockImplementation(
      () => new Promise((r) => (complete = r)),
    );
    const pending = D.preview(f);
    await new Promise((r) => setTimeout(r, 10));
    await D.login("noah@demo.example", "DemoOnly!2026");
    complete(D.fixture("valid"));
    await expect(pending).rejects.toThrow("Session changed");
  });
  it("consumes only the named one-shot operation", async () => {
    D.config("review", 1);
    await D.readWorkspace();
    expect(D.scenario).toBe("review");
    await expect(D.delay("review")).rejects.toThrow("interruption");
    expect(D.scenario).toBe("normal");
    expect(D.scenarioState).toContain("consumed");
  });
  it("does not replace state for invalid restores and clears view caches for valid restores", async () => {
    const before = D.db;
    await expect(
      D.restore({ version: 999 } as unknown as D.Store),
    ).rejects.toThrow("Unsupported");
    expect(D.db).toBe(before);
    sessionStorage.setItem("view:maya:/datasets", "/datasets?page=9");
    await D.restore(D.seed());
    expect(sessionStorage.getItem("view:maya:/datasets")).toBeFalsy();
    expect(D.db.datasets).toHaveLength(4);
  });
});
