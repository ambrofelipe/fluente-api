'use strict';

const mysql = require('mysql');
const env = require('dotenv').config();

const credentials = {
	host: process.env.MYSQL_HOST,
	user: process.env.MYSQL_USER,
	database: process.env.MYSQL_DATABASE,
	password: process.env.MYSQL_PASS
};

const connection = mysql.createConnection(credentials);

connection.connect();

module.exports = connection;