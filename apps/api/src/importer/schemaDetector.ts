/**
 * CargonaOS Smart Importer — Schema Detector
 * Automatically inspects document structures and detects entity types & field mappings.
 */

export type DetectedEntityType =
  | 'USERS'
  | 'TRACKS'
  | 'ORDERS_JUNCTION'
  | 'BRANCHES'
  | 'SETTINGS'
  | 'TRANSACTIONS'
  | 'COMPLAINTS'
  | 'UNKNOWN';

export interface FieldMapping {
  // Common
  id?: string;
  createdAt?: string;
  updatedAt?: string;

  // For USERS
  cargoCode?: string;
  chatId?: string;
  fullName?: string;
  phone?: string;
  balance?: string;
  debt?: string;
  address?: string;
  city?: string;

  // For TRACKS
  trackingNumber?: string;
  status?: string;
  batchDate?: string;
  weight?: string;
  cost?: string;
  origin?: string;
  directCargoCode?: string;
  directChatId?: string;
  places?: string;
  storageCost?: string;
  deliveredAt?: string;
  employeeId?: string;

  // For ORDERS_JUNCTION
  orderChatId?: string;
  orderUserId?: string;
  orderTrackCode?: string;
  orderStatus?: string;

  // For BRANCHES
  branchName?: string;
  deliveryRateKg?: string;
  storageRate?: string;
  freeDays?: string;

  // For SETTINGS
  deliveryRate?: string;
  companyPriceIu?: string;
  companyPriceUrumqi?: string;

  // For TRANSACTIONS
  txType?: string;
  txAmount?: string;
  txCategory?: string;
  txComment?: string;
  txDebtCreated?: string;

  // For COMPLAINTS
  complaintUser?: string;
  complaintChatId?: string;
  complaintText?: string;
  complaintStatus?: string;
  complaintResponse?: string;
}

export interface CollectionAnalysis {
  name: string;
  type: DetectedEntityType;
  sampleCount: number;
  mapping: FieldMapping;
}

const USER_CODE_KEYS = ['userid', 'cargocode', 'clientcode', 'user_id', 'cargo_code', 'client_code', 'code', 'clientid'];
const CHAT_ID_KEYS = ['chatid', 'chat_id', 'telegramid', 'telegram_id', 'tgid', 'tg_id', 'tgchatid'];
const FULL_NAME_KEYS = ['fullname', 'full_name', 'name', 'clientname', 'fio', 'username'];
const PHONE_KEYS = ['phone', 'telephone', 'mobile', 'phonenumber', 'phone_number', 'tel'];
const TRACK_KEYS = ['code', 'trackcode', 'track_code', 'trackingnumber', 'tracking_number', 'track', 'r_code', 'barcode', 'number'];
const STATUS_KEYS = ['status', 'state', 'trackstatus', 'currentstatus'];
const WEIGHT_KEYS = ['weight', 'weightkg', 'totalweight', 'netweight', 'grossweight', 'kg'];
const BATCH_KEYS = ['batchdate', 'batch_date', 'flight', 'flightnumber', 'trip', 'tripdate', 'date'];

function findKey(keys: string[], candidates: string[]): string | undefined {
  const lowerMap = new Map(keys.map((k) => [k.toLowerCase().replace(/[-_]/g, ''), k]));
  for (const c of candidates) {
    const norm = c.toLowerCase().replace(/[-_]/g, '');
    if (lowerMap.has(norm)) {
      return lowerMap.get(norm);
    }
  }
  return undefined;
}

export function analyzeCollection(collectionName: string, sampleDocs: Record<string, any>[]): CollectionAnalysis {
  if (!sampleDocs || sampleDocs.length === 0) {
    return {
      name: collectionName,
      type: 'UNKNOWN',
      sampleCount: 0,
      mapping: {},
    };
  }

  // Collect all unique keys from sample documents
  const allKeys = Array.from(
    new Set(
      sampleDocs.flatMap((doc) => Object.keys(doc))
    )
  );

  const lowerName = collectionName.toLowerCase();
  const mapping: FieldMapping = {};

  // 1. Check for BRANCHES (e.g. cargo_branches)
  if (/branch|pvz|filial|office/i.test(lowerName) || (findKey(allKeys, ['deliveryRateKg', 'deliveryRateCube']))) {
    mapping.branchName = findKey(allKeys, ['name', 'branchName', 'title', 'city']);
    mapping.deliveryRateKg = findKey(allKeys, ['deliveryRateKg', 'deliveryRate', 'rateKg']);
    mapping.storageRate = findKey(allKeys, ['storageRate', 'storagePrice']);
    mapping.freeDays = findKey(allKeys, ['freeDays', 'freeStorageDays']);
    return {
      name: collectionName,
      type: 'BRANCHES',
      sampleCount: sampleDocs.length,
      mapping,
    };
  }

  // 2. Check for SETTINGS (e.g. cargo_settings)
  if (/setting|config|tariff|rate/i.test(lowerName) || (findKey(allKeys, ['companyPriceIu', 'warehouseWeight']))) {
    mapping.deliveryRate = findKey(allKeys, ['deliveryRate', 'autoRate', 'rate']);
    mapping.storageRate = findKey(allKeys, ['storageRate', 'storagePrice']);
    mapping.freeDays = findKey(allKeys, ['freeDays', 'freeStorageDays']);
    mapping.companyPriceIu = findKey(allKeys, ['companyPriceIu', 'priceIu']);
    mapping.companyPriceUrumqi = findKey(allKeys, ['companyPriceUrumqi', 'priceUrumqi']);
    return {
      name: collectionName,
      type: 'SETTINGS',
      sampleCount: sampleDocs.length,
      mapping,
    };
  }

  // 3. Check for TRANSACTIONS (e.g. cargo_transactions)
  if (/transaction|payment|fin|income|expense/i.test(lowerName) || (findKey(allKeys, ['debtCreated', 'category']) && findKey(allKeys, ['amount', 'sum']))) {
    mapping.txType = findKey(allKeys, ['type', 'direction', 'txType']);
    mapping.txAmount = findKey(allKeys, ['amount', 'sum', 'cost', 'total']);
    mapping.txCategory = findKey(allKeys, ['category', 'operation', 'title']);
    mapping.txComment = findKey(allKeys, ['comment', 'description', 'notes', 'details']);
    mapping.txDebtCreated = findKey(allKeys, ['debtCreated', 'debt']);
    mapping.createdAt = findKey(allKeys, ['createdAt', 'created_at', 'date', 'time']);
    return {
      name: collectionName,
      type: 'TRANSACTIONS',
      sampleCount: sampleDocs.length,
      mapping,
    };
  }

  // 4. Check for COMPLAINTS (e.g. cargo_complaints)
  if (/complaint|claim|ticket|review|feedback/i.test(lowerName) || findKey(allKeys, ['adminResponse', 'respondedAt'])) {
    mapping.complaintUser = findKey(allKeys, ['userId', 'userName', 'username', 'user']);
    mapping.complaintChatId = findKey(allKeys, CHAT_ID_KEYS);
    mapping.complaintText = findKey(allKeys, ['text', 'message', 'comment', 'complaint']);
    mapping.complaintStatus = findKey(allKeys, STATUS_KEYS);
    mapping.complaintResponse = findKey(allKeys, ['adminResponse', 'response', 'answer', 'reply']);
    mapping.createdAt = findKey(allKeys, ['createdAt', 'created_at', 'date']);
    return {
      name: collectionName,
      type: 'COMPLAINTS',
      sampleCount: sampleDocs.length,
      mapping,
    };
  }

  // 5. Check for ORDERS_JUNCTION (e.g. cargo_orders)
  const hasChatOrUser = findKey(allKeys, CHAT_ID_KEYS) || findKey(allKeys, USER_CODE_KEYS);
  const hasTrack = findKey(allKeys, ['trackCode', 'track_code', 'trackingNumber', 'track']);
  const isOrdersName = /order|link|relation|subscription|user_track/i.test(lowerName);

  if (isOrdersName || (hasChatOrUser && hasTrack && sampleDocs.length > 0 && !findKey(allKeys, FULL_NAME_KEYS))) {
    mapping.orderChatId = findKey(allKeys, CHAT_ID_KEYS);
    mapping.orderUserId = findKey(allKeys, USER_CODE_KEYS);
    mapping.orderTrackCode = hasTrack || findKey(allKeys, TRACK_KEYS);
    mapping.orderStatus = findKey(allKeys, STATUS_KEYS);
    mapping.createdAt = findKey(allKeys, ['createdAt', 'created_at', 'date']);

    return {
      name: collectionName,
      type: 'ORDERS_JUNCTION',
      sampleCount: sampleDocs.length,
      mapping,
    };
  }

  // 6. Check for USERS / CLIENTS
  const hasNameOrPhone = findKey(allKeys, FULL_NAME_KEYS) || findKey(allKeys, PHONE_KEYS);
  const isUsersName = /user|client|customer|member/i.test(lowerName);

  if (isUsersName || (hasNameOrPhone && (findKey(allKeys, USER_CODE_KEYS) || findKey(allKeys, CHAT_ID_KEYS)))) {
    mapping.cargoCode = findKey(allKeys, USER_CODE_KEYS);
    mapping.chatId = findKey(allKeys, CHAT_ID_KEYS);
    mapping.fullName = findKey(allKeys, FULL_NAME_KEYS);
    mapping.phone = findKey(allKeys, PHONE_KEYS);
    mapping.balance = findKey(allKeys, ['bonusBalance', 'balance', 'balanceUSD', 'deposit']);
    mapping.debt = findKey(allKeys, ['debt', 'duty', 'credit']);
    mapping.address = findKey(allKeys, ['address', 'location', 'street']);
    mapping.city = findKey(allKeys, ['city', 'region', 'town']);
    mapping.createdAt = findKey(allKeys, ['createdAt', 'created_at']);

    return {
      name: collectionName,
      type: 'USERS',
      sampleCount: sampleDocs.length,
      mapping,
    };
  }

  // 7. Check for TRACKS / PARCELS
  const isTracksName = /track|parcel|package|cargo/i.test(lowerName);
  const trackKey = findKey(allKeys, TRACK_KEYS);

  if (isTracksName || trackKey) {
    mapping.trackingNumber = trackKey;
    mapping.status = findKey(allKeys, STATUS_KEYS);
    mapping.batchDate = findKey(allKeys, BATCH_KEYS);
    mapping.weight = findKey(allKeys, WEIGHT_KEYS);
    mapping.cost = findKey(allKeys, ['deliveryCost', 'cost', 'price', 'amount', 'totalCost']);
    mapping.storageCost = findKey(allKeys, ['storageCost', 'storage']);
    mapping.places = findKey(allKeys, ['places', 'pieces', 'count', 'qty']);
    mapping.origin = findKey(allKeys, ['origin', 'country', 'city']);
    mapping.directCargoCode = findKey(allKeys, ['userCode', 'cargoCode', 'clientCode', 'userId', 'user_id']);
    mapping.directChatId = findKey(allKeys, ['chatId', 'telegramId', 'subscribers']);
    mapping.deliveredAt = findKey(allKeys, ['deliveredAt', 'releasedAt', 'handedAt']);
    mapping.employeeId = findKey(allKeys, ['employeeId', 'operatorId', 'courierId']);
    mapping.createdAt = findKey(allKeys, ['createdAt', 'created_at', 'arrivedAtChina', 'receivedAt', 'date']);

    return {
      name: collectionName,
      type: 'TRACKS',
      sampleCount: sampleDocs.length,
      mapping,
    };
  }

  return {
    name: collectionName,
    type: 'UNKNOWN',
    sampleCount: sampleDocs.length,
    mapping,
  };
}
