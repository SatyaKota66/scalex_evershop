import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import { setContextValue } from '../../../../graphql/services/contextHelper.js';
import type { EvershopRequest } from '../../../../../types/request.js';
import type { EvershopResponse } from '../../../../../types/response.js';

export default (request: EvershopRequest, response: EvershopResponse, next) => {
  const { uuid } = request.params as { uuid: string };
  setPageMetaInfo(request, {
    title: 'Bot Registration Detail',
    description: 'Review bot registration'
  });
  setContextValue(request, 'botRegistrationUuid', uuid);
  next();
};
