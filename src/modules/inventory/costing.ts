// Weighted-average costing helpers.
// Future FIFO can layer in here using the existing InventoryMovement ledger.

export function newAvgCostCents(args: {
  currentOnHand: number;
  currentAvgCostCents: number;
  receivedQty: number;
  receivedUnitCostCents: number;
}): number {
  const { currentOnHand, currentAvgCostCents, receivedQty, receivedUnitCostCents } = args;
  if (currentOnHand <= 0) return receivedUnitCostCents;
  const total = currentOnHand * currentAvgCostCents + receivedQty * receivedUnitCostCents;
  const qty = currentOnHand + receivedQty;
  if (qty <= 0) return receivedUnitCostCents;
  return Math.round(total / qty);
}

export function reorderSuggestion(args: {
  onHand: number;
  parLevel: number;
  reorderPoint: number;
  reorderQty: number;
}): number {
  const { onHand, parLevel, reorderPoint, reorderQty } = args;
  if (onHand > reorderPoint) return 0;
  // top up to par, fallback to reorderQty if par smaller than reorder qty
  const toPar = Math.max(parLevel - onHand, 0);
  return Math.max(toPar, reorderQty);
}
