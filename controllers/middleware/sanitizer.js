"use strict";

const Hoek = require("@hapi/hoek");
const Joi  = require("joi");

module.exports = {

	name: async (name) => {

		const schema = Joi.object({
			name: Joi.string()
					.min(1)
					.max(255)
					.required()
		});

		const res = await schema.validateAsync({ name: name });

		if(res.error !== undefined) throw new Error(res.error);

		return Hoek.escapeHtml(res.name);
	},

	email: async (address) => {

		const schema = Joi.object({
			email: Joi.string()
					.email()
					.min(3)
					.max(255)
					.required()
		});

		const res = await schema.validateAsync({ email: address });

		if(res.error !== undefined) throw new Error(res.error);

		return Hoek.escapeHtml(res.email).replace(/&#x40;/, "@");
	},

	token: async (value) => {

		const schema = Joi.object({
			token: Joi.string()
					.min(16)
					.max(64)
					.required()
		});

		const res = await schema.validateAsync({ token: value });

		if(res.error !== undefined) throw new Error(res.error);

		return Hoek.escapeHtml(res.token);
	}


}