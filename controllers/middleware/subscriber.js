"use strict";

const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const db = require("../helpers/database");

module.exports = {

	isAlreadySubscribed: async (email) => {

		/**
		 * Check SES List for email address
		 */
		
		const sesEndpoint = "email.us-east-1.amazonaws.com";
		const contactListName = "Fun";

		return new Promise(resolve => {

			axios
				.get(`${sesEndpoint}/v2/email/contact-lists/${contactListName}/contacts/${email}`)
				.then(res => {
					console.log(`statusCode: ${res}`);
					resolve(res);
				})
				.catch(error => {
					console.error(error)
				});
		});


	},

	registerIntent: async (email) => {

		/**
		 * Insert row to mysql table
		 * Return token
		 */

		const token = uuidv4();
		const insert = `INSERT INTO fluente_doubleoptin (id, email, token, active) VALUES ('', ${db.escape(email)}, '${token}', 0)`;

		return new Promise(resolve => {
			db.query(insert, (err, result) => {
				if(err) throw new Error(err);

				resolve(token);
			});
		});
	},

	registerSubscriber: (token) => [

		/**
		 * Add email address to SES List
		 */
	]

}