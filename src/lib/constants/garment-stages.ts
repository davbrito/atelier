export const DEFAULT_GARMENT_STAGES = [
  { name: "En Espera / En Cola", color: "#94a3b8", isFinalStage: false },
  { name: "Patronaje", color: "#60a5fa", isFinalStage: false },
  { name: "Corte y Preparación", color: "#fb923c", isFinalStage: false },
  { name: "Confección / Costura", color: "#a78bfa", isFinalStage: false },
  { name: "Prueba y Ajustes", color: "#f472b6", isFinalStage: false },
  { name: "Acabados y Control de Calidad", color: "#facc15", isFinalStage: false },
  { name: "Listo para Entrega / Completado", color: "#4ade80", isFinalStage: true },
] as const;
