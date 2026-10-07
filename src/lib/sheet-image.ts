/** Tamaño del área útil de la ficha (190 × 259 mm a 96 dpi) más 10 mm de margen blanco. */
const SHEET_WIDTH_PX = 718;
const SHEET_HEIGHT_PX = 979;
const MARGIN_PX = 38;

/** `true` si el navegador puede compartir imágenes (hoja de compartir del móvil). */
export function canShareImages() {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] });
  } catch {
    return false;
  }
}

/**
 * Genera un PNG de la ficha de taller (`[data-print-sheet]`, que solo se ve al imprimir).
 * Se maqueta una copia fuera de pantalla con el tamaño de la hoja para capturarla.
 */
async function renderPrintSheet() {
  const sheet = document.querySelector<HTMLElement>("[data-print-sheet]");
  if (!sheet) throw new Error("Ficha de taller no encontrada");

  const clone = sheet.cloneNode(true) as HTMLElement;
  clone.removeAttribute("data-print-sheet");
  Object.assign(clone.style, {
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    top: "0",
    left: "-10000px",
    width: `${SHEET_WIDTH_PX}px`,
    height: `${SHEET_HEIGHT_PX}px`,
    padding: `${MARGIN_PX}px`,
    boxSizing: "content-box",
    overflow: "hidden",
  });
  document.body.appendChild(clone);
  try {
    const { domToBlob } = await import("modern-screenshot");
    return await domToBlob(clone, { scale: 2, backgroundColor: "#fff", type: "image/png" });
  } finally {
    clone.remove();
  }
}

/** Comparte la ficha como imagen si el dispositivo lo permite; si no, la descarga. */
export async function shareOrDownloadPrintSheet({
  fileName,
  title,
}: {
  fileName: string;
  title: string;
}) {
  const blob = await renderPrintSheet();
  const file = new File([blob], fileName, { type: "image/png" });

  if (canShareImages()) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (error) {
      // El usuario cerró la hoja de compartir: no es un error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Otros fallos (p. ej. se perdió el gesto del usuario mientras se generaba): se descarga.
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
