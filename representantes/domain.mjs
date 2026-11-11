import {createHash} from 'node:crypto';

export const COMMISSION_BPS = 500; // 5% do valor bruto, apenas na primeira transação elegível.
export const PLATFORM_BPS = 1500;
export const VENUE_BPS = 8500;
export const CONTRACT_VERSION = 'draft-2026-11-11-v1';
export const cents = value => Number.isSafeInteger(value) && value >= 0;
export const fingerprint = value => createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
export const split = gross => {
  if (!cents(gross)) throw new Error('invalid_amount');
  const venue = Math.floor(gross * VENUE_BPS / 10000);
  const platformGross = gross - venue;
  const representative = Math.floor(gross * COMMISSION_BPS / 10000);
  return {gross,venue,platformGross,representative,platformNet:platformGross-representative};
};
export const leadTypes = ['advertiser','venue'];
export const leadStatuses = ['new','contacted','qualified','registered','converted','lost'];
export const payoutStatuses = ['pending','eligible','approved','paid','cancelled'];
export const publicLead = row => ({id:row.id,type:row.type,name:row.name,status:row.status,created_at:row.created_at,converted_at:row.converted_at||null});
