export function escapeTelegramHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function startReferral(text: string): string {
  const payload = text.match(/^\/start(?:@[\w]+)?\s+(\S+)\s*$/i)?.[1];
  if (!payload) return '';
  if (payload.startsWith('ref64_')) {
    const encoded = payload.slice(6);
    if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) return '';
    try {
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(base64), char => char.charCodeAt(0))).trim();
    } catch { return ''; }
  }
  return payload.startsWith('ref_') ? payload.slice(4) : payload;
}

export async function callTelegram(token: string, method: string, body: unknown): Promise<any> {
  let response: Response;
  try {
    response = await fetch(`https://api.telegram.org/bot${token.trim().replace(/^bot/i, '')}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new Error(`Telegram ${method}: network failure or timeout`);
  }
  const data = await response.json().catch(() => null) as any;
  if (!response.ok || !data?.ok) {
    // Telegram rejects web_app buttons in unsupported chat/bot contexts.
    // Retry once with URL buttons; keep the app URL and its referral parameter.
    const message = body as any;
    if (method === 'sendMessage' && data?.description?.includes('BUTTON_TYPE_INVALID') &&
        message?.reply_markup?.inline_keyboard?.some((row: any[]) => row.some(button => button.web_app))) {
      const inline_keyboard = message.reply_markup.inline_keyboard.map((row: any[]) => row.map(button => {
        if (!button.web_app) return button;
        const { web_app, ...rest } = button;
        return { ...rest, url: web_app.url };
      }));
      return callTelegram(token, method, { ...message, reply_markup: { ...message.reply_markup, inline_keyboard } });
    }
    throw new Error(`Telegram ${method}: ${data?.description || `HTTP ${response.status}`}`);
  }
  return data.result;
}
