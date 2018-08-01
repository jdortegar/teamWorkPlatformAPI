import axios from 'axios';
import Paginator from '../../helpers/Paginator';

import config from '../../config/env';
import { apiEndpoint } from '../../config/env/development';

function buildQueryString(obj) {
   return  Object.keys(obj).map(key => `${key}=${encodeURIComponent(paramsObject[key])}`).join('&');
}

export const getFiles = async (req, res) => {
   const url = `https://y2rhikgvq4.execute-api.us-west-2.amazonaws.com/${config.appEnv}/graphapi/ckg/files/${req.params.subscriberOrgId}/${req.params.search}`;
   const hashkey = new Buffer(url).toString('base64');
   const cachedFiles = await req.app.locals.redis.getAsync(hashkey);
   const pageSize = req.query.pageSize || 20;
   let files;
   if (cachedFiles) {
      files = JSON.parse(cachedFiles);
   } else {
      try {
         const remoteResponse = await axios.get(url);
         files = remoteResponse.data.files
         req.app.locals.redis.set(hashkey, JSON.stringify(files));
      } catch(err) {
         return res.status(err.response.status).json({error: err.response.data });
      }
   }
   // TO DO: Apply filters and sorting before paginate;

   const pager = new Paginator(files, { pageSize });
   const pageNumber = req.query.page || 1;
   const page = pager.getPage(pageNumber);
   const prevQuery = nextQuery = Object.assign({}, req.query);
   prevQuery.page = pageNumber - 1;
   nextQuery.page = pageNumber - 2; 
   return res.status(200).json({
      pager: {
         page: pageNumber,
         pageSize,
         totalCount: paginator.totalCount,
         prev: (pageNumber > 1) ? 
            `${apiEndpoint}/v2/ckg/${req.params.subscriberOrgId}/files/${req.params.search}?${buildQueryString(prevQuery)}` :
            null,
         next: (pageNumber < paginator.totalCount) ?
            `${apiEndpoint}/v2/ckg/${req.params.subscriberOrgId}/files/${req.params.search}?${buildQueryString(nextQuery)}` :
            null
      },
      items: page
   });
}