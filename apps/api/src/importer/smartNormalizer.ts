/**
 * CargonaOS Smart Importer — Normalizers
 * Intelligently cleans and normalizes various date, phone, status, and code formats
 * from different legacy cargo bots and databases.
 */

export function normalizeStatus(rawStatus: any): 'RECEIVED_AT_ORIGIN' | 'IN_TRANSIT' | 'CUSTOMS' | 'READY_FOR_PICKUP' | 'RELEASED' | 'RETURNED' {
  if (!rawStatus || typeof rawStatus !== 'string') {
    return 'READY_FOR_PICKUP';
  }

  const s = rawStatus.toLowerCase().trim();

  // 1. Выдан / Получен клиентом
  if (/выдан|получен|забрал|выдано|доставлен.*клиент|архив|completed|released|delivered/i.test(s)) {
    return 'RELEASED';
  }

  // 2. Возврат
  if (/возврат|отменен|вернут|return/i.test(s)) {
    return 'RETURNED';
  }

  // 3. Таможня
  if (/таможн|граница|оформлен|customs|border/i.test(s)) {
    return 'CUSTOMS';
  }

  // 4. В пути / Рейс
  if (/в пути|отправлен|дорог|рейс|выехал|транзит|in[_\s-]?transit|on[_\s-]?the[_\s-]?way/i.test(s)) {
    return 'IN_TRANSIT';
  }

  // 5. Готов к выдаче / На складе в стране назначения (ПВЗ)
  if (/таджикистан|душанбе|склад.*(тч|tj|душанбе|хлебзавод|пвз|готов)|готов.*выдач|прибыл|ready|pickup|arrived/i.test(s)) {
    return 'READY_FOR_PICKUP';
  }

  // 6. Принято на складе отправления (Китай / Турция / ОАЭ)
  if (/китай|склад.*кита|иу|гуанчжоу|yiwu|guangzhou|china|получен.*кита|принят.*кита|received.*origin/i.test(s)) {
    return 'RECEIVED_AT_ORIGIN';
  }

  return 'READY_FOR_PICKUP';
}

export function normalizeDate(rawDate: any): string {
  if (!rawDate) return new Date().toISOString();

  // MongoDB Extended JSON format: { $date: "..." } or { $date: 1234567890 }
  if (typeof rawDate === 'object') {
    if (rawDate.$date) {
      const d = new Date(rawDate.$date);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
  }

  if (rawDate instanceof Date) {
    return rawDate.toISOString();
  }

  if (typeof rawDate === 'number') {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  if (typeof rawDate === 'string') {
    // Check format DD.MM.YYYY
    const dmyMatch = rawDate.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      const d = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00:00.000Z`);
      if (!isNaN(d.getTime())) return d.toISOString();
    }

    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  return new Date().toISOString();
}

export function normalizePhone(rawPhone: any): string {
  if (!rawPhone || typeof rawPhone !== 'string') return '';
  const trimmed = rawPhone.trim();

  // Filter out placeholder strings like "empty_2", "не указан", "none", "null"
  if (/^empty/i.test(trimmed) || /не указан/i.test(trimmed) || trimmed === '-' || trimmed.toLowerCase() === 'null') {
    return '';
  }

  // Clean non-digit characters except leading +
  const cleaned = trimmed.replace(/[^\d+]/g, '');
  return cleaned.length >= 5 ? cleaned : '';
}

export function normalizeCargoCode(rawCode: any): string {
  if (!rawCode) return '';
  const s = String(rawCode).trim();
  // If code is something like "MIR/D2" or "CARGO-D2", extract the core ID if needed, or uppercase
  return s.toUpperCase();
}

export function normalizeTrackingNumber(rawTrack: any): string {
  if (!rawTrack) return '';
  return String(rawTrack).trim().replace(/\s+/g, '');
}
