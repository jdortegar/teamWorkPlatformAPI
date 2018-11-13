import axios from 'axios';
import _ from 'lodash';
import sift from 'sift';
import Paginator from '../../helpers/Paginator';

import config from '../../config/env';
import { apiEndpoint } from '../../config/env/development';
import { getUserNameHash } from '../../services/userService';
function buildQueryString(obj) {
    return Object.keys(obj).map(key => `${key}=${encodeURIComponent(obj[key])}`).join('&');
}

async function getFileCollection(url, redis, authorization) {
    const hashkey = new Buffer(url).toString('base64');
    const cachedFiles = await redis.getAsync(hashkey);
    let files;
    if (cachedFiles) {
        files = JSON.parse(cachedFiles);
    } else {
        const remoteResponse = await axios.get(url, {
            headers: {
                Authorization: authorization
            }
        });
        files = remoteResponse.data.message.files;
        redis.set(hashkey, JSON.stringify(files), 'EX', 5); // The key will expire in 5 sec in case new files was added.
    }
    return files;
}

function buildPaginator(files, pageSize, req) {
    const pager = new Paginator(files, { pageSize });
    const pageNumber = req.query.page || 1;
    const page = pager.getPage(pageNumber);
    const prevQuery = Object.assign({}, req.query);
    const nextQuery = Object.assign({}, req.query);
    prevQuery.page = Number(pageNumber) - 1;
    nextQuery.page = Number(pageNumber) + 1;
    return {
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
    }
}

export const getFiles = async (req, res) => {
    const caseSensitive = req.query.caseSensitive || 0
    const caseInsensitive = (caseSensitive == 0) ? 1 : 0;
    const andOperator = req.query.andOperator || 0;
    const pageSize = req.query.pageSize || 20;
    const search = req.query.query;
    const teamId = req.params.teamId || 0;
    let url;
    if (search) {
        url = `${config.apiEndpoint}/v1/ckg/getFilesBySearchTerm/${req.params.subscriberOrgId}/${teamId}/${search}/${caseInsensitive}/${andOperator}`;
    } else {
        url = `${config.apiEndpoint}/v1/ckg/getFiles/${req.params.subscriberOrgId}/${teamId}`;
    }
    let files;
    try {
        files = await getFileCollection(url, req.app.locals.redis, req.headers.authorization);
    } catch (err) {
        if (typeof err.response !== 'undefined') {
            return res.status(err.respnonse.status).json({ error: err.response.data });
        }
        return res.status(500).json({ error: 'Something went wrong' });
    }
    const userIds = [];
    _.forEach(files, (file) => {
        if (userIds.indexOf(file.fileOwnerId) < 0) {
            userIds.push(file.fileOwnerId);
        }
    });
    const userHash = await getUserNameHash(req, userIds);
    _.forEach(files, (file, ix) => {
        files[ix].hablaUserName = userHash[file.fileOwnerId];
        if (typeof file.fileType === 'undefined') {
            files[ix].fileType = file.fileExtension || 'Other';
        }
    });
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
        if (typeof req.query.sortOrder !== 'undefined' && req.query.sortOrder === 'desc') {
            files = _.reverse(files);
        }
    }

    return res.status(200).json(files);
}

export const putQueryFiles = async (req, res) => {
    const caseSensitive = Number(req.query.caseSensitive) || 0
    const caseInsensitive = (caseSensitive == 0) ? 1 : 0;
    const andOperator = Number(req.query.andOperator) || 0;
    const teamId = req.params.teamId || 0;
    const url = `${config.apiEndpoint}/v1/ckg/getFilesBySearchTerm/${req.params.subscriberOrgId}/${teamId}/${req.params.search}/${caseInsensitive}/${andOperator}`;
    let files;
    const pageSize = Number(req.query.pageSize) || 20;
    try {
        files = await getFileCollection(url, req.app.locals.redis, req.headers.authorization);
    } catch (err) {
        if (typeof err.respnonse !== 'undefined') {
            return res.status(err.respnonse.status).json({ error: err.response.data });
        }
        return res.status(500).json({ error: 'Something went wrong' });
    }

    const metadata = {
        ownerIds: [],
        fileTypes: [],
        sources: []
    }
    const userIds = [];
    _.forEach(files, (file) => {
        if (userIds.indexOf(file.fileOwnerId) < 0) {
            userIds.push(file.fileOwnerId);
        }
    });
    const userHash = await getUserNameHash(req, userIds);

    _.forEach(files, (file, ix) => {
        files[ix].hablaUserName = userHash[file.fileOwnerId];
        if (typeof file.fileType === 'undefined') {
            files[ix].fileType = file.fileExtension || 'Other';
        }
        const metaOwnerPos = metadata.ownerIds.map(val => val.value).indexOf(file.fileOwnerId);
        if ( metaOwnerPos < 0) {
            metadata.ownerIds.push({ value: file.fileOwnerId, count: 1 });
        } else {
            metadata.ownerIds[metaOwnerPos].count++;
        }
        const metaTypePos = metadata.fileTypes.map(val => val.value).indexOf(file.fileType);
        if (metaTypePos < 0) {
            metadata.fileTypes.push({ value: file.fileType, count: 1 });
        } else {
            metadata.fileTypes[metaTypePos].count++;
        }
        const metaSourcePos = metadata.sources.map(val => val.value).indexOf(file.fileSource);
        if (metaSourcePos < 0) {
            metadata.sources.push({ value: file.fileSource, count: 1 });
        } else {
            metadata.sources[metaSourcePos].count++;
        }
    });
    
    // Filtering
    const filters = {};
    if (typeof req.body.include !== 'undefined') {
        filters.include = req.body.include || {};
    }
    if (typeof req.body.exclude !== 'undefined') {
        filters.exclude = req.body.exclude || {};
    }

    let query = {};
    _.forEach(filters.include, (val, key) => {
        if (typeof query[key] === 'undefined') {
            query[key] = {};
        }
    });
    _.forEach(filters.exclude, (val, key) => {
        if (typeof query[key] === 'undefined') {
            query[key] = {};
        }
    });
    _.forEach(query, (val, key) => {
        if (typeof filters.include[key] !== 'undefined') {
            query[key].$in = filters.include[key];
        }
        if (typeof filters.exclude[key] !== 'undefined') {
            query[key].$nin = filters.exclude[key];
        }
    });
    files = sift(query, files);

    // Sorting
    if (typeof req.query.sort !== 'undefined' && req.query.sort instanceof Array && req.query.sort.length > 0) {
        files = _.sortBy(files, req.query.sort);
        if (typeof req.query.sortOrder !== 'undefined' && req.query.sortOrder === 'desc') {
            files = _.reverse(files);
        }
    }
    const responseBody = buildPaginator(files, pageSize, req);
    responseBody.metadata = metadata;
    return res.status(200).json(responseBody);
}
