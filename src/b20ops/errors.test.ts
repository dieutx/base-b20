import { describe, expect, test } from "vitest";

import { decodeB20Error } from "./errors";

describe("B20 error decoder", () => {
  test("maps policy, pause, cap, role, and wallet errors to actionable codes", () => {
    expect(decodeB20Error(new Error("PolicyForbids(bytes32,uint64)")).code).toBe("POLICY_FORBIDS");
    expect(decodeB20Error(new Error("ContractPaused(0)")).code).toBe("FEATURE_PAUSED");
    expect(decodeB20Error(new Error("SupplyCapExceeded")).code).toBe("SUPPLY_CAP_EXCEEDED");
    expect(decodeB20Error(new Error("AccessControlUnauthorizedAccount")).code).toBe("UNAUTHORIZED_ROLE");
    expect(decodeB20Error({ code: 4001, message: "User rejected" }).code).toBe("USER_REJECTED");
  });
});
