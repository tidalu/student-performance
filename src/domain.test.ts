import { beforeEach, describe, expect, it } from "vitest";
import * as D from "./domain";

describe("reduced MVP domain", () => {
  beforeEach(() => D.reset());

  it("registers one ordinary account and requires explicit login", () => {
    const username = D.register("new_demo", "StrongDemo1", "StrongDemo1");
    expect(username).toBe("new_demo");
    expect(D.currentUser()).toBeNull();
    D.login("new_demo", "StrongDemo1");
    expect(D.currentUser()?.username).toBe("new_demo");
  });

  it("keeps account-owned datasets separate", () => {
    D.login("demo_alex", "DemoOnly123!");
    expect(D.ownedDatasets().map((item) => item.id)).toEqual(["dataset-alex"]);
    expect(() => D.ownedDataset("dataset-sam")).toThrow(/unavailable/);
  });

  it("validates the exact CSV contract", () => {
    const valid = D.validateCsvText(D.fixtures.valid5);
    expect(valid.rows).toHaveLength(5);
    expect(() => D.validateCsvText(D.fixtures.invalidRange)).toThrow(
      /validation issue/,
    );
    expect(() => D.validateCsvText(D.fixtures.duplicateId)).toThrow(
      /validation issue/,
    );
    expect(() => D.validateCsvText(D.fixtures.unsupportedColumn)).toThrow(
      /validation issue/,
    );
    try {
      D.validateCsvText(D.fixtures.tooManyRows);
      throw new Error("Expected the row limit to reject the fixture");
    } catch (error) {
      expect((error as D.DomainError).details.join(" ")).toMatch(
        /500-row limit/,
      );
    }
  });

  it("calculates the documented G1 statistics", () => {
    D.login("demo_alex", "DemoOnly123!");
    expect(D.statistics(D.ownedDataset("dataset-alex"))).toEqual({
      count: 5,
      mean: 11.4,
      min: 6,
      max: 17,
    });
  });

  it("saves a complete deterministic run", () => {
    D.login("demo_alex", "DemoOnly123!");
    const before = D.store.runs.length;
    const run = D.predict("dataset-alex");
    expect(run.results).toHaveLength(5);
    expect(D.store.runs).toHaveLength(before + 1);
    expect(run.results.every((result) => Number.isFinite(result.score))).toBe(
      true,
    );
  });

  it("rejects invalid model output without a partial run", () => {
    D.login("demo_alex", "DemoOnly123!");
    const before = D.store.runs.length;
    D.setScenario("invalid-score");
    expect(() => D.predict("dataset-alex")).toThrow(/invalid results/);
    expect(D.store.runs).toHaveLength(before);
  });

  it("derives metrics from confusion counts", () => {
    const result = D.metrics({ tp: 5, fp: 2, fn: 3, tn: 10 });
    expect(result.precision).toBeCloseTo(5 / 7);
    expect(result.recall).toBeCloseTo(5 / 8);
    expect(result.f1).toBeCloseTo(2 / 3);
  });
});
