const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');

const tableName = process.env.tableName;

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID } = event.requestContext;
    const record = await Dynamo.get(connectionID, tableName);
    const gameId = record.game;

    if (gameId !== 'waiting'){
        const gameRecord = await Dynamo.get(gameId, tableName);
        const players = gameRecord.players;
        
        if (players.length === 1){
            await Dynamo.delete(gameId, tableName);
        }
        else {
            players.splice(players.indexOf(connectionID), 1);
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