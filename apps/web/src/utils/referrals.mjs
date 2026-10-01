// Telegram startapp accepts URL-safe characters; cargo codes can contain slashes.
export function referralStartParam(code) {
  const bytes = new TextEncoder().encode(code);
  return `ref64_${btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

export function parseReferralStartParam(value) {
  if (typeof value !== 'string') return '';
  if (value.startsWith('ref64_')) {
    try {
      const encoded = value.slice(6).replace(/-/g, '+').replace(/_/g, '/');
      return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(encoded), char => char.charCodeAt(0))).trim();
    } catch { return ''; }
  }
  return value.startsWith('ref_') ? value.slice(4).trim() : '';
}

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
