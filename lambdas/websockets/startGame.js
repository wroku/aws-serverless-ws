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
        const {domainName, stage, game} = record;
        const gameRecord = await Dynamo.get(game, tableName);

        const gameData = {
            ...gameRecord,
            started: true,
        };

        await Dynamo.write(gameData, tableName);
        
        const connectionIDs = [];
        for(const player of gameRecord.players){
            connectionIDs.push(player.ID)
        };
        
        await WebSocket.broadcast({
            domainName, 
            stage, 
            connectionIDs, 
            message: JSON.stringify({"startedGame":{"gameId":game, "deck":body.deck}, "message":{"author":"Gameroom", "content": "Game will start in 3, 2, 1..."}})
        });
          
        

        return Responses._200({message: 'started game'});
    } catch (error) {
        console.log('Catched an error');
        console.log(error.stack);
        return Responses._400({message: 'game could not be started'});
    }   

};