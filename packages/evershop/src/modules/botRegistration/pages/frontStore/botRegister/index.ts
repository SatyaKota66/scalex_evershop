import { translate } from '../../../../../lib/locale/translate/translate.js';
import { setPageMetaInfo } from '../../../../cms/services/pageMetaInfo.js';
import type { EvershopRequest } from '../../../../../types/request.js';
import type { EvershopResponse } from '../../../../../types/response.js';

export default (request: EvershopRequest, response: EvershopResponse, next) => {
  setPageMetaInfo(request, {
    title: translate('Bot / Agent Registration'),
    description: translate('Register your AI agent or bot to access the storefront APIs')
  });
  next();
};
