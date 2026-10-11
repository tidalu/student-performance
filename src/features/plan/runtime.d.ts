export const DATA: typeof import("./data.json");
export const PANELS: typeof import("./panels.json");
export function validateState(value: unknown): {
  version: number;
  names: Record<string, string>;
  cards: Record<string, string>;
  checks: Record<string, boolean>;
  selected: Record<string, boolean>;
  skills: Record<string, { scores: Record<string, number>; evidence: string }>;
  capacity: Record<string, Record<string, number>>;
  evidence: Record<string, { artifact: string; reviewed: boolean }>;
};
export type PlanProgress = ReturnType<typeof validateState>;
export type Planner = {
  destroy(): void;
  getProgress(): PlanProgress;
  getName(id: string): string;
  getNotice(): string;
  focusCard(id: string): void;
  check(key: string, value: boolean): void;
  status(id: string, value: string): string;
  select(id: string, value: boolean): string;
  evidence(
    id: string,
    patch: Partial<{ artifact: string; reviewed: boolean }>,
  ): void;
  copy(id: string): Promise<string>;
};
export function mountPlan(
  root: HTMLElement,
  download: (filename: string, text: string, type?: string) => void,
  onOpen: (id: string) => void,
  onChange: () => void,
): Planner;
