"use strict";

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const db = require("../helpers/database");
const { email } = require("./sanitizer");

AWS.config.update({region: "us-east-1"});
const sesv2 = new AWS.SESV2();

const CONTACT_LIST = "CTA";
const TEMPLATE = "CTA";

module.exports = {

	isAlreadySubscribed: async (email) => {

		/**
		 * Calls the AWS-SDK SES method getContact
		 * Returns a contact from a contact list.
		 */

		const params = {
			ContactListName: CONTACT_LIST,
			EmailAddress: email
		};

		return new Promise(resolve => {
			sesv2.getContact(params, (err, data) => {
				if(err && err.code !== "NotFoundException") 	 return resolve(err);
				else if(data && data.EmailAddress !== undefined) return resolve(true);
				else											 return resolve(false);
			});
		});

	},

	create: async(email) => {

		/**
		 * Calls the AWS-SDK method createContact. Adds user to the CTA list, enabling it for sendEmail.
		 * Returns a response object.
		 */

		const params = {
			ContactListName: CONTACT_LIST, 
			EmailAddress: email,
			TopicPreferences: [
				{
					SubscriptionStatus: "OPT_IN", 
					TopicName: "Fun"
				},
			],
			UnsubscribeAll: false
		};

		return new Promise(resolve => {
			sesv2.createContact(params, (err, data) => {
				if(err) {
					console.error("createContact error:", err);
					return resolve(false);
				} else { 
					return resolve(true);
				}
			});
		});
	},

	unsubscribe: async(email) => {

		/**
		 * Calls the AWS-SDK method updateContact. Opts user out of mailing list, disabling sendEmail.
		 * Returns a response object.
		 */

		const params = {
			ContactListName: CONTACT_LIST, 
			EmailAddress: email,
			TopicPreferences: [
				{
					SubscriptionStatus: "OPT_OUT", 
					TopicName: "Fun"
				},
			],
			UnsubscribeAll: false
		};

		return new Promise(resolve => {
			sesv2.updateContact(params, (err, data) => {
				if(err) {
					console.error("updateContact error:", err);
					return resolve(false);
				} else { 
					return resolve(true);
				}
			});
		});
	},

	delete: async (email) => {

		/**
		 * Calls the AWS-SDK method deleteContact. Removes user from the CTA list.
		 * Returns a response object.
		 */

		const sesv2 = new AWS.SESV2();

		const params = {
			ContactListName: CONTACT_LIST, 
			EmailAddress: email,
		};

		return new Promise(resolve => {
			sesv2.deleteContact(params, (err, data) => {
				if(err) resolve(err); 
				else	resolve(data);
			});
		});
	},

	registerIntent: async (email) => {

		/**
		 * Creates verification token and inserts row into mysql table
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
					TemplateName: TEMPLATE,
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
			FromEmailAddress: "hello@fluente.me",
			FromEmailAddressIdentityArn: "arn:aws:ses:us-east-1:013663099253:identity/fluente.me",
			ListManagementOptions: {
				ContactListName: CONTACT_LIST,
				TopicName: "Fun"
			},
		};

		return new Promise(resolve => {
			sesv2.sendEmail(params, (err, data) => {
				if(err) resolve(err); 
				else	resolve(data);
			});
		});
	},

	subscribe: async (token) => {

		/**
		 * Calls the AWS-SDK method updateContact. Opts email into the CTA list, enabling it for mailing.
		 * Returns a response object.
		 */

		const select = `SELECT email, active FROM fluente_doubleoptin WHERE token = ${db.escape(token)} LIMIT 1`;

		const user = await new Promise(resolve => {
			db.query(select, (err, result) => {
				if(err) resolve(err);
				
				resolve(result[0]);
			});
		});

		if(!user.email || user.active) return false;

		const update = `UPDATE fluente_doubleoptin SET active = 1 WHERE email = '${user.email}'`;

		const active = await new Promise(resolve => {
			db.query(update, (err, result) => {
				if(err) resolve(err);

				resolve(result.affectedRows);
			});
		});

		if(!active) return false;

		const params = {
			ContactListName: CONTACT_LIST, 
			EmailAddress: user.email,
			TopicPreferences: [
				{
					SubscriptionStatus: "OPT_IN", 
					TopicName: "Fun"
				},
			],
			UnsubscribeAll: false
		};

		return new Promise(resolve => {
			sesv2.updateContact(params, (err, data) => {
				if(err) {
					console.error("updateContact error:", err);
					return resolve(false);
				} else { 
					return resolve(true);
				}
			});
		});

	}

}
