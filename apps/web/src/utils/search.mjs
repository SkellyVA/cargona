// Ignore formatting in Cargo IDs, tracks and phones; match all words in any order.
export function matchesSearch(query, values) {
  const normalize = value => String(value ?? '').normalize('NFKC').toLocaleLowerCase('ru').replaceAll('ё', 'е');
  const compact = value => normalize(value).replace(/[^\p{L}\p{N}]/gu, '');
  const text = normalize(query).trim();
  if (!text) return true;
  const fields = values.map(compact);
  const whole = compact(text);
  if (!whole) return false;
  if (fields.some(field => field.includes(whole))) return true;
  const words = text.split(/\s+/).map(compact).filter(Boolean);
  return words.length > 0 && words.every(word => fields.some(field => field.includes(word)));
}
