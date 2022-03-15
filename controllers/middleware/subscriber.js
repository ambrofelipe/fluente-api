"use strict";

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const db = require("../helpers/database");

const contactList = "CTA";
AWS.config.update({region: "us-east-1"});

module.exports = {

	isAlreadySubscribed: async (email) => {

		/**
		 * Calls the AWS-SDK method getContact
		 * Returns a contact from a contact list.
		 */

		const sesv2 = new AWS.SESV2();

		const params = {
			ContactListName: contactList,
			EmailAddress: email
		};

		sesv2.getContact(params, (err, data) => {
			if(err) console.error(err, err.stack);
			else    return data;
		});

	},

	registerIntent: async (email) => {

		/**
		 * Creates token and inserts row into mysql table
		 * Returns the token
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

	sendEmail: async (name, email, token) => {

		/**
		 * Calls the AWS-SDK method sendEmail
		 * Returns a response object.
		 */

		const sesv2 = new AWS.SESV2();

		const params = {
			Content: {
				Template: {
					TemplateName: 'CTA',
					TemplateData: `{ "name": "${name}", "token": "${token}" }`
				}
			},
			Destination: {
				ToAddresses: [ email ]
			},
			EmailTags: [
				{
					Name: "new_subscriber", 
					Value: `${token}` 
				},
			],
			FromEmailAddress: 'hello@fluente.me',
			FromEmailAddressIdentityArn: 'arn:aws:ses:us-east-1:013663099253:identity/fluente.me',
			ListManagementOptions: {
				ContactListName: 'CTA',
				TopicName: 'Fun'
			},
		};

		sesv2.sendEmail(params, function(err, data) {
			if (err) console.error(err, err.stack);
			else     return data;
		});
	},

	registerSubscriber: (token) => [

		/**
		 * Add email address to SES List
		 */
	]

}
