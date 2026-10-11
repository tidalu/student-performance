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
};
export function mountPlan(
  root: HTMLElement,
  download: (filename: string, text: string, type?: string) => void,
): () => void;
