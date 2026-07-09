import { insert, select } from '@evershop/postgres-query-builder';
import { NextFunction } from 'express';
import { pool } from '../../../../lib/postgres/connection.js';
import {
  INVALID_PAYLOAD,
  INTERNAL_SERVER_ERROR,
  OK
} from '../../../../lib/util/httpStatus.js';
import { error } from '../../../../lib/log/logger.js';
import type { EvershopRequest } from '../../../../types/request.js';
import type { EvershopResponse } from '../../../../types/response.js';

const ALLOWED_PERMISSIONS = [
  'browse_catalog',
  'search_products',
  'create_cart',
  'initiate_checkout',
  'read_orders',
  'manage_wishlist'
];

const ALLOWED_ACTIONS = ['browse', 'search', 'cart_creation', 'checkout_initiation'];

function validatePayload(body: Record<string, unknown>): string | null {
  if (!body.bot_name || typeof body.bot_name !== 'string' || !body.bot_name.trim()) {
    return 'bot_name is required';
  }
  if (!body.organization_name || typeof body.organization_name !== 'string' || !body.organization_name.trim()) {
    return 'organization_name is required';
  }
  if (!body.contact_email || typeof body.contact_email !== 'string') {
    return 'contact_email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(body.contact_email as string)) {
    return 'contact_email must be a valid email address';
  }
  if (!body.purpose_of_access || typeof body.purpose_of_access !== 'string' || !body.purpose_of_access.trim()) {
    return 'purpose_of_access is required';
  }
  if (body.callback_url && typeof body.callback_url === 'string') {
    try {
      new URL(body.callback_url as string);
    } catch {
      return 'callback_url must be a valid URL';
    }
  }
  if (!Array.isArray(body.requested_permissions) || body.requested_permissions.length === 0) {
    return 'requested_permissions must be a non-empty array';
  }
  const invalidPermissions = (body.requested_permissions as string[]).filter(
    (p) => !ALLOWED_PERMISSIONS.includes(p)
  );
  if (invalidPermissions.length > 0) {
    return `Invalid permissions: ${invalidPermissions.join(', ')}`;
  }
  if (!Array.isArray(body.intended_actions) || body.intended_actions.length === 0) {
    return 'intended_actions must be a non-empty array';
  }
  const invalidActions = (body.intended_actions as string[]).filter(
    (a) => !ALLOWED_ACTIONS.includes(a)
  );
  if (invalidActions.length > 0) {
    return `Invalid actions: ${invalidActions.join(', ')}`;
  }
  return null;
}

export default async (request: EvershopRequest, response: EvershopResponse, next: NextFunction) => {
  try {
    const body = request.body as Record<string, unknown>;

    const validationError = validatePayload(body);
    if (validationError) {
      response.status(INVALID_PAYLOAD);
      response.json({ error: { status: INVALID_PAYLOAD, message: validationError } });
      return;
    }

    const existing = await select()
      .from('bot_registration')
      .where('contact_email', '=', (body.contact_email as string).toLowerCase().trim())
      .and('bot_name', '=', (body.bot_name as string).trim())
      .load(pool);

    if (existing) {
      response.status(INVALID_PAYLOAD);
      response.json({
        error: {
          status: INVALID_PAYLOAD,
          message: 'A registration for this bot name and email already exists'
        }
      });
      return;
    }

    const registration = await insert('bot_registration')
      .given({
        bot_name: (body.bot_name as string).trim(),
        organization_name: (body.organization_name as string).trim(),
        contact_email: (body.contact_email as string).toLowerCase().trim(),
        purpose_of_access: (body.purpose_of_access as string).trim(),
        callback_url: body.callback_url ? (body.callback_url as string).trim() : null,
        allowed_domain: body.allowed_domain ? (body.allowed_domain as string).trim() : null,
        expected_usage_pattern: body.expected_usage_pattern
          ? (body.expected_usage_pattern as string).trim()
          : null,
        requested_permissions: JSON.stringify(body.requested_permissions),
        intended_actions: JSON.stringify(body.intended_actions),
        status: 'pending'
      })
      .execute(pool);

    response.status(OK);
    response.$body = {
      data: {
        uuid: registration.uuid,
        bot_name: registration.bot_name,
        organization_name: registration.organization_name,
        contact_email: registration.contact_email,
        status: registration.status,
        created_at: registration.created_at,
        message:
          'Your bot registration has been submitted. You will be notified once it is reviewed.'
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
