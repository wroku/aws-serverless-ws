const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const tableName = process.env.tableName;

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID } = event.requestContext;

    const body = JSON.parse(event.body);

    try {
        const record = await Dynamo.get(connectionID, tableName);
        const {domainName, stage, game, playerName} = record;

        if (game != 'waiting') {
            /*Send message only to current gameroom*/
            const gameRecord = await Dynamo.get(game, tableName);

            const connectionIDs = [];
            for(const player of gameRecord.players){
                connectionIDs.push(player.ID)
            }
            await WebSocket.broadcast({
                domainName, 
                stage, 
                connectionIDs, 
                message: JSON.stringify({message: {author: connectionID, content: body.message}})
            });
               
        } else {
            /*Send message to all waiting users*/
            const waitingUsers = await Dynamo.scan('game = :id',{':id':'waiting'},'ID', tableName);
            const waitingUsersConnectionsIDs = waitingUsers.Items.map(x => x.ID);
            
            await WebSocket.broadcast({
                domainName, 
                stage, 
                connectionIDs: waitingUsersConnectionsIDs, 
                message: JSON.stringify({message: {author: connectionID, content:body.message}})
            });
            
        }

        return Responses._200({message: 'broadcasted a message'});
    } catch (error) {
        console.log('Error');
        console.log(error.stack);
        if (error.statusCode === 410){
            console.log("found stale connection")
        }
        return Responses._400({message: 'message could not be received or propagated'});
    }   

};