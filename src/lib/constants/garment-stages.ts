export const DEFAULT_GARMENT_STAGES = [
  { name: "En Espera / En Cola", isFinalStage: false },
  { name: "Patronaje", isFinalStage: false },
  { name: "Corte y Preparación", isFinalStage: false },
  { name: "Confección / Costura", isFinalStage: false },
  { name: "Prueba y Ajustes", isFinalStage: false },
  { name: "Acabados y Control de Calidad", isFinalStage: false },
  { name: "Listo para Entrega / Completado", isFinalStage: true },
] as const;
