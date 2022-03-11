'use strict';

const Hapi = require('hapi');
const Inert = require('inert');

// CUSTOM CONTROLLERS
const Routes = require('./routes');

// SERVER SETTINGS
const server = Hapi.server({
	port: 8003,
	host: 'localhost',
	routes: {
		cors: {
			origin: ['fluente.me', 'fluente.local'],
			credentials: true
		},
		state: {
			parse: true,
			failAction: 'ignore'
		}
	}
});

// SERVER INIT
const init = async () => {
	await server.register([
		Inert 
	]);

	// ROUTES
	server.route(Routes);

	// SERVER START
	await server.start();

	return server;
};

init()
	.then(async (server) => {
		console.log(`Fluente API running at: ${server.info.uri}`);   
	})
	.catch(error => {
		console.error(error);
		process.exit(1);
	});