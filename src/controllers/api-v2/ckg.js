import axios from 'axios';
import Paginator from '../../helpers/Paginator';

import config from '../../config/env';
import { apiEndpoint } from '../../config/env/development';

function buildQueryString(obj) {
   return  Object.keys(obj).map(key => `${key}=${encodeURIComponent(obj[key])}`).join('&');
}

function getEnvAlias(prefix) {
   switch (prefix) {
      case 'DEV_':
         return 'dev';
      case 'PROD_':
         return 'prod';
      case 'DEMO_':
         return 'demo';
   } 
}

export const getFiles = async (req, res) => {
   const url = `https://y2rhikgvq4.execute-api.us-west-2.amazonaws.com/${getEnvAlias(config.tablePrefix)}/graphapi/ckg/files/${req.params.subscriberOrgId}/${req.params.search}`;

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
         req.app.locals.redis.set(hashkey, JSON.stringify(files), 'EX', 600); // The key will expire in 10 min in case new files was added.
      } catch(err) {
         return res.status(err.response.status).json({error: err.response.data });
      }
   }
   // TO DO: Apply filters and sorting before paginate;

   const pager = new Paginator(files, { pageSize });
   const pageNumber = req.query.page || 1;
   const page = pager.getPage(pageNumber);
   const prevQuery = Object.assign({}, req.query);
   const nextQuery = Object.assign({}, req.query);
   prevQuery.page = Number(pageNumber) - 1;
   nextQuery.page = Number(pageNumber) + 1; 
   return res.status(200).json({
      pager: {
         page: pageNumber,
         pageSize,
         totalCount: pager.totalCount,
         prev: (pageNumber > 1) ? 
            `${apiEndpoint}/v2/ckg/${req.params.subscriberOrgId}/files/${req.params.search}?${buildQueryString(prevQuery)}` :
            null,
         next: (pageNumber < pager.totalCount) ?
            `${apiEndpoint}/v2/ckg/${req.params.subscriberOrgId}/files/${req.params.search}?${buildQueryString(nextQuery)}` :
            null
      },
      items: page.items
   });
}