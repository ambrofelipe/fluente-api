'use strict';

const API = require("./controllers/api");

module.exports = [
	{ method: 'GET', path: '/health', options: API.health },
	{ method: 'POST', path: '/checkEmail', options: API.checkEmail },
	{ method: 'POST', path: '/sendEmail', options: API.sendEmail },
	{ method: 'POST', path: '/recaptcha', options: API.recaptcha }
]
