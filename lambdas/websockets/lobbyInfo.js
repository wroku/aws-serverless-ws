const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const tableName = process.env.tableName;

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID } = event.requestContext;
    const record = await Dynamo.get(connectionID, tableName);
    const {domainName, stage} = record;
    
    try {
        const games = await Dynamo.scan('begins_with(ID, :pref)',{':pref':'g'},'ID, started', tableName);
        console.log(games);
        await WebSocket.send({
            domainName, 
            stage, 
            connectionID, 
            message: JSON.stringify({"lobbyInfo": games.Items})
        });

        return Responses._200({message: 'Send initial lobby info.'});
    } catch (error) {
        return Responses._400({message: 'problem - lobbyinfo'});
    }   
};



