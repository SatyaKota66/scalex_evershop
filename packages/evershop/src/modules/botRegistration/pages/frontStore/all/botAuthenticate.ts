import { select } from '@evershop/postgres-query-builder';
import type { NextFunction, Response } from 'express';
import { pool } from '../../../../../lib/postgres/connection.js';
import { error } from '../../../../../lib/log/logger.js';
import type { EvershopRequest } from '../../../../../types/request.js';
import { verifyRsaJwt } from '../../../lib/crypto.js';

/**
 * Bot authentication middleware — runs on all frontStore routes.
 *
 * Supports two flows:
 *
 * Flow A – Direct key (stateless, one DB lookup per request):
 *   Bot sends: X-Bot-Key: <base64(publicKeyPem)>
 *   Server looks up the public key in bot_registration and sets req.botRegistration.
 *
 * Flow B – JWT Bearer (recommended after obtaining a token from POST /api/bot/token):
 *   Bot sends: Authorization: Bearer <rs256-jwt>
 *   Server decodes botUuid from JWT, fetches public key from DB, verifies RS256 signature.
 *   On success, sets req.botRegistration.
 *
 * Regular user requests (no bot headers) pass through without any DB hit.
 */
export default async (
  request: EvershopRequest,
  response: Response,
  next: NextFunction
) => {
  const req = request as unknown as Record<string, unknown>;
  const headers = request.headers;

  try {
    const authHeader = headers['authorization'] as string | undefined;
    const botKeyHeader = headers['x-bot-key'] as string | undefined;

    // Skip early — no bot headers present
    if (!botKeyHeader && !authHeader?.startsWith('Bearer ')) {
      return next();
    }

    // Flow B: JWT bearer token
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const rawPayload = Buffer.from(parts[1], 'base64url').toString('utf8');
          const { botUuid } = JSON.parse(rawPayload) as { botUuid?: string };

          if (botUuid) {
            const bot = await select()
              .from('bot_registration')
              .where('uuid', '=', botUuid)
              .load(pool);

            if (bot && bot.status === 'approved' && bot.api_key) {
              // Verify RS256 signature with the stored public key
              verifyRsaJwt(token, bot.api_key);
              req.botRegistration = bot;
            }
          }
        } catch {
          // Invalid or expired JWT — do not set botRegistration, let request continue
          // as an unauthenticated visitor (or downstream middleware can reject it)
        }
      }
      return next();
    }

    // Flow A: Direct public key header
    if (botKeyHeader) {
      try {
        const publicKeyPem = Buffer.from(botKeyHeader, 'base64').toString('utf8');
        const bot = await select()
          .from('bot_registration')
          .where('api_key', '=', publicKeyPem)
          .load(pool);

        if (bot && bot.status === 'approved') {
          req.botRegistration = bot;
        }
      } catch {
        // Malformed header — ignore
      }
    }

    next();
  } catch (e) {
    error(e);
    next();
  }
};
