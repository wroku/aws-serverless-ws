const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const tableName = process.env.tableName;

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID } = event.requestContext;

    try {
        const record = await Dynamo.get(connectionID, tableName);
        const {domainName, stage, game, playerName} = record;

        const gameRecord = await Dynamo.get(game, tableName);

        const connectionIDs = [];
        for(const player of gameRecord.players){
            connectionIDs.push(player.ID)
        }

        await WebSocket.broadcast({
            domainName, 
            stage, 
            connectionIDs, 
            message: JSON.stringify({noSet: connectionID})
        });
               
        return Responses._200({message: 'broadcasted correct usage of noSet button'});
    
    } catch (error) {
        
        console.log('Error');
        console.log(error.stack);
        return Responses._400({message: 'message could not be received or propagated'});
    }   

};