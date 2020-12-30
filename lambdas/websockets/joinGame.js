const { domain } = require('process');
const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const tableName = process.env.tableName;

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID } = event.requestContext;

    const body = JSON.parse(event.body);

    try {
        const gameRecord = await Dynamo.get(body.gameId, tableName);
        const players = gameRecord.players;

        players.push(connectionID);

        const data = {
            ...gameRecord,
            players,
        };

        await Dynamo.write(data, tableName);

        for (const player of players) {

            const record = await Dynamo.get(player, tableName);
            const {domainName, stage} = record;
            
            await WebSocket.send({
                domainName, 
                stage, 
                connectionID:player, 
                message: `Player ${player} joined ${body.gameId} game!`
            });
        };
        

        
        return Responses._200({message: 'joined game'});
    } catch (error) {
        return Responses._400({message: 'game could not be joined'});
    }   

    return Responses._200({ message: 'joined game' });
};