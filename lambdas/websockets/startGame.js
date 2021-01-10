const Responses = require('../common/API_Responses');
const Dynamo = require('../common/Dynamo');
const WebSocket = require('../common/websocketMessage');

const tableName = process.env.tableName;
const animationTime = parseInt(process.env.animationTime);

exports.handler = async event => {
    console.log('event', event);

    const { connectionId: connectionID } = event.requestContext;
    const body = JSON.parse(event.body);

    try {
        const record = await Dynamo.get(connectionID, tableName);
        const {domainName, stage, game} = record;
        const gameRecord = await Dynamo.get(game, tableName);
        const start = new Date();

        const gameData = {
            ...gameRecord,
            started: true,
            timeLock: start.getTime() - animationTime,
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
            message: JSON.stringify({startedGame:{gameId: game, deck: body.deck}, message: {author: "Gameroom", content: "Game will start in 3, 2, 1..."}})
        });
          
        const waitingUsers = await Dynamo.scan('game = :id',{':id':'waiting'},'ID', tableName);
        const games = await Dynamo.scan('begins_with(ID, :pref)',{':pref':'g'},'ID, started, players', tableName);
        const waitingUsersConnectionsIDs = waitingUsers.Items.map(x => x.ID);
        await WebSocket.broadcast({
            domainName, 
            stage, 
            connectionIDs: waitingUsersConnectionsIDs, 
            message: JSON.stringify({correctWaitingUsers: (-1) * connectionIDs.length, lobbyInfo: games.Items})
        });

        return Responses._200({message: 'started game'});
    } catch (error) {
        console.log('Error');
        console.log(error.stack);
        return Responses._400({message: 'game could not be started'});
    }   

};