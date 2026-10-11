import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanDetail } from "./PlanDetail";
import { DATA, type Planner, type PlanProgress } from "./runtime.js";

it("renders every supplied brief in the modal without dropping its detailed content", () => {
  const state: PlanProgress = {
    version: 2,
    names: {},
    cards: {},
    checks: {},
    selected: {},
    skills: {},
    capacity: {},
    evidence: {},
  };
  const planner: Planner = {
    getProgress: () => state,
    getName: (id) => DATA.members.find((member) => member.id === id)!.name,
    getNotice: () => "",
    destroy() {},
    focusCard() {},
    check() {},
    status: () => "",
    select: () => "",
    evidence() {},
    copy: async () => "",
  };
  const escaped = (text: string) =>
    text.replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#x27;",
        })[char]!,
    );
  for (const task of DATA.tasks) {
    const html = renderToStaticMarkup(
      <PlanDetail id={task.id} planner={planner} open={() => {}} />,
    );
    const content = [
      task.id,
      task.title,
      task.objective,
      task.priorityReason,
      task.hours.basis,
      task.pair.plan,
      task.starterExercise,
      task.snippet.code,
      task.snippet.note,
      task.outcome,
      task.avoid,
      task.troubleshooting,
      task.learn,
      task.readiness,
      ...task.steps,
      ...task.accept,
      ...task.drawbacks,
      ...task.bestPractices,
      ...task.tools,
      ...task.resources.flatMap((resource) => [
        resource.label,
        resource.focus,
        resource.url,
      ]),
    ];
    for (const value of content)
      expect(html, `${task.id}: ${value.slice(0, 60)}`).toContain(
        escaped(value),
      );
  }
});
