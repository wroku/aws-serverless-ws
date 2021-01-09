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
        const gameRecord = await Dynamo.get(record.game, tableName);
        
        

        if (gameRecord.started === false) {
            
            const data = {
                ...record,
                game: 'waiting',
            };

            await Dynamo.write(data, tableName);

            let players = gameRecord.players;
            players = players.filter(record => record.ID !== connectionID);


            if (players.length > 0) {
                const gameData = {
                    ...gameRecord,
                    players,
                };

                await Dynamo.write(gameData, tableName);

                await WebSocket.send({
                    domainName, 
                    stage, 
                    connectionID, 
                    message: JSON.stringify({leftGame: true})
                });

                const connectionIDs = [];
                for(const player of players){
                    connectionIDs.push(player.ID)
                }

                await WebSocket.broadcast({
                    domainName, 
                    stage, 
                    connectionIDs, 
                    message: JSON.stringify(
                        {message: {author: "Gameroom", content: `Player ${playerName} left ${gameRecord.ID} game!`},
                        playerLeft: connectionID
                        })
                });
            }
            else {
                await Dynamo.delete(gameRecord.ID, tableName);

                const games = await Dynamo.scan('begins_with(ID, :pref)',{':pref':'g'},'ID, started, players', tableName);
                const waitingUsers = await Dynamo.scan('game = :id',{':id':'waiting'},'ID', tableName);
                const waitingUsersConnectionsIDs = waitingUsers.Items.map(x => x.ID);
                
                await WebSocket.broadcast({
                    domainName, 
                    stage, 
                    connectionIDs: waitingUsersConnectionsIDs, 
                    message: JSON.stringify({lobbyInfo: games.Items})
                });
                
                await WebSocket.send({
                    domainName, 
                    stage, 
                    connectionID, 
                    message: JSON.stringify({leftGame: true})
                });
            };
            
            return Responses._200({message: 'Returned to lobby.'});

        } else {

            return Responses._400({message: 'This game has already started.'});
        
        }
        
        
    } catch (error) {
        console.log('Error');
        console.log(error.stack);
        return Responses._400({message: 'LeaveGame error.'});
    }   

};