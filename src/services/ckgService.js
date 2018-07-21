const getFiles = async (query, neo4jSession, fileRecords=[]) => {
    const result = await neo4jSession.run(query);
    return fileRecords.concat(result.records);
 };
 
 
 export const getFilesBySubscriberOrgId = async (neo4jSession, subscriberOrgId) => {
    let fileRecords = [];
    const ownFilesInsideFolders = `
       MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
       WHERE u.subscriberOrgId = '${subscriberOrgId}' AND u.active = true
       RETURN DISTINCT f`;
    fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
 
    const ownFiles = `
       MATCH (u:User)-[:OWNS]->(f:File)
       WHERE u.subscriberOrgId = '${subscriberOrgId}' AND u.active = true
       RETURN DISTINCT f`;
    fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
 
    const shareFilesInsideFolders = `
       MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
       WHERE u.subscriberOrgId = '${subscriberOrgId}' AND u.active = true
       RETURN DISTINCT f`;
    fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
 
    const shareFiles = `
       MATCH (f:File)-[:SHARE_WITH]->(u:User)
       WHERE u.subscriberOrgId = '${subscriberOrgId}' AND u.active = true
       RETURN DISTINCT f`;
    fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
 
    const files = fileRecords.map((record) => {
       const fileNode = record.get(0);
       return {
          fileId: fileNode.properties.fileId,
          fileName: fileNode.properties.fileName,
          fileSize: fileNode.properties.fileSize,
          fileType: fileNode.properties.fileType,
          fileSource: fileNode.properties.source,
          fileExtension: fileNode.properties.fileExtension,
          resourceUri: fileNode.properties.resourceUri,
          lastModified: fileNode.properties.lastModified,
       };
    });
    return files;
 };
