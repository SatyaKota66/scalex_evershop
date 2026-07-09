import { select } from '@evershop/postgres-query-builder';
import { buildUrl } from '../../../../../lib/router/buildUrl.js';
import { camelCase } from '../../../../../lib/util/camelCase.js';

async function getBotRegistrations(filters = [], pool) {
  const query = select().from('bot_registration');
  query.orderBy('bot_registration.bot_registration_id', 'DESC');

  const currentFilters = [];

  // status filter
  const statusFilter = filters.find((f) => f.key === 'status');
  if (statusFilter) {
    query.where('bot_registration.status', '=', statusFilter.value);
    currentFilters.push(statusFilter);
  }

  // keyword filter (bot_name / org / email)
  const keywordFilter = filters.find((f) => f.key === 'keyword');
  if (keywordFilter) {
    const kw = keywordFilter.value.replace(/'/g, "''");
    query.getWhere().addRaw(
      'AND',
      `(bot_registration.bot_name ILIKE '%${kw}%'
        OR bot_registration.organization_name ILIKE '%${kw}%'
        OR bot_registration.contact_email ILIKE '%${kw}%')`
    );
    currentFilters.push(keywordFilter);
  }

  // page / limit
  const pageFilter = filters.find((f) => f.key === 'page');
  const limitFilter = filters.find((f) => f.key === 'limit');
  const limit = limitFilter ? parseInt(limitFilter.value, 10) : 20;
  const page = pageFilter ? parseInt(pageFilter.value, 10) : 1;
  const offset = (page - 1) * limit;

  // clone for count before paging
  const countQuery = query.clone();
  countQuery.select('COUNT(bot_registration.bot_registration_id)', 'total');
  countQuery.removeOrderBy();
  countQuery.removeLimit();

  // SelectQuery.limit(offset, limit) — offset is first parameter
  query.limit(offset, limit);

  const [items, countResult] = await Promise.all([
    query.execute(pool),
    countQuery.execute(pool)
  ]);

  return {
    items: items.map((row) => camelCase(row)),
    total: parseInt(countResult[0]?.total ?? 0, 10),
    currentFilters
  };
}

export default {
  Query: {
    botRegistration: async (_, { uuid }, { pool }) => {
      const row = await select()
        .from('bot_registration')
        .where('uuid', '=', uuid)
        .load(pool);
      return row ? camelCase(row) : null;
    },
    botRegistrations: async (_, { filters = [] }, { pool }) => {
      return getBotRegistrations(filters, pool);
    }
  },
  BotRegistration: {
    requestedPermissions: (reg) => {
      const val = reg.requestedPermissions;
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return [];
    },
    intendedActions: (reg) => {
      const val = reg.intendedActions;
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return [];
    },
    apiKey: (reg) => reg.apiKey ?? null,
    viewUrl: ({ uuid }) => buildUrl('botRegistrationView', { uuid }),
    updateApi: ({ uuid }) => buildUrl('updateBotRegistration', { uuid })
  }
};
