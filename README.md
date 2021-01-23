# aws-serverless-ws

Serverless project setting up AWS API Gateway, DynamoDB table and few lambdas to handle all multiplayer related functionalities in my <a href="https://github.com/wroku/set-game-react"> SET game</a> clone.

## Key features

- Managing web socket connection Ids, including automatic deletion of stale connections from db.
- Updating lobby data (nof awaiting players, open/ongoing games) for connected users
- Creating, joining, leaving and deleting game rooms
- Allowing to exchange chat messages between players in the particular game room or waiting in a lobby
- Broadcasting card deck and game actions after starting a game