'use strict';

const API = require("./controllers/api");

module.exports = [
	{ method: 'POST', path: '/checkEmail', options: API.checkEmail },
	{ method: 'POST', path: '/sendEmail', options: API.sendEmail },
	{ method: 'POST', path: '/recaptcha', options: API.recaptcha },
	{ method: 'GET', path: '/teste', options: API.teste }
	
]