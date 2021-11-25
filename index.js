const express = require('express');
const mongodb = require('mongodb');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoClient = mongodb.MongoClient;

// const { mailOptione, transporter } = require('./mail');

dotenv.config();
const DB_URL = process.env.DB_URL;
const DATA_BASE = process.env.DATA_BASE;
const COLLECTION = 'otp';
const PORT = process.env.PORT || 5000;

const app = express();

app.use(express.json());

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL,
		pass: process.env.PASSWORD,
	},
});

const mailOptione = {
	from: process.env.EMAIL,
	subject: 'OTP Manager',
	text: 'Hi sir/madam',
};

app.post('/generate', async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		await db.collection(COLLECTION).createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 });
		console.log('index created');
		const user = await db.collection(COLLECTION).findOne({ email: req.body.email });
		if (!user) {
			const otp = Math.random().toString(10).split('.')[1].slice(0, 6);

			await db
				.collection(COLLECTION)
				.insertOne({ createdAt: new Date(), email: req.body.email, otp: otp });
			mailOptione.to = req.body.email;
			mailOptione.html = `
         <p>Your OTP is for OTP Manager App is</p>
         <h3>${otp}</h3>
         <p>this OTP will be valid only 5 minutes at the time of getting this mail</p>`;
			transporter.sendMail(mailOptione, (err, data) => {
				if (err) {
					console.log(err);
				} else {
					console.log('Email Sent');
				}
			});
			res.status(200).json({ message: 'created' });
		} else {
			console.log('User already exixt');
		}
	} catch (error) {
		console.log(error);
		res.status(400).json({ message: 'something went wrong' });
	}
});

app.post('/verify', async (req, res) => {
	try {
		const client = await mongoClient.connect(DB_URL);
		const db = client.db(DATA_BASE);
		const user = await db.collection(COLLECTION).findOne({ email: req.body.email });
		if (user) {
			const record = await db.collection(COLLECTION).findOne({ email: req.body.email });
			if (record.otp === req.body.otp) {
				await db.collection(COLLECTION).deleteOne({ email: req.body.email });
				res.status(200).json({ message: 'OTP Matched', result: true });
			} else {
				res.status(400).json({ message: 'Entered OTP is wrong', result: false });
			}
		} else {
			res.status(400).json({ message: 'Incorrect Email Id or the OTP expires', result: false });
		}
	} catch (error) {
		console.log(error);
		res.json({ message: 'something went wrong' });
	}
});

app.listen(PORT, () => console.log(`:::server started on port ${PORT}:::`));
