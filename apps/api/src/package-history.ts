const fields = ['status', 'currentBranchId', 'branchId', 'targetBranchId', 'shelfLocation', 'tripId', 'sackId', 'customerId', 'customerCargoCode', 'trackingNumber', 'weightKg', 'cost', 'costUSD', 'description', 'releasedAt', 'readyAt', 'shippedAt'] as const;

export function packageSnapshot(pkg: any): Record<string, unknown> {
  return Object.fromEntries(fields.map(field => [field, pkg[field] ?? null]));
}

export function packageChanges(before: Record<string, unknown>, after: Record<string, unknown>) {
  return fields.filter(field => before[field] !== after[field]).map(field => ({ field, before: before[field], after: after[field] }));
}
