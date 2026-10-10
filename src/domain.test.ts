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
