export function isWeightPending(pkg) {
  return pkg?.weightPending === true || (!Number(pkg?.weightKg) && !Number(pkg?.costUSD ?? pkg?.cost));
}
export function weighedCost(weightKg, ratePerKg, minimumCost) {
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw new Error('Укажите фактический положительный вес');
  return Math.max(Math.round(weightKg * ratePerKg * 100) / 100, minimumCost);
}
