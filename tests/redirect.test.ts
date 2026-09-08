import { expect, test } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";

test.each(["https://attacker.example", "//attacker.example", "/\\attacker.example", "javascript:alert(1)", null])("rejects external auth redirect %s", (value) => expect(safeNextPath(value)).toBe("/app"));
test("preserves local navigation", () => expect(safeNextPath("/account?from=login")).toBe("/account?from=login"));
