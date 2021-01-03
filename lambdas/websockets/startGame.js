const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const tableName = process.env.tableName;

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID } = event.requestContext;


    try {
        const record = await Dynamo.get(connectionID, tableName);
        const {domainName, stage, game} = record;
        const gameRecord = await Dynamo.get(game, tableName);

        const gameData = {
            ...gameRecord,
            started: true,
        };

        await Dynamo.write(gameData, tableName);

        await WebSocket.broadcast({
            domainName, 
            stage, 
            connectionIDs: gameRecord.players, 
            message: `Game ${game} has just begun!`
        });
          
        

        return Responses._200({message: 'started game'});
    } catch (error) {
        return Responses._400({message: 'game could not be started'});
    }   

    return Responses._200({ message: 'started game' });
};