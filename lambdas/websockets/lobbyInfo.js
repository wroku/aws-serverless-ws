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
        //Delete inactive waiting users from db
        const waitingUsers = await Dynamo.scan('game = :id',{':id':'waiting'},'ID', tableName);
        let waitingUsersCopy = waitingUsers.Items.slice();
        for (const waitingUser of waitingUsers.Items) {
            try {
                await WebSocket.send({
                    domainName, 
                    stage, 
                    connectionID: waitingUser.ID, 
                    message: JSON.stringify({test: "Lobby lambda is testing this connection."})
                    });
                
            } catch (error) {
                if (error.statusCode === 410) {
                    console.log(`Found stale connection, deleting ${waitingUser.ID}`);
                    await Dynamo.delete(waitingUser.ID, tableName);
                    waitingUsersCopy = waitingUsersCopy.filter(record => record.ID !== waitingUser.ID);
                } else {
                    throw error;
                }; 
            };
        };

        //Find stale connections and delete, games and players
        const games = await Dynamo.scan('begins_with(ID, :pref)',{':pref':'g'},'ID, gameName, started, players', tableName);
        let gamesCopy = games.Items.slice();
        for(const game of games.Items) {
            let playersCopy = game.players.slice();
            for(const player of game.players) {
                try {
                    await WebSocket.send({
                        domainName, 
                        stage, 
                        connectionID:player.ID, 
                        message: JSON.stringify({test: "Lobby lambda is testing this connection."})
                        });
                    
                } catch (error) {
                    if (error.statusCode === 410) {
                        console.log(`Found stale connection, deleting ${player.ID}`);
                        await Dynamo.delete(player.ID, tableName);
                        console.log(`B:${playersCopy}`);
                        playersCopy = playersCopy.filter(record => record.ID !== player.ID);
                        console.log(`A:${playersCopy}`);
                    } else {
                        throw error;
                    };
                };
            };

            if (playersCopy.length === 0) {
                console.log(`Found empty game, deleteing ${game.ID}`);
                await Dynamo.delete(game.ID, tableName);
                console.log(`B:${gamesCopy}`)
                gamesCopy = gamesCopy.filter(record => record.ID !== game.ID);
                console.log(`A:${gamesCopy}`);

            } else if (JSON.stringify(playersCopy) !== JSON.stringify(game.players)) {
                console.log(`Updating players in ${game.ID}`);
                console.log(`B: ${game.players} A: ${playersCopy}`);
                const gameRecord = await Dynamo.get(game.ID, tableName);
                const gameData = {
                    ...gameRecord,
                    players:playersCopy,
                };
    
                await Dynamo.write(gameData, tableName);
            };
        };

        // Count waiting users, including players who joined a game which haven't yet started
        let awaitingUsers = 0;
        for(game of gamesCopy){
            if(!game.started) {
                awaitingUsers = awaitingUsers + game.players.length;
            };
        };
        awaitingUsers = awaitingUsers + waitingUsersCopy.length;

        await WebSocket.send({
            domainName, 
            stage, 
            connectionID, 
            message: JSON.stringify({lobbyInfo: gamesCopy, ownID: connectionID, waitingUsers: awaitingUsers})
        });


        return Responses._200({message: 'Send initial lobby info.'});
    } catch (error) {
        console.log('Error');
        console.log(error.stack);
        return Responses._400({message: 'problem - lobbyinfo'});
    };
};



