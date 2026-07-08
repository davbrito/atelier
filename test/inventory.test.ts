import { expect, test } from "vitest";
import { computeMovementDelta } from "#/lib/server/inventory-logic";

test("entry always produces a positive delta equal to quantity", () => {
  expect(computeMovementDelta("entry", 5, 0)).toBe("5.0000");
  expect(computeMovementDelta("entry", 5, 100)).toBe("5.0000");
});

test("exit always produces a negative delta equal to -quantity", () => {
  expect(computeMovementDelta("exit", 5, 0)).toBe("-5.0000");
  expect(computeMovementDelta("exit", 5, 100)).toBe("-5.0000");
});

test("adjustment produces the delta needed to reach the target stock", () => {
  expect(computeMovementDelta("adjustment", 10, 4)).toBe("6.0000");
  expect(computeMovementDelta("adjustment", 4, 10)).toBe("-6.0000");
  expect(computeMovementDelta("adjustment", 0, -3)).toBe("3.0000");
});

test("adjustment to the current stock produces a zero delta", () => {
  expect(computeMovementDelta("adjustment", 7, 7)).toBe("0.0000");
});
