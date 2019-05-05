const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const socketio = require('@feathersjs/socketio');
 
const NeDB = require('nedb');
const service = require('feathers-nedb');
 
const db = new NeDB({
  filename: './data/retro',
  autoload: true
});
 
// Create an Express compatible Feathers application instance.
const app = express(feathers());
// Turn on JSON parser for REST services
app.use(express.json());
// Turn on URL-encoded parser for REST services
app.use(express.urlencoded({extended: true}));
// Enable REST services
app.configure(express.rest());
// Enable Socket.io services
app.configure(socketio());
// Connect to the db, create and register a Feathers service.
app.use('/retro', service({
  Model: db
}));
// Set up default error handler
app.use(express.errorHandler());
 
// Create a dummy Message
app.service('retro').create({
  text: 'Message created on server'
}).then(message => console.log('Created message', message));
 
// Start the server.
const port = 3030;
 
app.listen(port, () => {
  console.log(`Feathers server listening on port ${port}`);
});