import axios from 'axios';
import _ from 'lodash';
import Paginator from '../../helpers/Paginator';

import config from '../../config/env';
import { apiEndpoint } from '../../config/env/development';

function buildQueryString(obj) {
   return  Object.keys(obj).map(key => `${key}=${encodeURIComponent(obj[key])}`).join('&');
}


export const getFiles = async (req, res) => {
   const caseInsensitive = req.query.caseInsensitive || 1;
   const url = `${config.apiEndpoint}/v1/ckg/getFilesBySearchTerm/${req.params.subscriberOrgId}/${req.params.search}/${caseInsensitive}`;
   const hashkey = new Buffer(url).toString('base64');
   const cachedFiles = await req.app.locals.redis.getAsync(hashkey);
   const pageSize = req.query.pageSize || 20;
   let files;
   if (cachedFiles) {
      files = JSON.parse(cachedFiles);
   } else {
      try {
         const remoteResponse = await axios.get(url, {
            headers: {
               Authorization: req.headers.authorization
            }
         });
         files = remoteResponse.data.message.files;
         req.app.locals.redis.set(hashkey, JSON.stringify(files), 'EX', 600); // The key will expire in 10 min in case new files was added.
      } catch(err) {
         console.log(err);
         return res.status(err.response.status).json({error: err.response.data });
      }
   }
   // Filters
   const filters = {};
   if (typeof req.query.owner !== 'undefined') {
      filters.fileOwnerId = req.query.owner;
   };
   if (typeof req.query.fileType !== 'undefined') {
      filters.fileType = req.query.fileType;
   }
   if (typeof req.query.fileExtension !== 'undefined') {
      filters.fileExtension = req.query.fileExtension
   }
   if (typeof req.query.integration !== 'undefined') {
      filters.fileSource = req.query.integration;
   }
   files = _.filter(files, filters);

   // Sorting
   if (typeof req.query.sort !== 'undefined' && req.query.sort instanceof Array && req.query.sort.length > 0) {
      files = _.sortBy(files, req.query.sort);
      if (typeof req.query.sortOrder === 'desc') {
         files = _.reverse(files);
      }
   }
   
   // Create Paginator
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
         pagesCount: page.pagesCount,
         prev: (pageNumber > 1) ? 
            `${apiEndpoint}/v2/ckg/${req.params.subscriberOrgId}/files/${req.params.search}?${buildQueryString(prevQuery)}` :
            null,
         next: (pageNumber < pager.pagesCount) ?
            `${apiEndpoint}/v2/ckg/${req.params.subscriberOrgId}/files/${req.params.search}?${buildQueryString(nextQuery)}` :
            null
      },
      items: page.items || []
   });
}