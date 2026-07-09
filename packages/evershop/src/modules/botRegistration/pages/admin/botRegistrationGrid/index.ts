import { buildFilterFromUrl } from '../../../../../lib/util/buildFilterFromUrl.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import type { EvershopRequest } from '../../../../../types/request.js';
import type { EvershopResponse } from '../../../../../types/response.js';

export default (request: EvershopRequest, response: EvershopResponse, next) => {
  setPageMetaInfo(request, {
    title: 'Bot Registrations',
    description: 'Review and approve bot / agent access requests'
  });
  setContextValue(request, 'filtersFromUrl', buildFilterFromUrl(request.originalUrl));
  next();
};
