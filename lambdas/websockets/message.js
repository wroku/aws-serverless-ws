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

        if (game != 'waiting'){
            const gameRecord = await Dynamo.get(game, tableName);

            for (const player of gameRecord.players) {
                await WebSocket.send({
                    domainName, 
                    stage, 
                    connectionID: player, 
                    message: `${player}: ${body.message}`
                });
            };   
        } else {

            const allUsers = await Dynamo.scan('connectionId', tableName);
            console.log(allUsers);
            /* Received [object Object], check structure and filter for waiting users&send messages to them*/
            await WebSocket.send({
                domainName, 
                stage, 
                connectionID, 
                message: `ALL: ${allUsers}`
            });
        }

        return Responses._200({message: 'broadcasted a message'});
    } catch (error) {
        return Responses._400({message: 'message could not be received'});
    }   

    return Responses._200({ message: 'broadcasted a message' });
};