const getFiles = async (query, neo4jSession, fileRecords=[]) => {
    const result = await neo4jSession.run(query);
    return fileRecords.concat(result.records);
 };
 

 export const getDataBySearchTerm = async (neo4jSession, hablaUserId, searchTerm, caseInsensitive, andOperator) => {
    var arr = null;
    var arrLen = null;
    var dataQ = null;
  
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
                dataQ = `
                MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
                WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}')
                OR d.content contains('${arr[0]}'))
                RETURN DISTINCT d`;     
            
            } else if (arrLen == 2) {
                dataQ = `
                MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
                WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}') OR 
                d.content contains('${arr[0]}')) AND
                (d.fileName contains('${arr[1]}') OR 
                d.content contains('${arr[1]}'))
                RETURN DISTINCT d`;
                          
            } else if (arrLen == 3) {
               dataQ = `
               MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
               WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}') OR 
               d.content contains('${arr[0]}')) AND
               (d.fileName contains('${arr[1]}') OR 
               d.content contains('${arr[1]}')) AND (d.fileName contains('${arr[2]}') OR 
               d.content contains('${arr[2]}'))
               RETURN DISTINCT d`;    
             
            } else if ((arrLen == 4)) { 
               dataQ = `
               MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
               WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}') OR 
               d.content contains('${arr[0]}')) AND  (d.fileName contains('${arr[1]}') OR 
               d.content contains('${arr[1]}')) AND  (d.fileName contains('${arr[2]}') OR 
               d.content contains('${arr[2]}')) AND  (d.fileName contains('${arr[3]}') OR 
               d.content contains('${arr[3]}'))
               RETURN DISTINCT d`;   
               
            } else if ((arrLen == 5)) { 
               dataQ = `
               MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
               WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}') OR 
               d.content contains('${arr[0]}')) AND  (d.fileName contains('${arr[1]}') OR 
               d.content contains('${arr[1]}')) AND  (d.fileName contains('${arr[2]}') OR 
               d.content contains('${arr[2]}')) AND  (d.fileName contains('${arr[3]}') OR 
               d.content contains('${arr[3]}')) AND  (d.fileName contains('${arr[4]}') OR 
               d.content contains('${arr[4]}'))
               RETURN DISTINCT d`;  
                   
            } else {   
               dataQ = `
               MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
               WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}') OR 
               d.content contains('${arr[0]}')) AND  (d.fileName contains('${arr[1]}') OR 
               d.content contains('${arr[1]}')) AND  (d.fileName contains('${arr[2]}') OR 
               d.content contains('${arr[2]}')) AND  (d.fileName contains('${arr[3]}') OR 
               d.content contains('${arr[3]}')) AND  (d.fileName contains('${arr[4]}') OR 
               d.content contains('${arr[4]}')) AND  (d.fileName contains('${arr[5]}') OR 
               d.content contains('${arr[5]}'))
               RETURN DISTINCT d`;               
                }
        } else {
        if (arrLen == 1) {
            dataQ = `
            MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
            WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
            OR toLower(d.content) contains(toLower('${arr[0]}')))
            RETURN DISTINCT d`; 
         } else if (arrLen == 2) {
            dataQ = `
            MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
            WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
            OR toLower(d.content) contains(toLower('${arr[0]}')) AND toLower(d.fileName) contains(toLower('${arr[1]}'))
            OR toLower(d.content) contains(toLower('${arr[1]}')))
            RETURN DISTINCT d`; 
                      
        } else if (arrLen == 3) {
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
         OR toLower(d.content) contains(toLower('${arr[0]}')) AND toLower(d.fileName) contains(toLower('${arr[1]}'))
         OR toLower(d.content) contains(toLower('${arr[1]}')) AND toLower(d.fileName) contains(toLower('${arr[2]}'))
         OR toLower(d.content) contains(toLower('${arr[2]}')))
         RETURN DISTINCT d`;    
         
        } else if ((arrLen == 4)) { 
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
         OR toLower(d.content) contains(toLower('${arr[0]}')) AND toLower(d.fileName) contains(toLower('${arr[1]}'))
         OR toLower(d.content) contains(toLower('${arr[1]}')) AND toLower(d.fileName) contains(toLower('${arr[2]}'))
         OR toLower(d.content) contains(toLower('${arr[2]}')) AND toLower(d.fileName) contains(toLower('${arr[3]}'))
         OR toLower(d.content) contains(toLower('${arr[3]}')))
         RETURN DISTINCT d`;   
           
        } else if ((arrLen == 5)) { 
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND ((toLower(d.fileName) contains(toLower('${arr[0]}'))
         OR toLower(d.content) contains(toLower('${arr[0]}')) AND toLower(d.fileName) contains(toLower('${arr[1]}'))
         OR toLower(d.content) contains(toLower('${arr[1]}')) AND toLower(d.fileName) contains(toLower('${arr[2]}'))
         OR toLower(d.content) contains(toLower('${arr[2]}')) AND toLower(d.fileName) contains(toLower('${arr[3]}'))
         OR toLower(d.content) contains(toLower('${arr[3]}')) AND toLower(d.fileName) contains(toLower('${arr[4]}'))
         OR toLower(d.content) contains(toLower('${arr[4]}')))
         RETURN DISTINCT d`;  
               
        } else {   
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
         OR toLower(d.content) contains(toLower('${arr[0]}')) AND toLower(d.fileName) contains(toLower('${arr[1]}'))
         OR toLower(d.content) contains(toLower('${arr[1]}')) AND toLower(d.fileName) contains(toLower('${arr[2]}'))
         OR toLower(d.content) contains(toLower('${arr[2]}')) AND toLower(d.fileName) contains(toLower('${arr[3]}'))
         OR toLower(d.content) contains(toLower('${arr[3]}')) AND toLower(d.fileName) contains(toLower('${arr[4]}'))
         OR toLower(d.content) contains(toLower('${arr[4]}')) AND toLower(d.fileName) contains(toLower('${arr[5]}'))
         OR toLower(d.content) contains(toLower('${arr[5]}')))
         RETURN DISTINCT d`;  
                       
            }
        }
    } else {
    if (caseInsensitive==0) {
      if (arrLen == 1) {
        dataQ = `
        MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
        WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}')
        OR d.content contains('${arr[0]}'))
        RETURN DISTINCT d`;       
        
        } else if (arrLen == 2) {
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}')
         OR d.content contains('${arr[0]}') OR d.fileName contains('${arr[1]}')
         OR d.content contains('${arr[1]}'))
         RETURN DISTINCT d`; 
        
        } else if (arrLen == 3) {
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}')
         OR d.content contains('${arr[0]}') OR d.fileName contains('${arr[1]}')
         OR d.content contains('${arr[1]}') OR d.fileName contains('${arr[2]}')
         OR d.content contains('${arr[2]}'))
         RETURN DISTINCT d`; 
         
        } else if (arrLen == 4) { 
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}')
         OR d.content contains('${arr[0]}') OR d.fileName contains('${arr[1]}')
         OR d.content contains('${arr[1]}') OR d.fileName contains('${arr[2]}')
         OR d.content contains('${arr[2]}') OR d.fileName contains('${arr[3]}')
         OR d.content contains('${arr[3]}'))
         RETURN DISTINCT d`; 
           
        } else if (arrLen == 5) { 
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}')
         OR d.content contains('${arr[0]}') OR d.fileName contains('${arr[1]}')
         OR d.content contains('${arr[1]}') OR d.fileName contains('${arr[2]}')
         OR d.content contains('${arr[2]}') OR d.fileName contains('${arr[3]}')
         OR d.content contains('${arr[3]}') OR d.fileName contains('${arr[4]}')
         OR d.content contains('${arr[4]}'))
         RETURN DISTINCT d`; 
               
        } else {
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (d.fileName contains('${arr[0]}')
         OR d.content contains('${arr[0]}') OR d.fileName contains('${arr[1]}')
         OR d.content contains('${arr[1]}') OR d.fileName contains('${arr[2]}')
         OR d.content contains('${arr[2]}') OR d.fileName contains('${arr[3]}')
         OR d.content contains('${arr[3]}') OR d.fileName contains('${arr[4]}')
         OR d.content contains('${arr[4]}') OR d.fileName contains('${arr[5]}')
         OR d.content contains('${arr[5]}'))
         RETURN DISTINCT d`;    

        }             

    } else {
    if (arrLen == 1) {
         console.log("caseInsentitive is true or operator");
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
         OR toLower(d.content) contains(toLower('${arr[0]}')))
         RETURN DISTINCT d`; 

    } else if (arrLen == 2) {
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
         OR toLower(d.content) contains(toLower('${arr[0]}')) OR toLower(d.fileName) contains(toLower('${arr[1]}'))
         OR toLower(d.content) contains(toLower('${arr[1]}')))
         RETURN DISTINCT d`; 
       
    } else if (arrLen == 3) {
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
         OR toLower(d.content) contains(toLower('${arr[0]}')) OR toLower(d.fileName) contains(toLower('${arr[1]}'))
         OR toLower(d.content) contains(toLower('${arr[1]}')) OR toLower(d.fileName) contains(toLower('${arr[2]}'))
         OR toLower(d.content) contains(toLower('${arr[2]}')))
         RETURN DISTINCT d`; 
       
    } else if ((arrLen == 4)) { 
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
         OR toLower(d.content) contains(toLower('${arr[0]}')) OR toLower(d.fileName) contains(toLower('${arr[1]}'))
         OR toLower(d.content) contains(toLower('${arr[1]}')) OR toLower(d.fileName) contains(toLower('${arr[2]}'))
         OR toLower(d.content) contains(toLower('${arr[2]}')) OR toLower(d.fileName) contains(toLower('${arr[3]}'))
         OR toLower(d.content) contains(toLower('${arr[3]}')))
         RETURN DISTINCT d`; 


    } else if ((arrLen == 5)) { 
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
         OR toLower(d.content) contains(toLower('${arr[0]}')) OR toLower(d.fileName) contains(toLower('${arr[1]}'))
         OR toLower(d.content) contains(toLower('${arr[1]}')) OR toLower(d.fileName) contains(toLower('${arr[2]}'))
         OR toLower(d.content) contains(toLower('${arr[2]}')) OR toLower(d.fileName) contains(toLower('${arr[3]}'))
         OR toLower(d.content) contains(toLower('${arr[3]}')) OR toLower(d.fileName) contains(toLower('${arr[4]}'))
         OR toLower(d.content) contains(toLower('${arr[4]}')))
         RETURN DISTINCT d`; 

    } else {
         dataQ = `
         MATCH (v:VIEWER)-[:VIEWS]->(d:DATA)
         WHERE v.userId = '${hablaUserId}' AND (toLower(d.fileName) contains(toLower('${arr[0]}'))
         OR toLower(d.content) contains(toLower('${arr[0]}')) OR toLower(d.fileName) contains(toLower('${arr[1]}'))
         OR toLower(d.content) contains(toLower('${arr[1]}')) OR toLower(d.fileName) contains(toLower('${arr[2]}'))
         OR toLower(d.content) contains(toLower('${arr[2]}')) OR toLower(d.fileName) contains(toLower('${arr[3]}'))
         OR toLower(d.content) contains(toLower('${arr[3]}')) OR toLower(d.fileName) contains(toLower('${arr[4]}'))
         OR toLower(d.content) contains(toLower('${arr[4]}')) OR toLower(d.fileName) contains(toLower('${arr[5]}'))
         OR toLower(d.content) contains(toLower('${arr[5]}')))
         RETURN DISTINCT d`; 
                   
        }
    }
}
    console.log("dataQ="+dataQ);
    fileRecords = await getFiles(dataQ, neo4jSession, fileRecords);
    const data = fileRecords.map((record) => {
    const dataNode = record.get(0);
    console.log("dataNode=" +dataNode);

    return {
        messageId: dataNode.properties.mid,
        fileName: dataNode.properties.fileName,
        hablaUserId: dataNode.properties.userId,
        dataType: dataNode.properties.dataType,
        fileType: dataNode.properties.type,
        content: dataNode.properties.content,
        filePath: dataNode.properties.filePath,
        cid: dataNode.properties.cid,
        resourceUri:dataNode.properties.resourceUri,
        dataCreatedAt: dataNode.properties.timestamp,
        lastModified: dataNode.properties.lastModified,
    };
 });

 return data;
}

};
