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
        

        if (gameRecord.started === false) {

            const record = await Dynamo.get(connectionID, tableName);
            const {domainName, stage, playerName} = record;

            players.push({"ID":connectionID, "name":playerName});

            const gameData = {
                ...gameRecord,
                players,
            };

            await Dynamo.write(gameData, tableName);

            

            const data = {
                ...record,
                game: body.gameId,
            };

            await Dynamo.write(data, tableName);

            await WebSocket.send({
                domainName, 
                stage, 
                connectionID, 
                message: JSON.stringify({"joinedGame": {"gameId":body.gameId, "players":gameRecord.players}})
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
                    {"message": {"author":"Gameroom","content":`Player ${playerName} joined ${body.gameId} game!`},
                     "newPlayer": {"ID":connectionID, "name":playerName}
                    })
            });
            
            
            return Responses._200({message: 'joined game'});

        } else {

            return Responses._400({message: 'This game has already started.'});
        
        }
        
        
    } catch (error) {
        return Responses._400({message: 'game could not be joined'});
    }   

};