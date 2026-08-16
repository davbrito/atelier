export const ORDER_STATUSES = [
  { code: "pending", label: "Pendiente", variant: "outline" },
  { code: "in_progress", label: "En progreso", variant: "secondary" },
  { code: "ready", label: "Listo", variant: "default" },
  { code: "delivered", label: "Entregado", variant: "default" },
  { code: "cancelled", label: "Cancelado", variant: "destructive" },
] as const;

export type OrderStatusCode = (typeof ORDER_STATUSES)[number]["code"];

export const ORDER_STATUS_CODES = ORDER_STATUSES.map((s) => s.code) as [
  OrderStatusCode,
  ...OrderStatusCode[],
];

export function orderStatusLabel(code: string): string {
  return ORDER_STATUSES.find((s) => s.code === code)?.label ?? code;
}

export function orderStatusVariant(
  code: string,
): "outline" | "secondary" | "default" | "destructive" {
  return ORDER_STATUSES.find((s) => s.code === code)?.variant ?? "outline";
}
