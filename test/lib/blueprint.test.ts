import { describe, expect, it } from "vitest";
import {
  BLUEPRINT_ANNOTATIONS,
  BLUEPRINT_BACK_CROP_HEIGHT,
  findBlueprintAnnotation,
} from "#/lib/constants/blueprint";
import {
  findStandardMeasurement,
  normalizeMeasurementName,
  STANDARD_MEASUREMENTS,
} from "#/lib/constants/measurements";

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
    // Nombre + valor ocupan ~22 unidades; la línea de fracción o pinza añade ~8.
    const labelHeight = (name: string) =>
      findStandardMeasurement(name)?.fraction || /^talle /.test(normalizeMeasurementName(name))
        ? 30
        : 22;
    const columns = Map.groupBy(BLUEPRINT_ANNOTATIONS, (a) => `${a.view}-${a.label.side}`);
    for (const [column, annotations] of columns) {
      const sorted = annotations.toSorted((a, b) => a.label.y - b.label.y);
      for (let i = 1; i < sorted.length; i++) {
        const [above, below] = [sorted[i - 1], sorted[i]];
        expect(
          below.label.y - above.label.y,
          `${column}: ${above.name} / ${below.name}`,
        ).toBeGreaterThanOrEqual(labelHeight(above.name));
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
