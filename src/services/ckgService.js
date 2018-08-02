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

 
 export const getFilesBySubscriberOrgIdSearchTerm = async (neo4jSession, subscriberOrgId, searchTerm, caseInsensitive) => {
    var arr = null;
    var arrLen = null;
  
    if (searchTerm) {
      console.log(searchTerm);
      arr = searchTerm.split(/[ ,_-]+/);
      if (arr == undefined || arr.length == 0) {
          return null;
      }
    arrLen = arr.length;
    console.log("length="+arrLen);
    console.log(arr[0]);
    let fileRecords = [];
    if (caseInsensitive==0) {
        if (arrLen == 1) {
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND f.fileName contains('${arr[0]}')
            AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND f.fileName contains('${arr[0]}')
            AND  u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND f.fileName contains('${arr[0]}')
            AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND f.fileName contains('${arr[0]}') AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
        
        } else if (arrLen == 2) {
            console.log(arr[1]);
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}')) AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}')) AND  u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}')) AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' 
            AND (f.fileName contains('${arr[0]}') OR f.fileName contains('${arr[1]}')) AND u.active = true 
            RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
        
        } else if (arrLen == 3) {
            console.log(arr[2]);
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')) AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);     
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')) AND  u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')) AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR 
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')) AND u.active = true 
            RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
         
        } else if ((arrLen == 4)) { 
            console.log(arr[3]);
            const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')) AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
              
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')) AND  u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')) AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' 
            AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')) AND u.active = true RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
           
        } else if ((arrLen == 5)) { 
            console.log(arr[4]);
        const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')OR f.fileName contains('${arr[4]}')) AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
              
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')OR f.fileName contains('${arr[4]}')) AND  u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')OR f.fileName contains('${arr[4]}')) AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' 
            AND (f.fileName contains('${arr[0]}') OR
            f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
            OR f.fileName contains('${arr[3]}')OR f.fileName contains('${arr[4]}')) AND u.active = true 
            RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
               
        } else {
            console.log(arr[5]);
            const ownFilesInsideFolders = `
                MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
                WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
                f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
                OR f.fileName contains('${arr[3]}') OR f.fileName contains('${arr[4]}') OR 
                f.fileName contains('${arr[5]}')) AND u.active = true
                RETURN DISTINCT f`;
                fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
                         
             const ownFiles = `
                MATCH (u:User)-[:OWNS]->(f:File)
                WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
                f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
                OR f.fileName contains('${arr[3]}') OR f.fileName contains('${arr[4]}') OR 
                f.fileName contains('${arr[5]}')) AND  u.active = true
                RETURN DISTINCT f`;
                fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
          
             const shareFilesInsideFolders = `
                MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName contains('${arr[0]}') OR
                f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
                OR f.fileName contains('${arr[3]}') OR f.fileName contains('${arr[4]}') OR 
                f.fileName contains('${arr[5]}')) AND u.active = true
                RETURN DISTINCT f`;
                fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
          
             const shareFiles = `
                MATCH (f:File)-[:SHARE_WITH]->(u:User)
                WHERE u.subscriberOrgId = '${subscriberOrgId}' 
                AND (f.fileName contains('${arr[0]}') OR
                f.fileName contains('${arr[1]}') OR f.fileName contains('${arr[2]}')
                OR f.fileName contains('${arr[3]}') OR f.fileName contains('${arr[4]}') OR 
                f.fileName contains('${arr[5]}')) AND u.active = true RETURN DISTINCT f`;
                fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
                          
            }
    } else {
    if (arrLen == 1) {
        /*
        const ownFilesInsideFolders = `
        MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*')
        AND u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
      
     const ownFiles = `
        MATCH (u:User)-[:OWNS]->(f:File)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*')
        AND  u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
  
     const shareFilesInsideFolders = `
        MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*')
        AND u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
  
     const shareFiles = `
        MATCH (f:File)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND u.active = true
        AND (f.fileName=~ '(?i).*${arr[0]}.*') RETURN DISTINCT f`;
        fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
        */
       const ownFilesInsideFolders = `
       MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
       WHERE u.subscriberOrgId = '${subscriberOrgId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
       AND u.active = true
       RETURN DISTINCT f`;
       fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);       
 
    const ownFiles = `
       MATCH (u:User)-[:OWNS]->(f:File)
       WHERE u.subscriberOrgId = '${subscriberOrgId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
       AND  u.active = true
       RETURN DISTINCT f`;
       fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
 
    const shareFilesInsideFolders = `
       MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
       WHERE u.subscriberOrgId = '${subscriberOrgId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
       AND u.active = true
       RETURN DISTINCT f`;
       fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
 
    const shareFiles = `
       MATCH (f:File)-[:SHARE_WITH]->(u:User)
       WHERE u.subscriberOrgId = '${subscriberOrgId}' AND toLower(f.fileName) contains(toLower('${arr[0]}'))
       AND u.active = true
       RETURN DISTINCT f`;
       fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
       
    } else if (arrLen == 2) {
        console.log(arr[1]);
        const ownFilesInsideFolders = `
        MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*') AND u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
  
     const ownFiles = `
        MATCH (u:User)-[:OWNS]->(f:File)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*') AND  u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
  
     const shareFilesInsideFolders = `
        MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*') AND u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
  
     const shareFiles = `
        MATCH (f:File)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' 
        AND (f.fileName=~ '(?i).*${arr[0]}.*' OR f.fileName=~ '(?i).*${arr[1]}.*') AND u.active = true RETURN DISTINCT f`;
        fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
       
    } else if (arrLen == 3) {
        console.log(arr[2]);
        const ownFilesInsideFolders = `
        MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*') AND u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
         
     const ownFiles = `
        MATCH (u:User)-[:OWNS]->(f:File)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*') AND  u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
  
     const shareFilesInsideFolders = `
        MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*') AND u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
  
     const shareFiles = `
        MATCH (f:File)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' 
        AND (f.fileName=~ '(?i).*${arr[0]}.*' OR f.fileName=~ '(?i).*${arr[1]}.*' OR 
        f.fileName=~ '(?i).*${arr[2]}.*') AND u.active = true RETURN DISTINCT f`;
        fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
       
    } else if ((arrLen == 4)) { 
        console.log(arr[3]);
        const ownFilesInsideFolders = `
        MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*'
        OR f.fileName=~ '(?i).*${arr[3]}.*') AND u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
       
     const ownFiles = `
        MATCH (u:User)-[:OWNS]->(f:File)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*'
        OR f.fileName=~ '(?i).*${arr[3]}.*') AND  u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
  
     const shareFilesInsideFolders = `
        MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*'
        OR f.fileName=~ '(?i).*${arr[3]}.*') AND u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
  
     const shareFiles = `
        MATCH (f:File)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' 
        AND (f.fileName=~ '(?i).*${arr[0]}.*' OR f.fileName=~ '(?i).*${arr[1]}.*' OR 
        f.fileName=~ '(?i).*${arr[2]}.*'
        OR f.fileName=~ '(?i).*${arr[3]}.*') AND u.active = true RETURN DISTINCT f`;
        fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);

    } else if ((arrLen == 5)) { 
        console.log(arr[4]);
    const ownFilesInsideFolders = `
        MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*'
        OR f.fileName=~ '(?i).*${arr[3]}.*' OR f.fileName=~ '(?i).*${arr[4]}.*') AND u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
       
     const ownFiles = `
        MATCH (u:User)-[:OWNS]->(f:File)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*' OR 
        f.fileName=~ '(?i).*${arr[3]}.*' OR f.fileName=~ '(?i).*${arr[4]}.*') AND  u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
  
     const shareFilesInsideFolders = `
        MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
        OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*'
        OR f.fileName=~ '(?i).*${arr[3]}.*' OR f.fileName=~ '(?i).*${arr[4]}.*') AND u.active = true
        RETURN DISTINCT f`;
        fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
  
     const shareFiles = `
        MATCH (f:File)-[:SHARE_WITH]->(u:User)
        WHERE u.subscriberOrgId = '${subscriberOrgId}' 
        AND (f.fileName=~ '(?i).*${arr[0]}.*' OR f.fileName=~ '(?i).*${arr[1]}.*' OR 
        f.fileName=~ '(?i).*${arr[2]}.*' OR f.fileName=~ '(?i).*${arr[3]}.*' OR 
        f.fileName=~ '(?i).*${arr[4]}.*') AND u.active = true RETURN DISTINCT f`;
        fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
    
    } else {
        console.log(arr[5]);
        const ownFilesInsideFolders = `
            MATCH (u:User)-[:OWNS]->(folder:Folder)-[:HAS *0..]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
            OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*'
            OR f.fileName=~ '(?i).*${arr[3]}.*' OR f.fileName=~ '(?i).*${arr[4]}.*' OR 
            f.fileName=~ '(?i).*${arr[5]}.*') AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFilesInsideFolders, neo4jSession);
           
      
         const ownFiles = `
            MATCH (u:User)-[:OWNS]->(f:File)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
            OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*' OR 
            f.fileName=~ '(?i).*${arr[3]}.*' OR f.fileName=~ '(?i).*${arr[4]}.*' OR 
            f.fileName=~ '(?i).*${arr[5]}.*') AND  u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(ownFiles, neo4jSession, fileRecords);
      
         const shareFilesInsideFolders = `
            MATCH (f:File)<-[:HAS *0..]-(folder:Folder)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' AND (f.fileName=~ '(?i).*${arr[0]}.*'
            OR f.fileName=~ '(?i).*${arr[1]}.*' OR f.fileName=~ '(?i).*${arr[2]}.*' 
            OR f.fileName=~ '(?i).*${arr[3]}.*' OR f.fileName=~ '(?i).*${arr[4]}.*' OR 
            f.fileName=~ '(?i).*${arr[5]}.*') AND u.active = true
            RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFilesInsideFolders, neo4jSession, fileRecords);
      
         const shareFiles = `
            MATCH (f:File)-[:SHARE_WITH]->(u:User)
            WHERE u.subscriberOrgId = '${subscriberOrgId}' 
            AND (f.fileName=~ '(?i).*${arr[0]}.*' OR f.fileName=~ '(?i).*${arr[1]}.*' OR 
            f.fileName=~ '(?i).*${arr[2]}.*' OR f.fileName=~ '(?i).*${arr[3]}.*' OR 
            f.fileName=~ '(?i).*${arr[4]}.*' OR f.fileName=~ '(?i).*${arr[5]}.*') AND u.active = true RETURN DISTINCT f`;
            fileRecords = await getFiles(shareFiles, neo4jSession, fileRecords);
                   
        }
    }
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
        fileOwnerName: fileNode.properties.ownerName,
        fileOwnerId: fileNode.properties.fileOwnerId,
    };
 });
 return files;
}

};
