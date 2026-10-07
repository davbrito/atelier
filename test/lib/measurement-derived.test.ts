import { describe, expect, it } from "vitest";
import { STANDARD_MEASUREMENTS } from "#/lib/constants/measurements";
import {
  getDartDepths,
  getDartDifference,
  getPatternFraction,
  withStandardSlots,
} from "#/lib/measurement-derived";

describe("getPatternFraction", () => {
  it("divides by the standard pattern fraction, rounded to one decimal", () => {
    expect(getPatternFraction("Contorno busto", 114)).toEqual({ label: "1/4", text: "28,5" });
    expect(getPatternFraction("Contorno cuello", 40)).toEqual({ label: "1/6", text: "6,7" });
    expect(getPatternFraction("Contorno tórax", 100)).toEqual({ label: "1/4", text: "25" });
  });

  it("uses the locale's decimal separator and omits the decimal on exact results", () => {
    expect(getPatternFraction("Ancho espalda", 36)).toEqual({ label: "1/2", text: "18" });
  });

  it("matches names without accents or the preposition 'de'", () => {
    expect(getPatternFraction("contorno brazo", 38)).toEqual({ label: "1/2", text: "19" });
  });

  it("returns null for empty values or measurements without a fraction", () => {
    expect(getPatternFraction("Contorno busto", 0)).toBeNull();
    expect(getPatternFraction("Contorno busto", null)).toBeNull();
    expect(getPatternFraction("Largo falda", 110)).toBeNull();
  });
});

describe("getDartDifference", () => {
  const measurements = [
    { id: "front", name: "Talle delantero", value: 45 },
    { id: "back", name: "Talle trasero", value: 42 },
  ];

  it("subtracts the back length from the front length", () => {
    const diff = getDartDifference(measurements);
    expect(diff?.text).toBe("3");
    expect(diff?.front.id).toBe("front");
    expect(diff?.back.id).toBe("back");
    expect(getDartDepths(measurements)).toEqual(
      new Map([
        ["front", "3"],
        ["back", "3"],
      ]),
    );
  });

  it("returns null when a length is missing or the front is shorter", () => {
    expect(getDartDifference(measurements.slice(0, 1))).toBeNull();
    expect(
      getDartDifference([
        { id: "front", name: "Talle delantero", value: 40 },
        { id: "back", name: "Talle trasero", value: 42 },
      ]),
    ).toBeNull();
  });
});

describe("withStandardSlots", () => {
  it("lists every standard measurement in catalog order, then custom ones", () => {
    const slots = withStandardSlots([
      { id: "custom", name: "Ancho hombro", value: 12 },
      { id: "bust", name: "contorno busto", value: 114 },
    ]);
    expect(slots).toHaveLength(STANDARD_MEASUREMENTS.length + 1);
    expect(slots.map((s) => s.name).slice(0, 2)).toEqual(["Contorno cuello", "Ancho espalda"]);
    expect(slots.find((s) => s.id === "bust")).toMatchObject({
      name: "contorno busto",
      value: 114,
    });
    expect(slots.find((s) => s.name === "Contorno cintura")).toEqual({
      id: null,
      name: "Contorno cintura",
      value: null,
    });
    expect(slots.at(-1)?.id).toBe("custom");
  });
});
