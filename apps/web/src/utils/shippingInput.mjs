export function shippingInputToISO(value) {
  const text = value.trim();
  if (!text) return undefined;
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  if (!match) throw new Error('Укажите дату в формате ДД-ММ-ГГГГ');
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  if (Number.isNaN(Date.parse(iso)) || new Date(iso).toISOString().slice(0, 10) !== iso) throw new Error('Укажите существующую дату в формате ДД-ММ-ГГГГ');
  return iso;
}
