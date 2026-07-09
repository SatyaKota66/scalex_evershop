import { select, update } from '@evershop/postgres-query-builder';
import type { NextFunction } from 'express';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INVALID_PAYLOAD,
  NOT_FOUND,
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import { error } from '../../../../lib/log/logger.js';
import type { EvershopRequest } from '../../../../types/request.js';
import type { EvershopResponse } from '../../../../types/response.js';
import { generateBotKeyPair, encryptPrivateKey } from '../../lib/crypto.js';

const ALLOWED_STATUSES = ['pending', 'approved', 'rejected'];

export default async (
  request: EvershopRequest,
  response: EvershopResponse,
  next: NextFunction
) => {
  try {
    const { uuid } = request.params as { uuid: string };
    const body = request.body as { status?: string; admin_note?: string };

    if (!body.status || !ALLOWED_STATUSES.includes(body.status)) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`
        }
      });
      return;
    }

    const existing = await select()
      .from('bot_registration')
      .where('uuid', '=', uuid)
      .load(pool);

    if (!existing) {
      response.status(NOT_FOUND);
      response.json({ error: { status: NOT_FOUND, message: 'Registration not found' } });
      return;
    }

    const updateData: Record<string, string> = { status: body.status };
    if (body.admin_note !== undefined) {
      updateData.admin_note = body.admin_note;
    }

    // Generate RSA-2048 key pair on first approval
    let publicKey: string | null = null;
    if (body.status === 'approved' && !existing.api_key) {
      const keyPair = generateBotKeyPair();
      publicKey = keyPair.publicKey;
      updateData.api_key = keyPair.publicKey;
      updateData.api_secret = encryptPrivateKey(keyPair.privateKey);
    } else if (body.status === 'approved' && existing.api_key) {
      publicKey = existing.api_key;
    }

    await update('bot_registration')
      .given(updateData)
      .where('uuid', '=', uuid)
      .execute(pool);

    const updated = await select()
      .from('bot_registration')
      .where('uuid', '=', uuid)
      .load(pool);

    response.status(OK);
    response.$body = {
      data: {
        uuid: updated.uuid,
        status: updated.status,
        publicKey,
        message:
          body.status === 'approved'
            ? 'Bot approved. Share the public key with the bot owner to enable authenticated access.'
            : `Status updated to ${body.status}.`
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
