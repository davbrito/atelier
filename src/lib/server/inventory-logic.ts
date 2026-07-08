/**
 * Computes the signed ledger delta for a movement. For "entry"/"exit" the
 * delta is independent of current stock; for "adjustment" it's the amount
 * needed to bring stock from `currentStock` to `quantity` (the target).
 */
export function computeMovementDelta(
  type: "entry" | "exit" | "adjustment",
  quantity: number,
  currentStock: number,
): string {
  if (type === "adjustment") return (quantity - currentStock).toFixed(4);
  return type === "entry" ? quantity.toFixed(4) : (-quantity).toFixed(4);
}
