import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Alert } from "./alert";

// Step screens use the compact line; other screens keep the full box.
it("renders a compact alert as one inline line", () => {
  const compact = renderToStaticMarkup(createElement(Alert, { variant: "warning", title: "Add a reference", compact: true }));
  const full = renderToStaticMarkup(createElement(Alert, { variant: "warning", title: "Add a reference" }));
  expect(compact).toContain("px-3 py-2");
  expect(compact).toContain("text-caption");
  expect(full).toContain("p-3.5");
});
