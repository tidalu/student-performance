import { describe, expect, it } from "vitest";
import { resolveTheme } from "./theme";

describe("workspace appearance preference", () => {
  it("uses the system preference before a choice has been saved", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });
  it("respects either explicit choice over the system preference", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("recovers from invalid stored preferences", () => {
    expect(resolveTheme("broken", true)).toBe("dark");
    expect(resolveTheme("", false)).toBe("light");
  });
});
