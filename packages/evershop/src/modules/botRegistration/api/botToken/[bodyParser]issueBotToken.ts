import { select } from '@evershop/postgres-query-builder';
import type { NextFunction } from 'express';
import { pool } from '../../../../lib/postgres/connection.js';
import { INTERNAL_SERVER_ERROR, OK } from '../../../../lib/util/httpStatus.js';
import { error } from '../../../../lib/log/logger.js';
import type { EvershopRequest } from '../../../../types/request.js';
import type { EvershopResponse } from '../../../../types/response.js';
import { decryptPrivateKey, issueRsaJwt } from '../../lib/crypto.js';

const UNAUTHORIZED = 401;

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: NextFunction
) => {
  try {
    // Bot sends its public key (base64-encoded PEM) in X-Bot-Key header
    const botKeyHeader = request.headers['x-bot-key'] as string | undefined;
    if (!botKeyHeader) {
      response.status(UNAUTHORIZED);
      response.json({
        error: {
          status: UNAUTHORIZED,
          message: 'X-Bot-Key header is required. Provide your base64-encoded RSA public key.'
        }
      });
      return;
    }

    let publicKeyPem: string;
    try {
      publicKeyPem = Buffer.from(botKeyHeader, 'base64').toString('utf8');
    } catch {
      response.status(UNAUTHORIZED);
      response.json({ error: { status: UNAUTHORIZED, message: 'X-Bot-Key must be base64-encoded.' } });
      return;
    }

    const bot = await select()
      .from('bot_registration')
      .where('api_key', '=', publicKeyPem)
      .load(pool);

    if (!bot) {
      response.status(UNAUTHORIZED);
      response.json({ error: { status: UNAUTHORIZED, message: 'Public key not recognised.' } });
      return;
    }

    if (bot.status !== 'approved') {
      response.status(UNAUTHORIZED);
      response.json({
        error: {
          status: UNAUTHORIZED,
          message: `Bot registration is '${bot.status}'. Only approved bots may obtain tokens.`
        }
      });
      return;
    }

    if (!bot.api_secret) {
      response.status(INTERNAL_SERVER_ERROR);
      response.json({
        error: {
          status: INTERNAL_SERVER_ERROR,
          message: 'Key pair not found for this bot. Contact the platform admin.'
        }
      });
      return;
    }

    const privateKey = decryptPrivateKey(bot.api_secret);
    const expiresIn = 3600; // 1 hour

    // Sign JWT with the bot's RSA private key (RS256)
    const token = issueRsaJwt(
      { botUuid: bot.uuid, botName: bot.bot_name, orgName: bot.organization_name },
      privateKey,
      expiresIn
    );

    response.status(OK);
    response.$body = {
      data: {
        token,
        tokenType: 'Bearer',
        expiresIn,
        botName: bot.bot_name,
        orgName: bot.organization_name,
        usage: 'Send as: Authorization: Bearer <token>'
      }
    };
    next();
  } catch (e) {
    error(e);
    response.status(INTERNAL_SERVER_ERROR);
    response.json({
      error: { status: INTERNAL_SERVER_ERROR, message: (e as Error).message }
    });
  }
};
