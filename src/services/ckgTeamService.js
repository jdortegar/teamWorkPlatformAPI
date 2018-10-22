const getFiles = async (query, neo4jSession, fileRecords=[]) => {
    const result = await neo4jSession.run(query);
    return fileRecords.concat(result.records);
 };
 
 
 export const getFilesBySubscriberTeamId = async (neo4jSession, subscriberTeamId) => {
    let fileRecords = [];
    const ownFilesInsideFolders = `
       MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
       WHERE u.subscriberTeamId = '${subscriberTeamId}' AND u.active = true
       RETURN DISTINCT f, u`;
    fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
 
    const ownFiles = `
       MATCH (u:User)-[:OWNS]->(f:File)
       WHERE u.subscriberTeamId = '${subscriberTeamId}' AND u.active = true
       RETURN DISTINCT f, u`;
    fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
 
    const shareFilesInsideFolders = `
       MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
       WHERE u.subscriberTeamId = '${subscriberTeamId}' AND u.active = true
       RETURN DISTINCT f, u`;
    fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
 
    const shareFiles = `
       MATCH (f:File)-[:SHARE_WITH]->(u:User)
       WHERE u.subscriberTeamId = '${subscriberTeamId}' AND u.active = true
       RETURN DISTINCT f, u`;
    fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
 
    const files = fileRecords.map((record) => {
       const fileNode = record.get(0);
       const userNode = record.get(1);
        return {
            fileId: fileNode.properties.fileId,
            fileName: fileNode.properties.fileName,
            fileSize: fileNode.properties.fileSize,
            fileType: fileNode.properties.fileType,
            fileSource: fileNode.properties.source,
            fileExtension: fileNode.properties.fileExtension,
            resourceUri: fileNode.properties.resourceUri,
            lastModified: fileNode.properties.lastModified,
            fileOwnerName: fileNode.properties.ownerName,
            fileOwnerId: userNode.properties.hablaUserId,
        };
    });
    return files;
 };

 
 export const getFilesBysubscriberTeamIdSearchTerm = async (neo4jSession, subscriberTeamId, searchTerm, caseInsensitive, andOperator) => {
    var arr = null;
    var arrLen = null;
  
    if (searchTerm) {
      console.log(searchTerm);
      arr = searchTerm.split(/[ ,]+/);
      if (arr == undefined || arr.length == 0) {
          return null;
      }
    arrLen = arr.length;
    console.log("length="+arrLen);
    for (var i=0; i<arrLen; i++) {
        console.log(arr[i]);
    }

    let fileRecords = [];
    
    if (andOperator == 1) {
        if (caseInsensitive==0) {
            if (arrLen == 1) {
                const ownFilesInsideFolders = `
                MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND f.fileName contains('${arr[0]}')
                AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
          
             const ownFiles = `
                MATCH (u:User)-[:OWNS]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND f.fileName contains('${arr[0]}')
                AND  u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
          
             const shareFilesInsideFolders = `
                MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND f.fileName contains('${arr[0]}')
                AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
          
             const shareFiles = `
                MATCH (f:File)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND f.fileName contains('${arr[0]}') AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
            
            } else if (arrLen == 2) {
               const ownFilesInsideFolders = `
                MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}')) AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
          
             const ownFiles = `
                MATCH (u:User)-[:OWNS]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}')) AND  u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
          
             const shareFilesInsideFolders = `
                MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}')) AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
          
             const shareFiles = `
                MATCH (f:File)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}'
                AND (f.fileName contains('${arr[0]}') AND f.fileName contains('${arr[1]}')) AND u.active = true 
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
            
            } else if (arrLen == 3) {
                const ownFilesInsideFolders = `
                MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')) AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);     
          
             const ownFiles = `
                MATCH (u:User)-[:OWNS]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')) AND  u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
          
             const shareFilesInsideFolders = `
                MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')) AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
          
             const shareFiles = `
                MATCH (f:File)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')) AND u.active = true 
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
             
            } else if ((arrLen == 4)) { 
                const ownFilesInsideFolders = `
                MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                AND f.fileName contains('${arr[3]}')) AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
                  
             const ownFiles = `
                MATCH (u:User)-[:OWNS]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                AND f.fileName contains('${arr[3]}')) AND  u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
          
             const shareFilesInsideFolders = `
                MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                AND f.fileName contains('${arr[3]}')) AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
          
             const shareFiles = `
                MATCH (f:File)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}'
                AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                AND f.fileName contains('${arr[3]}')) AND u.active = true RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
               
            } else if ((arrLen == 5)) { 
            const ownFilesInsideFolders = `
                MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                AND f.fileName contains('${arr[3]}') AND f.fileName contains('${arr[4]}')) AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
                  
             const ownFiles = `
                MATCH (u:User)-[:OWNS]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                AND f.fileName contains('${arr[3]}') AND f.fileName contains('${arr[4]}')) AND  u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
          
             const shareFilesInsideFolders = `
                MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                AND f.fileName contains('${arr[3]}') AND f.fileName contains('${arr[4]}')) AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
          
             const shareFiles = `
                MATCH (f:File)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' 
                AND (f.fileName contains('${arr[0]}') AND
                f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                AND f.fileName contains('${arr[3]}') AND f.fileName contains('${arr[4]}')) AND u.active = true 
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
                   
            } else {
                const ownFilesInsideFolders = `
                    MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
                    WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                    f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                    AND f.fileName contains('${arr[3]}') AND f.fileName contains('${arr[4]}') AND
                    f.fileName contains('${arr[5]}')) AND u.active = true
                    RETURN DISTINCT f, u`;
                    fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
                             
                 const ownFiles = `
                    MATCH (u:User)-[:OWNS]->(f:File)
                    WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                    f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                    AND f.fileName contains('${arr[3]}') AND f.fileName contains('${arr[4]}') AND
                    f.fileName contains('${arr[5]}')) AND  u.active = true
                    RETURN DISTINCT f, u`;
                    fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
              
                 const shareFilesInsideFolders = `
                    MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
                    WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') AND
                    f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                    AND f.fileName contains('${arr[3]}') AND f.fileName contains('${arr[4]}') AND
                    f.fileName contains('${arr[5]}')) AND u.active = true
                    RETURN DISTINCT f, u`;
                    fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
              
                 const shareFiles = `
                    MATCH (f:File)-[:SHARE_WITH]->(u:User)
                    WHERE u.subscriberTeamId = '${subscriberTeamId}'
                    AND (f.fileName contains('${arr[0]}') AND
                    f.fileName contains('${arr[1]}') AND f.fileName contains('${arr[2]}')
                    AND f.fileName contains('${arr[3]}') AND f.fileName contains('${arr[4]}') AND
                    f.fileName contains('${arr[5]}')) AND u.active = true RETURN DISTINCT f, u`;
                    fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
                              
                }
        } else {
        if (arrLen == 1) {
           const ownFilesInsideFolders = `
           MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
           WHERE u.subscriberTeamId = '${subscriberTeamId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
           AND u.active = true
           RETURN DISTINCT f, u`;
           fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
     
        const ownFiles = `
           MATCH (u:User)-[:OWNS]->(f:File)
           WHERE u.subscriberTeamId = '${subscriberTeamId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
           AND  u.active = true
           RETURN DISTINCT f, u`;
           fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
     
        const shareFilesInsideFolders = `
           MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
           WHERE u.subscriberTeamId = '${subscriberTeamId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
           AND u.active = true
           RETURN DISTINCT f, u`;
           fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
     
        const shareFiles = `
           MATCH (f:File)-[:SHARE_WITH]->(u:User)
           WHERE u.subscriberTeamId = '${subscriberTeamId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
           AND u.active = true
           RETURN DISTINCT f, u`;
           fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
           
        } else if (arrLen == 2) {
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')))
            AND  u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
           
        } else if (arrLen == 3) {
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}')))
            AND  u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
           
        } else if ((arrLen == 4)) { 
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}'))
            AND toLower(f.fileName) contains(toLower('${arr[3]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}'))
            AND toLower(f.fileName) contains(toLower('${arr[3]}')))
            AND  u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}')) 
            AND toLower(f.fileName) contains(toLower('${arr[3]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}'))
            AND toLower(f.fileName) contains(toLower('${arr[3]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
    
    
        } else if ((arrLen == 5)) { 
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}'))
            AND toLower(f.fileName) contains(toLower('${arr[3]}'))
            AND toLower(f.fileName) contains(toLower('${arr[4]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}'))
            AND toLower(f.fileName) contains(toLower('${arr[3]}'))
            AND toLower(f.fileName) contains(toLower('${arr[4]}')))
            AND  u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}')) 
            AND toLower(f.fileName) contains(toLower('${arr[3]}')) AND toLower(f.fileName) contains(toLower('${arr[4]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}'))
            AND toLower(f.fileName) contains(toLower('${arr[3]}'))
            AND toLower(f.fileName) contains(toLower('${arr[4]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
    
        } else {
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}'))
            AND toLower(f.fileName) contains(toLower('${arr[3]}'))
            AND toLower(f.fileName) contains(toLower('${arr[4]}'))
            AND toLower(f.fileName) contains(toLower('${arr[5]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}'))
            AND toLower(f.fileName) contains(toLower('${arr[3]}'))
            AND toLower(f.fileName) contains(toLower('${arr[4]}'))
            AND toLower(f.fileName) contains(toLower('${arr[5]}')))
            AND  u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}')) 
            AND toLower(f.fileName) contains(toLower('${arr[3]}')) AND toLower(f.fileName) contains(toLower('${arr[4]}'))
            AND toLower(f.fileName) contains(toLower('${arr[5]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
            AND toLower(f.fileName) contains(toLower('${arr[1]}')) AND toLower(f.fileName) contains(toLower('${arr[2]}'))
            AND toLower(f.fileName) contains(toLower('${arr[3]}'))
            AND toLower(f.fileName) contains(toLower('${arr[4]}')) 
            AND toLower(f.fileName) contains(toLower('${arr[5]}')))
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
    
                       
            }
        }
    } else {
    if (caseInsensitive==0) {
        if (arrLen == 1) {
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND f.fileName contains('${arr[0]}')
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND f.fileName contains('${arr[0]}')
            AND  u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND f.fileName contains('${arr[0]}')
            AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND f.fileName contains('${arr[0]}') AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
        
        } else if (arrLen == 2) {
           const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}')) AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}')) AND  u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}')) AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' 
            AND (f.fileName contains('${arr[0]}') OR f.fileName contains('${arr[1]}')) AND u.active = true 
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
        
        } else if (arrLen == 3) {
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')) AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);     
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')) AND  u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')) AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR 
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')) AND u.active = true 
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
         
        } else if ((arrLen == 4)) { 
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')) AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
              
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')) AND  u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')) AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' 
            AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')) AND u.active = true RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
           
        } else if ((arrLen == 5)) { 
        const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')OR f.fileName contains('${arr[4]}')) AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
              
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')OR f.fileName contains('${arr[4]}')) AND  u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')OR f.fileName contains('${arr[4]}')) AND u.active = true
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberTeamId = '${subscriberTeamId}' 
            AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')OR f.fileName contains('${arr[4]}')) AND u.active = true 
            RETURN DISTINCT f, u`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
               
        } else {
            const ownFilesInsideFolders = `
                MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
                f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
                OR f.fileName contains('${arr[3]}') OR f.fileName contains('${arr[4]}') OR 
                f.fileName contains('${arr[5]}')) AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
                         
             const ownFiles = `
                MATCH (u:User)-[:OWNS]->(f:File)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
                f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
                OR f.fileName contains('${arr[3]}') OR f.fileName contains('${arr[4]}') OR 
                f.fileName contains('${arr[5]}')) AND  u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
          
             const shareFilesInsideFolders = `
                MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (f.fileName contains('${arr[0]}') OR
                f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
                OR f.fileName contains('${arr[3]}') OR f.fileName contains('${arr[4]}') OR 
                f.fileName contains('${arr[5]}')) AND u.active = true
                RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
          
             const shareFiles = `
                MATCH (f:File)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberTeamId = '${subscriberTeamId}' 
                AND (f.fileName contains('${arr[0]}') OR
                f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
                OR f.fileName contains('${arr[3]}') OR f.fileName contains('${arr[4]}') OR 
                f.fileName contains('${arr[5]}')) AND u.active = true RETURN DISTINCT f, u`;
                fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
                          
            }
    } else {
    if (arrLen == 1) {
       const ownFilesInsideFolders = `
       MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
       WHERE u.subscriberTeamId = '${subscriberTeamId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
       AND u.active = true
       RETURN DISTINCT f, u`;
       fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
 
    const ownFiles = `
       MATCH (u:User)-[:OWNS]->(f:File)
       WHERE u.subscriberTeamId = '${subscriberTeamId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
       AND  u.active = true
       RETURN DISTINCT f, u`;
       fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
 
    const shareFilesInsideFolders = `
       MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
       WHERE u.subscriberTeamId = '${subscriberTeamId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
       AND u.active = true
       RETURN DISTINCT f, u`;
       fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
 
    const shareFiles = `
       MATCH (f:File)-[:SHARE_WITH]->(u:User)
       WHERE u.subscriberTeamId = '${subscriberTeamId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
       AND u.active = true
       RETURN DISTINCT f, u`;
       fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
       
    } else if (arrLen == 2) {
        const ownFilesInsideFolders = `
        MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
  
     const ownFiles = `
        MATCH (u:User)-[:OWNS]->(f:File)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')))
        AND  u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
  
     const shareFilesInsideFolders = `
        MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
  
     const shareFiles = `
        MATCH (f:File)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
       
    } else if (arrLen == 3) {
        const ownFilesInsideFolders = `
        MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
  
     const ownFiles = `
        MATCH (u:User)-[:OWNS]->(f:File)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}')))
        AND  u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
  
     const shareFilesInsideFolders = `
        MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
  
     const shareFiles = `
        MATCH (f:File)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
       
    } else if ((arrLen == 4)) { 
        const ownFilesInsideFolders = `
        MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}'))
        OR toLower(f.fileName) contains(toLower('${arr[3]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
  
     const ownFiles = `
        MATCH (u:User)-[:OWNS]->(f:File)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}'))
        OR toLower(f.fileName) contains(toLower('${arr[3]}')))
        AND  u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
  
     const shareFilesInsideFolders = `
        MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}')) 
        OR toLower(f.fileName) contains(toLower('${arr[3]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
  
     const shareFiles = `
        MATCH (f:File)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}'))
        OR toLower(f.fileName) contains(toLower('${arr[3]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);


    } else if ((arrLen == 5)) { 
        const ownFilesInsideFolders = `
        MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}'))
        OR toLower(f.fileName) contains(toLower('${arr[3]}'))
        OR toLower(f.fileName) contains(toLower('${arr[4]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
  
     const ownFiles = `
        MATCH (u:User)-[:OWNS]->(f:File)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}'))
        OR toLower(f.fileName) contains(toLower('${arr[3]}'))
        OR toLower(f.fileName) contains(toLower('${arr[4]}')))
        AND  u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
  
     const shareFilesInsideFolders = `
        MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}')) 
        OR toLower(f.fileName) contains(toLower('${arr[3]}')) OR toLower(f.fileName) contains(toLower('${arr[4]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
  
     const shareFiles = `
        MATCH (f:File)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}'))
        OR toLower(f.fileName) contains(toLower('${arr[3]}'))
        OR toLower(f.fileName) contains(toLower('${arr[4]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);

    } else {
        const ownFilesInsideFolders = `
        MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}'))
        OR toLower(f.fileName) contains(toLower('${arr[3]}'))
        OR toLower(f.fileName) contains(toLower('${arr[4]}'))
        OR toLower(f.fileName) contains(toLower('${arr[5]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
  
     const ownFiles = `
        MATCH (u:User)-[:OWNS]->(f:File)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}'))
        OR toLower(f.fileName) contains(toLower('${arr[3]}'))
        OR toLower(f.fileName) contains(toLower('${arr[4]}'))
        OR toLower(f.fileName) contains(toLower('${arr[5]}')))
        AND  u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
  
     const shareFilesInsideFolders = `
        MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}')) 
        OR toLower(f.fileName) contains(toLower('${arr[3]}')) OR toLower(f.fileName) contains(toLower('${arr[4]}'))
        OR toLower(f.fileName) contains(toLower('${arr[5]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
  
     const shareFiles = `
        MATCH (f:File)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberTeamId = '${subscriberTeamId}' AND (toLower(f.fileName) contains(toLower('${arr[0]}'))
        OR toLower(f.fileName) contains(toLower('${arr[1]}')) OR toLower(f.fileName) contains(toLower('${arr[2]}'))
        OR toLower(f.fileName) contains(toLower('${arr[3]}'))
        OR toLower(f.fileName) contains(toLower('${arr[4]}')) 
        OR toLower(f.fileName) contains(toLower('${arr[5]}')))
        AND u.active = true
        RETURN DISTINCT f, u`;
        fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);

                   
        }
    }
}
    const files = fileRecords.map((record) => {
    const fileNode = record.get(0);
    const userNode = record.get(1);
    return {
        fileId: fileNode.properties.fileId,
        fileName: fileNode.properties.fileName,
        fileSize: fileNode.properties.fileSize,
        fileType: fileNode.properties.fileType,
        fileSource: fileNode.properties.source,
        fileExtension: fileNode.properties.fileExtension,
        resourceUri: fileNode.properties.resourceUri,
        lastModified: fileNode.properties.lastModified,
        fileOwnerName: fileNode.properties.ownerName,
        fileOwnerId: userNode.properties.hablaUserId,
    };
 });
 return files;
}

};
