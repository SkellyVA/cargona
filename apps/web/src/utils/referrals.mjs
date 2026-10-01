// Resolve only explicit invitations; referralCode is the customer's own code.
export function findInviter(customer, customers) {
  const reference = customer.invitedByCustomerId?.trim();
  if (!reference) return undefined;
  const code = reference.toUpperCase();
  const candidates = customers.filter((c) => c.id !== customer.id && c.tenantSlug === customer.tenantSlug);
  return candidates.find((c) => c.id === reference)
    || candidates.find((c) => c.cargoCode?.toUpperCase() === code || c.referralCode?.toUpperCase() === code)
    || candidates.find((c) => c.cargoCode?.toUpperCase().replace(/[^A-Z0-9]/g, '') === code.replace(/[^A-Z0-9]/g, ''));
}
