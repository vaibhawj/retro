const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');
const cors = require('cors')
 
const NeDB = require('nedb');
const service = require('feathers-nedb');
 
const message = new NeDB({
  filename: './data/message',
  autoload: true
});

const board = new NeDB({
  filename: './data/board',
  autoload: true
});
 
// Create an Express compatible Feathers application instance.
const app = express(feathers());
// use CORS
app.use(cors({credentials: true, origin: true}));

// Turn on JSON parser for REST services
app.use(express.json());
// Turn on URL-encoded parser for REST services
app.use(express.urlencoded({extended: true}));
// Enable REST services
app.configure(express.rest());
// Enable Socket.io services
app.configure(socketio({path: '/ws/'}));
// Connect to the db, create and register a Feathers service.
app.use('/message', service({
  Model: message
}));
app.use('/board', service({
  Model: board
}));
// Set up default error handler
app.use(express.errorHandler());
 
// Create a dummy Message
app.service('message').create({
  text: 'Message created on server'
}).then(message => console.log('Created message', message));
 
// Start the server.
const port = 3030;
 
app.listen(port, () => {
  console.log(`Feathers server listening on port ${port}`);
});