
export const getFilesBySubscriberOrgId = async (neo4jSession, subscriberOrgId) => {
   const queryToGetAllFiles = `
      MATCH (u:User)-[*]-(f:File)
      WHERE u.subscriberOrgId = '${subscriberOrgId}' AND u.active = true
      RETURN f;
   `;
   const response = await neo4jSession.run(queryToGetAllFiles);

   const files = response.records.map((record) => {
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
