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

		if(!email) return h.response("Invalid email").code(400);

		const response = await checkEmail(email);
        console.log("checkEmail attempt:", email, response.data)

		if (response.status === 200) {
			return h.response(response.data).code(200);
		} else {
			return h.response(response.message).code(500);
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

		if(response.status === "success") {
			return h.response(response.data).code(200);
		} else {
			return h.response(response.message).code(500);
		}

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

		if(!name)  return h.response("Invalid name").code(400);
		if(!email) return h.response("Invalid email").code(400);

		const response = await sendEmail(name, email);
		console.log("sendEmail attempt:", email, response, new Date());

		if(response.status === "success") {
			return h.response(response).code(200);
		} else if(response.status === "fail") {
			return h.response(response).code(400);
		} else {
			return h.response(response).code(500);
		}
		
	}
}

exports.subscribe = {
	cors: {
		origin: ['*']
	},

	handler: async (request, h) => {
		const payload = request.query;
		const token  = await sanitizer.token(payload.token);

		if(!token)  return h.response("Invalid token").code(400);

		const response = await subscribeContact(token);
		console.log("subscribe attempt:", token, response, new Date());

		if(response.status === "success") {
			return h.response(response).code(200);
		} else if(response.status === "fail") {
			return h.response(response).code(400);
		} else {
			return h.response(response).code(500);
		}
		
	}
}

exports.deleteContact = {
	cors: {
		origin: ['*']
	},

	handler: async (request, h) => {
		const payload = request.payload;
		const name  = await sanitizer.name(payload.name);
		const email = await sanitizer.email(payload.email);

		if(!name)  return h.response("Invalid name").code(400);
		if(!email) return h.response("Invalid email").code(400);

		const response = await deleteContact(name, email);
		console.log("deleteContact attempt:", email, response, new Date());

		if(response.status === "success") {
			return h.response(response.data.title).code(200);
		} else if(response.status === "fail") {
			return h.response(response.data.title).code(400);
		} else {
			return h.response(response.message).code(404);
		}
		
	}
}

const checkEmail = async (email) => {
	const checkEmailHeaders = {
		"x-rapidapi-host": process.env.CHECKEMAIL_URL,
		"x-rapidapi-key": process.env.CHECKEMAIL_KEY
	}

	return new Promise((resolve, reject) => {

		axios
			.get('https://' + process.env.CHECKEMAIL_URL + '?domain=' + email, { headers: checkEmailHeaders })
			.then(res => {
				console.info(`statusCode: ${res.status}`);
				return resolve(res);
			})
			.catch(error => {
				console.error(error);
				return reject(error);
			});
	})
	.catch(error => {
		console.error(error);
		return { status: "error", message: error };
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
				return resolve({ status: "success", data: res.data });
			})
			.catch(error => {
				console.error(error);
				return { status: "error", message: error };
			});
	});
}

const sendEmail = async (name, email) => {

	const isAlreadySubscribed = await subscriber.isAlreadySubscribed(email);
	if(isAlreadySubscribed) return { status: "fail", data: { title: `Oops! Desculpa, ${name}.`, message: `O ${email} já está inscrito.` } };

	const newContact = await subscriber.create(email);
	if(!newContact) return { status: "error", message: `Failed to create contact with email ${email}.` };

	const token = await subscriber.registerIntent(email);
	if(!token) return { status: "error", message: `Failed to register intent and create token for contact ${email}.` };

	const response = await subscriber.sendEmail(name, email, token);
	if(!response) return { status: "error", message: `Failed to send email to contact ${email}.` };

	const unsubscribe = await subscriber.unsubscribe(email);
	if(!unsubscribe) return { status: "fail", data: { title: `Oops! Desculpa, ${name}.`, message: `Não conseguimos salvar o ${email}.` } };

	return { status: "success", data: { title: `Eba, ${name}!`, message: `Enviamos seu guia e cupom de desconto para ${email}.`, name: name, email: email } };
}

const subscribeContact = async (token) => {
	const response = await subscriber.subscribe(token);
	if(!response) return { status: "fail", data: { title: "Oops! Houve um erro ao completar sua subscrição.", message: "Manda uma mensagem no Instagram que investigaremos o problema." } };

	return { status: "success", data: { title: "Parabéns! Sua subscrição está feita.", message: "Agora é só aproveitar o conteúdo." } };
}

const deleteContact = async(name, email) => {

	const deleted = await subscriber.delete(email);
	if(deleted.statusCode === 404) return { status: "error", message: "Contact is not in the list." };

	return { status: "success", data: { title: "Contact deleted.", name: name, email: email } };
}