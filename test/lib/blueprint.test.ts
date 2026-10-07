import { describe, expect, it } from "vitest";
import {
  BLUEPRINT_ANNOTATIONS,
  BLUEPRINT_BACK_CROP_HEIGHT,
  findBlueprintAnnotation,
} from "#/lib/constants/blueprint";
import { STANDARD_MEASUREMENTS } from "#/lib/constants/measurements";

const BACK_VIEW = new Set([
  "Ancho espalda",
  "Talle trasero",
  "Contorno de brazo",
  "Contorno de muñeca",
  "Largo brazo",
  "Largo manga",
  "Largo chaqueta",
]);

describe("BLUEPRINT_ANNOTATIONS", () => {
  it("has an annotation for every standard measurement, on the expected view", () => {
    for (const { name } of STANDARD_MEASUREMENTS) {
      const annotation = findBlueprintAnnotation(name);
      expect(annotation, name).toBeDefined();
      expect(annotation?.view, name).toBe(BACK_VIEW.has(name) ? "back" : "front");
    }
    expect(BLUEPRINT_ANNOTATIONS).toHaveLength(STANDARD_MEASUREMENTS.length);
  });

  it("keeps labels on the same side far enough apart not to overlap", () => {
    const columns = Map.groupBy(BLUEPRINT_ANNOTATIONS, (a) => `${a.view}-${a.label.side}`);
    for (const [column, annotations] of columns) {
      const ys = annotations.map((a) => a.label.y).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) {
        expect(
          ys[i] - ys[i - 1],
          `${column} labels at ${ys[i - 1]} and ${ys[i]}`,
        ).toBeGreaterThanOrEqual(22);
      }
    }
  });

  it("keeps back-view annotations inside the cropped print area", () => {
    for (const a of BLUEPRINT_ANNOTATIONS.filter((a) => a.view === "back")) {
      expect(Math.max(a.y1, a.y2, a.label.y + 12), a.name).toBeLessThan(
        BLUEPRINT_BACK_CROP_HEIGHT - 12,
      );
    }
  });
});
