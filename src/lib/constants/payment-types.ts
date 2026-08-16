export const PAYMENT_TYPES = [
  { code: "efectivo", label: "Efectivo" },
  { code: "pago_movil", label: "Pago Móvil" },
  { code: "transferencia", label: "Transferencia" },
  { code: "binance", label: "Binance" },
  { code: "zelle", label: "Zelle" },
  { code: "otro", label: "Otro" },
] as const;

export type PaymentTypeCode = (typeof PAYMENT_TYPES)[number]["code"];

export const PAYMENT_TYPE_CODES = PAYMENT_TYPES.map((t) => t.code) as [
  PaymentTypeCode,
  ...PaymentTypeCode[],
];

export function paymentTypeLabel(code: string): string {
  return PAYMENT_TYPES.find((t) => t.code === code)?.label ?? code;
}
