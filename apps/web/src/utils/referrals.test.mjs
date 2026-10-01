import assert from 'node:assert/strict';
import { findInviter, referralStartParam, parseReferralStartParam } from './referrals.mjs';

const inviter = { id: 'a', cargoCode: 'NOOR/S101', referralCode: 'custom', tenantSlug: 'noor' };
const otherTenant = { ...inviter, id: 'other', tenantSlug: 'other' };
const customers = [otherTenant, inviter];
for (const reference of ['a', 'noor/s101', 'NOORS101', 'custom']) {
  assert.equal(findInviter({ id: 'b', tenantSlug: 'noor', invitedByCustomerId: reference }, customers), inviter);
}
assert.equal(findInviter({ ...inviter, invitedByCustomerId: 'a' }, customers), undefined);
assert.equal(findInviter({ id: 'b', tenantSlug: 'noor', referralCode: 'custom' }, customers), undefined);
assert.equal(findInviter({ id: 'b', tenantSlug: 'noor', invitedByCustomerId: 'missing' }, customers), undefined);
assert.equal(findInviter({ id: 'b', tenantSlug: 'noor', invitedByCustomerId: 'other' }, customers), undefined);
console.log('Referral resolution checks passed');
for (const code of ['NOOR/S123', 'NOOR-001', 'КЛУБ:123', 'ABC_42']) {
  const parameter = referralStartParam(code);
  assert.match(parameter, /^[A-Za-z0-9_-]+$/);
  assert.equal(parseReferralStartParam(parameter), code);
}
assert.equal(parseReferralStartParam('ref_NOOR-001'), 'NOOR-001');
assert.equal(parseReferralStartParam('ref64_!'), '');
assert.equal(parseReferralStartParam(undefined), '');
console.log('Mini App referral parameters passed');
