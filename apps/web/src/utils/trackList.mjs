export function parseTrackList(text) {
  return text.split(/[\r\n]+/).map(line => line.trim()).filter(Boolean);
}
