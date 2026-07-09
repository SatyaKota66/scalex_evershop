import { select } from '@evershop/postgres-query-builder';
import type { NextFunction } from 'express';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  NOT_FOUND,
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import { error } from '../../../../lib/log/logger.js';
import type { EvershopRequest } from '../../../../types/request.js';
import type { EvershopResponse } from '../../../../types/response.js';

export default async (request: EvershopRequest, response: EvershopResponse, next: NextFunction) => {
  try {
    const { uuid } = request.params as { uuid: string };

    const registration = await select()
      .from('bot_registration')
      .where('uuid', '=', uuid)
      .load(pool);

    if (!registration) {
      response.status(NOT_FOUND);
      response.json({ error: { status: NOT_FOUND, message: 'Registration not found' } });
      return;
    }

    response.status(OK);
    response.$body = {
      data: {
        uuid: registration.uuid,
        bot_name: registration.bot_name,
        organization_name: registration.organization_name,
        contact_email: registration.contact_email,
        purpose_of_access: registration.purpose_of_access,
        status: registration.status,
        requested_permissions: registration.requested_permissions,
        intended_actions: registration.intended_actions,
        created_at: registration.created_at
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
