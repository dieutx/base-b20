import { describe, expect, test } from "vitest";

import { hasDeployedCode } from "./deployedCode";

describe("deployed code detection", () => {
  test("treats empty bytecode as not deployed", () => {
    expect(hasDeployedCode("0x")).toBe(false);
  });

  test("treats any non-empty bytecode as deployed", () => {
    expect(hasDeployedCode("0xef")).toBe(true);
    expect(hasDeployedCode("0x60006000")).toBe(true);
  });
});
