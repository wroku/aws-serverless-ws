const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const tableName = process.env.tableName;

exports.handler = async event => {
    console.log('event', event);

    
    const { connectionId: connectionID } = event.requestContext;
    const record = await Dynamo.get(connectionID, tableName);
    const {domainName, stage} = record;
    const gameId = record.game;

    if (gameId !== 'waiting'){
        const gameRecord = await Dynamo.get(gameId, tableName);
        const players = gameRecord.players.slice();
        
        if (players.length === 1){
            await Dynamo.delete(gameId, tableName);
        }
        else {

            const connectionIDs = [];
            for(const player of gameRecord.players) {
                //Exclude disconnected ws from broadcast, delete his record
                if(player.ID !== connectionID){
                    connectionIDs.push(player.ID)
                } else {
                    players.splice(players.indexOf(player), 1);
                };   
            };

            await WebSocket.broadcast({
                domainName, 
                stage, 
                connectionIDs, 
                message: JSON.stringify({playerDisconnected: connectionID})
            });

            
            const gameData = {
                ...gameRecord,
                players,
            };

            await Dynamo.write(gameData, tableName); 

        }
    }
    

    await Dynamo.delete(connectionID, tableName);

    return Responses._200({ message: 'disconnected' });
};