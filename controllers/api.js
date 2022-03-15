"use strict"
const axios = require("axios");
const env   = require("dotenv").config();

const subscriber = require("./middleware/subscriber");
const sanitizer  = require("./middleware/sanitizer");

exports.health = {
	cors: {
		origin: ["*"]
	},

	handler: (request, h) => {
		console.log("Fluente API running");
		return "Fluente API running";
	}
}

exports.checkEmail = {
	cors: {
		origin: ["*"]
	},
 
	handler: async (request, h) => {
		const payload = request.payload;
		const email = await sanitizer.email(payload.email);

		if(!email) throw new Error("Invalid email");

		const response = await verifyEmail(email);
        console.log("checkEmail attempt:", email, response.data)

		if (response.status === 200) {
			return h.response(response.data).code(200);
		}

	}
}

exports.sendEmail = {
	cors: {
		origin: ['*']
	},

	handler: async (request, h) => {
		const payload = request.payload;
		const name  = payload.name;
		const email = payload.email;

		if(!name || !email)  throw new Error("Invalid name or email");

		const response = await sendEmail(name, email);
		console.log("sendEmail attempt:", email, response.success, new Date());

		if(response.success === "OK") {
			return h.response(response.success).code(200);
		}
		
	}
}

exports.recaptcha = {
	cors: {
		origin: ['*']
	},

	handler: async (request, h) => {
		
		const payload = request.payload;
		
		const token = payload.token || '';

		const response = await verifyToken(token);
        console.log("recaptcha attempt:", token, response.data);

		if(response.data.success === true) {
			return h.response(response.data);
		}

	}
}

const verifyEmail = async (email) => {
	const checkEmailHeaders = {
		"x-rapidapi-host": process.env.CHECKEMAIL_URL,
		"x-rapidapi-key": process.env.CHECKEMAIL_KEY
	}

	const promise = new Promise(resolve => {

		axios
			.get('https://' + process.env.CHECKEMAIL_URL + '?domain=' + email, { headers: checkEmailHeaders })
			.then(res => {
				console.info(`statusCode: ${res.status}`);
				resolve(res);
			})
			.catch(error => {
				console.error(error)
			});
	})
	.catch(error => {
		console.log(error);
	});

	return promise;
}

const sendEmail = async (name, email) => {

	const isAlreadySubscribed = await subscriber.isAlreadySubscribed(email);

	console.log("isAlreadySubscribed", isAlreadySubscribed);

	if(isAlreadySubscribed) return { success: false, message: `${email} is already a subscriber.` };

	const token = await subscriber.registerIntent(email);

	console.log("token", token);

	if(!token) return { success: false, message: `Failed to register intent and create token.` }

	const response = await subscriber.sendEmail(name, email, token);

	console.log("email", response);

	if(!response) return { success: false, message: `Failed to send email.` }

	return { success: true, message: `Email sent.` }
}

const verifyToken = async (token) => {

	return new Promise(resolve => {
		
		axios
			.post(
				process.env.RECAPTCHA_URL + 
				'?secret=' + process.env.RECAPTCHA_SECRET + 
				'&response=' + token
			)
			.then(res => {
				console.info(`statusCode: ${res.status}`);
				resolve({ data: res.data });
			})
			.catch(error => {
				console.error(error);
			});
	});
}
