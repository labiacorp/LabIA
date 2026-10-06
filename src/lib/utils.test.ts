import { expect, it } from "vitest";
import { cn } from "./utils";

it("keeps a custom font size next to a custom text color", () => {
  expect(cn("text-caption", "text-lab-text")).toBe("text-caption text-lab-text");
  expect(cn("text-caption", "text-body-sm")).toBe("text-body-sm");
});
