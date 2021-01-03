const AWS = require('aws-sdk');

const create = (domainName, stage) => {
    const endpoint = `${domainName}/${stage}`;
    return new AWS.ApiGatewayManagementApi({
        apiVersion:'2018-11-29',
        endpoint,
    });
};

const send = ({domainName, stage, connectionID, message}) => {
    const ws = create(domainName, stage);

    const postParams = {
        Data: message,
        ConnectionId: connectionID
    };

    return ws.postToConnection(postParams).promise();
};

const broadcast = ({domainName, stage, connectionIDs, message}) => {
    const ws = create(domainName, stage);
    const promises = [];

    for(connectionID of connectionIDs){

        const postParams = {
        Data: message,
        ConnectionId: connectionID
        };
        
        promises.push(ws.postToConnection(postParams).promise());
    }
    
    return Promise.all(promises);
};

module.exports = {
    send, 
    broadcast,
};