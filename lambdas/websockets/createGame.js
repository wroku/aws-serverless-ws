const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const tableName = process.env.tableName;

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID } = event.requestContext;


    try {
        const record = await Dynamo.get(connectionID, tableName);
        const {domainName, stage} = record;
        const gameId = `g${Date.now()}`;

        const data = {
            ID: gameId,
            players: [connectionID]
        };

        await Dynamo.write(data, tableName);

        await WebSocket.send({
            domainName, 
            stage, 
            connectionID, 
            message: `created game ${gameId}`
        });

        return Responses._200({message: 'created game'});
    } catch (error) {
        return Responses._400({message: 'game could not be created'});
    }   

    return Responses._200({ message: 'created game' });
};