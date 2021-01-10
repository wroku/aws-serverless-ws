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
        const {domainName, stage, game, playerName} = record;

        const gameRecord = await Dynamo.get(game, tableName);
        

        //Time lock implemented to avoid conflicts when two players guess in similar time
        const now = new Date();

        console.log(gameRecord.timeLock);
        console.log(animationTime);
        console.log(now.getTime());
        if ((gameRecord.timeLock + animationTime) < now.getTime()){
            
            const gameData = {
                ...gameRecord,
                timeLock: now.getTime(),
            };
            await Dynamo.write(gameData, tableName);

            const connectionIDs = [];
            for(const player of gameRecord.players){
                connectionIDs.push(player.ID)
            }

            await WebSocket.broadcast({
                domainName, 
                stage, 
                connectionIDs, 
                message: JSON.stringify({selectedSet: {author: connectionID, set: body.selected}})
            });

        } else {
            await WebSocket.send({
                domainName, 
                stage, 
                connectionID, 
                message: JSON.stringify({message: {author: 'Gameroom', content: 'Somebody guessed correct set before you, wait a second.'}})
            });
            
        };

        
               
        return Responses._200({message: 'broadcasted selected valid set'});
    
    } catch (error) {
        
        console.log('Error');
        console.log(error.stack);
        return Responses._400({message: 'message could not be received or propagated'});
    }   

};