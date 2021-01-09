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

    const waitingUsers = await Dynamo.scan('game = :id',{':id':'waiting'},'ID', tableName);
    let waitingUsersConnectionsIDs = waitingUsers.Items.map(x => x.ID);
    
    //Exclude disconnected user from update
    waitingUsersConnectionsIDs = waitingUsersConnectionsIDs.filter(record => record !== connectionID);
    let correctWaitingUsers = 0;

    if (gameId !== 'waiting') {
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
        };
        if (!gameRecord.started) {
            correctWaitingUsers = -1;
        };
    }
    else {
        correctWaitingUsers = -1;
    };
    
    const games = await Dynamo.scan('begins_with(ID, :pref)',{':pref':'g'},'ID, started, players', tableName);
    await WebSocket.broadcast({
        domainName, 
        stage, 
        connectionIDs: waitingUsersConnectionsIDs, 
        message: JSON.stringify({correctWaitingUsers: correctWaitingUsers, lobbyInfo: games.Items})
    });

    await Dynamo.delete(connectionID, tableName);

    return Responses._200({ message: 'disconnected' });
};