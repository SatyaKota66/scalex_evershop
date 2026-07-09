import type { NextFunction, Response } from 'express';
import type { EvershopRequest } from '../../../../../types/request.js';

type BotRecord = {
  uuid: string;
  bot_name: string;
  organization_name: string;
  status: string;
  requested_permissions: string[] | string;
  intended_actions: string[] | string;
};

function parseJsonField(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

function blockResponse(
  response: Response,
  request: EvershopRequest,
  statusCode: number,
  message: string,
  redirectPath?: string
) {
  response.status(statusCode);
  const wantsJson =
    (request.headers['accept'] ?? '').includes('application/json') ||
    (request.headers['content-type'] ?? '').includes('application/json') ||
    request.path.startsWith('/api/');

  if (wantsJson) {
    return response.json({ error: { status: statusCode, message } });
  }
  // Minimal HTML block page for browser-like requests
  return response.send(`<!doctype html><html lang="en"><head>
<meta charset="utf-8"><title>Access Denied</title>
<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f8f8}
.box{max-width:480px;padding:2rem;background:#fff;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,.08);text-align:center}
h1{color:#c0392b;margin:0 0 .5rem}p{color:#555;margin:.5rem 0}.btn{display:inline-block;margin-top:1rem;padding:.6rem 1.4rem;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-size:.9rem}
</style></head><body><div class="box">
<h1>🤖 Bot Access Denied</h1>
<p>${message}</p>
${redirectPath ? `<a class="btn" href="${redirectPath}">Register your bot</a>` : ''}
</div></body></html>`);
}

/**
 * Bot gate middleware — runs after botAuthenticate.ts.
 *
 * When the Python bot-detection script signals X-Is-Bot: 1 on the request:
 *   - Approved registered bot  → allowed; req.botPermissions is set
 *   - Pending registration     → 403 blocked
 *   - Rejected registration    → 403 blocked
 *   - Unknown / unregistered   → 403 blocked, redirected to /bot/register
 *
 * Requests with no X-Is-Bot: 1 header pass through untouched (normal users).
 */
export default function botGate(
  request: EvershopRequest,
  response: Response,
  next: NextFunction
) {
  const isBotHeader = request.headers['x-is-bot'] as string | undefined;

  // Not flagged as a bot by the detection script — let the request through
  if (isBotHeader !== '1') {
    return next();
  }

  const req = request as unknown as Record<string, unknown>;
  const bot = req.botRegistration as BotRecord | undefined;

  // Detected as bot but no valid registration / authentication header provided
  if (!bot) {
    return blockResponse(
      response,
      request,
      403,
      'Bot detected but not registered on this platform. Please register your bot to gain access.',
      '/bot/register'
    );
  }

  if (bot.status === 'pending') {
    return blockResponse(
      response,
      request,
      403,
      'Your bot registration is awaiting admin approval. Access is blocked until approved.'
    );
  }

  if (bot.status === 'rejected') {
    return blockResponse(
      response,
      request,
      403,
      'Your bot registration has been rejected. Contact the platform administrator.'
    );
  }

  // status === 'approved' — attach granted permissions to the request for downstream use
  req.botPermissions = parseJsonField(bot.requested_permissions);
  req.botActions = parseJsonField(bot.intended_actions);

  next();
}
