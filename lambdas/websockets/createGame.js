const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const tableName = process.env.tableName;

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID } = event.requestContext;


    try {
        const record = await Dynamo.get(connectionID, tableName);
        const {domainName, stage, playerName} = record;
        const gameId = `g${Date.now()}`;

        const gameData = {
            ID: gameId,
            players: [{ID: connectionID, name: playerName}],
            started: false,
            deck: []
        };

        await Dynamo.write(gameData, tableName);

        const data = {
            ...record,
            game: gameId,
        };

        await Dynamo.write(data, tableName);

        await WebSocket.send({
            domainName, 
            stage, 
            connectionID, 
            message: JSON.stringify({createdGame: {gameID: gameId, players: {ID :connectionID, name: playerName, score: 0, times: '-'}}})
        });

        /* Update lobby state for all waiting users */
        /* Maybe update method without another scan? */
        const waitingUsers = await Dynamo.scan('game = :id',{':id':'waiting'},'ID', tableName);
        const waitingUsersConnectionsIDs = waitingUsers.Items.map(x => x.ID);

        await WebSocket.broadcast({
            domainName, 
            stage, 
            connectionIDs: waitingUsersConnectionsIDs, 
            message: JSON.stringify({lobbyUpdate: {ID: gameId, started: false}})
        });

        return Responses._200({message: 'created game'});
    } catch (error) {
        console.log('Error');
        console.log(error.stack);
        return Responses._400({message: 'game could not be created'});
    }   
};