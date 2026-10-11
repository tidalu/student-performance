import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DATA, PANELS, validateState } from "./runtime.js";
import { completionProblem, reconcileProgress } from "./model";

const fresh = () => ({
  version: 2,
  names: {},
  cards: {} as Record<string, string>,
  checks: {} as Record<string, boolean>,
  selected: {} as Record<string, boolean>,
  skills: {},
  capacity: {},
  evidence: {} as Record<string, { artifact: string; reviewed: boolean }>,
});

describe("shared plan conservation", () => {
  it("retains every supplied data field and reference section", () => {
    const original = readFileSync(
      "public/student-performance-plan-original.html",
      "utf8",
    );
    const dataStart = original.indexOf("const DATA=") + "const DATA=".length;
    const panelStart = original.indexOf("const PANELS=");
    const keyStart = original.indexOf("const KEY=", panelStart);
    expect(DATA).toEqual(
      JSON.parse(
        original.slice(dataStart, panelStart).trim().replace(/;$/, ""),
      ),
    );
    expect(PANELS).toEqual(
      JSON.parse(
        original
          .slice(panelStart + "const PANELS=".length, keyStart)
          .trim()
          .replace(/;$/, ""),
      ),
    );
    expect(DATA.tasks).toHaveLength(122);
    expect(DATA.sprints).toHaveLength(5);
    expect(Object.keys(PANELS)).toHaveLength(10);
  });
  it("keeps all task links resolvable and IDs unique", () => {
    const ids = new Set(DATA.tasks.map((t) => t.id));
    expect(ids.size).toBe(122);
    for (const task of DATA.tasks) {
      expect(task.labels).toHaveLength(2);
      for (const id of [...task.depends, ...task.unlocks])
        expect(ids.has(id)).toBe(true);
    }
  });
});

describe("planning workflow", () => {
  it("keeps older v2 backups compatible with optional review notes", () => {
    const { evidence, ...legacy } = fresh();
    expect(validateState(legacy).evidence).toEqual({});
    const state = fresh();
    state.evidence["S2-W1-01"] = {
      artifact: "PR #12 / fixtures/rollback.json",
      reviewed: true,
    };
    expect(validateState(state).evidence).toEqual(state.evidence);
    expect(() =>
      validateState({
        ...state,
        evidence: { unknown: { artifact: "x", reviewed: true } },
      }),
    ).toThrow(/evidence/);
    expect(() =>
      validateState({
        ...state,
        evidence: { "S2-W1-01": { artifact: "x", reviewed: "yes" } },
      }),
    ).toThrow(/evidence/);
  });
  it("requires prerequisites and both checklists before completion", () => {
    const task = DATA.tasks.find(
      (t) => t.priority === "Must" && t.depends.length,
    )!;
    const state = fresh();
    expect(completionProblem(task, "In Progress", state)).toMatch(
      /prerequisites/,
    );
    task.depends.forEach((id) => (state.cards[id] = "Done"));
    expect(completionProblem(task, "In Progress", state)).toBe("");
    expect(completionProblem(task, "Done", state)).toMatch(/acceptance/);
    task.steps.forEach((_, i) => (state.checks[`${task.id}:step:${i}`] = true));
    expect(completionProblem(task, "Done", state)).toMatch(/acceptance/);
    task.accept.forEach(
      (_, i) => (state.checks[`${task.id}:accept:${i}`] = true),
    );
    expect(completionProblem(task, "Done", state)).toBe("");
  });
  it("keeps optional work unselected and excluded work out of progress", () => {
    const state = fresh();
    for (const task of DATA.tasks.filter((t) => t.priority !== "Must"))
      expect(completionProblem(task, "In Progress", state)).toMatch(/optional/);
  });
  it("reopens dependent completions when prerequisite evidence is withdrawn", () => {
    const state = fresh();
    for (const task of DATA.tasks.filter((t) => t.priority === "Must")) {
      state.cards[task.id] = "Done";
      task.steps.forEach(
        (_, i) => (state.checks[`${task.id}:step:${i}`] = true),
      );
      task.accept.forEach(
        (_, i) => (state.checks[`${task.id}:accept:${i}`] = true),
      );
    }
    const root = DATA.tasks.find(
      (t) => t.priority === "Must" && !t.depends.length,
    )!;
    state.checks[`${root.id}:step:0`] = false;
    reconcileProgress(state);
    expect(state.cards[root.id]).toBe("In Progress");
    for (const task of DATA.tasks.filter((t) => t.depends.includes(root.id)))
      expect(state.cards[task.id]).not.toBe("Done");
  });
  it("validates backups without modifying the supplied state", () => {
    const state = fresh();
    state.names = { W1: "Team lead" };
    state.capacity = { "1": { W1: 42.5 } };
    const validated = validateState(state);
    expect(validated).toEqual(state);
    expect(validated).not.toBe(state);
    expect(() =>
      validateState({ ...state, capacity: { "1": { W1: 281 } } }),
    ).toThrow(/hours/);
    expect(() =>
      validateState({ ...state, cards: { unknown: "Done" } }),
    ).toThrow(/card/);
    expect(() =>
      validateState({ ...state, checks: { "S1-W1-01:step:999": true } }),
    ).toThrow(/checklist/);
    expect(() => validateState({ ...state, version: 1 })).toThrow(/v2/);
    expect(state.cards).toEqual({});
  });
});
