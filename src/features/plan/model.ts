import DATA from "./data.json";

type Task = (typeof DATA.tasks)[number];
export type Progress = {
  cards: Record<string, string>;
  checks: Record<string, boolean>;
  selected: Record<string, boolean>;
};
export function inScope(task: Task, state: Progress) {
  return (
    task.sprint > 0 &&
    (task.priority === "Must" || state.selected[task.id] === true)
  );
}
export function completionProblem(task: Task, next: string, state: Progress) {
  if (next === "Backlog") return "";
  if (!inScope(task, state))
    return "Select this optional card first; excluded work cannot start.";
  const unmet = task.depends.filter((id) => state.cards[id] !== "Done");
  if (unmet.length) return "Complete prerequisites first: " + unmet.join(", ");
  if (
    next === "Done" &&
    (!task.steps.every(
      (_, i) => state.checks[`${task.id}:step:${i}`] === true,
    ) ||
      !task.accept.every(
        (_, i) => state.checks[`${task.id}:accept:${i}`] === true,
      ))
  )
    return "Complete steps and acceptance checks before Done.";
  return "";
}
export function reconcileProgress(state: Progress) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const task of DATA.tasks) {
      const status = state.cards[task.id] || "Backlog";
      if (!inScope(task, state) && status !== "Backlog") {
        state.cards[task.id] = "Backlog";
        changed = true;
      } else if (status === "Done" && completionProblem(task, "Done", state)) {
        state.cards[task.id] = "In Progress";
        changed = true;
      }
    }
  }
}
