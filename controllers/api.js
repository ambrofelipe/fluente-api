"use strict"
const axios = require("axios");
const env   = require("dotenv").config();

const AWS = require("aws-sdk");

const subscriber = require("./middleware/subscriber");
const sanitizer  = require("./middleware/sanitizer");

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

exports.teste = {
	cors: {
		origin: ["*"]
	},

	handler: (request, h) => {
		return "API Fluente";
	}
}

exports.sendEmail = {
	cors: {
		origin: ['*']
	},

	handler: async (request, h) => {

		const payload = request.payload;
		const name  = await sanitizer.name(payload.name);
		const email = await sanitizer.email(payload.email);

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

	console.log("Teste verifyEmail");

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

	AWS.config.update({region: "us-east-1"});

	const isAlreadySubscribed = await subscriber.isAlreadySubscribed(email);
	
	if(isAlreadySubscribed) return { success: false, message: `${email} is already a subscriber.` };

	const token = await subscriber.registerIntent(email);

	const params = {
		Destination: {
			CcAddresses: [],
			ToAddresses: [ email ],
		},
		Source: "hello@fluente.me",
		Template: "CTA",
		TemplateData: `{ "name": "${name}", "token": "${token}" }`,
	};

	return new Promise(resolve => {
		new AWS.SES({apiVersion: '2010-12-01'})
			.sendTemplatedEmail(params)
			.promise()
			.then(data => {
				if(data.MessageId !== undefined) resolve({ success: "OK" });
			})
			.catch(err => {
				console.error(err, err.stack);
			});
	});
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