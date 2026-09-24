/**
 * CargonaOS Smart Importer — Schema Detector
 * Automatically inspects document structures and detects entity types & field mappings.
 */

export type DetectedEntityType = 'USERS' | 'TRACKS' | 'ORDERS_JUNCTION' | 'BRANCHES' | 'UNKNOWN';

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

  // For TRACKS
  trackingNumber?: string;
  status?: string;
  batchDate?: string;
  weight?: string;
  cost?: string;
  origin?: string;
  directCargoCode?: string;
  directChatId?: string;

  // For ORDERS_JUNCTION
  orderChatId?: string;
  orderUserId?: string;
  orderTrackCode?: string;
  orderStatus?: string;
}

export interface CollectionAnalysis {
  name: string;
  type: DetectedEntityType;
  sampleCount: number;
  mapping: FieldMapping;
}

const USER_CODE_KEYS = ['userid', 'cargocode', 'clientcode', 'user_id', 'cargo_code', 'client_code', 'code', 'clientid'];
const CHAT_ID_KEYS = ['chatid', 'chat_id', 'telegramid', 'telegram_id', 'tgid', 'tg_id', 'tgchatid', 'user_id'];
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

  // Check for ORDERS_JUNCTION (e.g. cargo_orders)
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

  // Check for USERS / CLIENTS
  const hasNameOrPhone = findKey(allKeys, FULL_NAME_KEYS) || findKey(allKeys, PHONE_KEYS);
  const isUsersName = /user|client|customer|member/i.test(lowerName);

  if (isUsersName || (hasNameOrPhone && (findKey(allKeys, USER_CODE_KEYS) || findKey(allKeys, CHAT_ID_KEYS)))) {
    mapping.cargoCode = findKey(allKeys, USER_CODE_KEYS);
    mapping.chatId = findKey(allKeys, CHAT_ID_KEYS);
    mapping.fullName = findKey(allKeys, FULL_NAME_KEYS);
    mapping.phone = findKey(allKeys, PHONE_KEYS);
    mapping.balance = findKey(allKeys, ['bonusBalance', 'balance', 'balanceUSD', 'deposit']);
    mapping.createdAt = findKey(allKeys, ['createdAt', 'created_at']);

    return {
      name: collectionName,
      type: 'USERS',
      sampleCount: sampleDocs.length,
      mapping,
    };
  }

  // Check for TRACKS / PARCELS
  const isTracksName = /track|parcel|package|cargo/i.test(lowerName);
  const trackKey = findKey(allKeys, TRACK_KEYS);

  if (isTracksName || trackKey) {
    mapping.trackingNumber = trackKey;
    mapping.status = findKey(allKeys, STATUS_KEYS);
    mapping.batchDate = findKey(allKeys, BATCH_KEYS);
    mapping.weight = findKey(allKeys, WEIGHT_KEYS);
    mapping.cost = findKey(allKeys, ['cost', 'price', 'amount', 'totalCost']);
    mapping.origin = findKey(allKeys, ['origin', 'country', 'city']);
    mapping.directCargoCode = findKey(allKeys, ['userCode', 'cargoCode', 'clientCode', 'userId']);
    mapping.directChatId = findKey(allKeys, ['chatId', 'telegramId']);
    mapping.createdAt = findKey(allKeys, ['createdAt', 'created_at', 'arrivedAtChina', 'date']);

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
