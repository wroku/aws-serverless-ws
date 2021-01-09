const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const tableName = process.env.tableName;

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID, domainName, stage } = event.requestContext;
    const playerName = event.queryStringParameters.player;

    
    const data = {
        ID: connectionID,
        playerName,
        domainName,
        stage,
        game: 'waiting', 
    };

    //maybe scan after write, without filtering. test it and try catch
    await Dynamo.write(data, tableName);
    const waitingUsers = await Dynamo.scan('game = :id',{':id':'waiting'},'ID', tableName);
    let waitingUsersConnectionsIDs = waitingUsers.Items.map(x => x.ID);
    waitingUsersConnectionsIDs = waitingUsersConnectionsIDs.filter(record => record !== connectionID);
    console.log(waitingUsersConnectionsIDs);
    await WebSocket.broadcast({
        domainName, 
        stage, 
        connectionIDs: waitingUsersConnectionsIDs, 
        message: JSON.stringify({correctWaitingUsers: 1})
    });
    
    

    return Responses._200({ message: 'connected' });
};