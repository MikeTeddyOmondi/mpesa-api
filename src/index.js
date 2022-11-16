const path = require("path");
let env = path.join(__dirname, "..", ".env");
require("dotenv").config({
	path: env,
	debug: process.env.NODE_ENV === "development" ? true : false,
});

const {
	PORT,
	MONGO_REMOTE_URL,
	MONGO_LOCAL_URL,
	MPESA_ENVIRONMENT,
	MPESA_CONSUMER_KEY,
	MPESA_CONSUMER_SECRET,
	MPESA_EXPRESS_SHORTCODE,
	MPESA_INITIATOR_PASSWORD,
	MPESA_INITIATOR_SECURITY_CREDENTIAL,
	MPESA_PASSKEY,
	CALLBACK_URL,
	CALLBACK_ROUTE,
} = process.env;

const cors = require("cors");
const axios = require("axios");
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
// const Mpesa = require("mpesa-api").Mpesa;

// const credentials = {
// 	clientKey: MPESA_CONSUMER_KEY,
// 	clientSecret: MPESA_CONSUMER_SECRET,
// 	initiatorPassword: MPESA_INITIATOR_PASSWORD,
// 	securityCredential: MPESA_INITIATOR_SECURITY_CREDENTIAL,
// 	// certificatePath: "keys/example.cert",
// };

// const environment = MPESA_ENVIRONMENT;

// create a new instance of the api
// const mpesa = new Mpesa(credentials, environment);

const app = express();
const Transaction = require("./models/Transaction");
const { createError } = require("./utils/error");

const DB_URI =
	process.env.NODE_ENV === "development" ? MONGO_LOCAL_URL : MONGO_REMOTE_URL;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logs | Routes
process.env.NODE_ENV === "production"
	? app.use(morgan("common"))
	: app.use(morgan("dev"));

// Error Middleware
app.use((err, req, res, next) => {
	const errorStatus = err.status || 500;
	const errorMessage = err.message || "Something went wrong!";
	return res.status(errorStatus).json({
		success: false,
		status: errorStatus,
		message: errorMessage,
		stack: err.stack,
	});
});

//STEP 1 getting access token

const getAccessToken = async (req, res, next) => {
	const key = MPESA_CONSUMER_KEY;
	const secret = MPESA_CONSUMER_SECRET;
	const auth = new Buffer.from(`${key}:${secret}`).toString("base64");

	let token = "";

	//"https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
	//"https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

	try {
		res = await axios.get(
			"https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
			{
				headers: {
					Authorization: `Bearer ${auth}`,
				},
			},
		);
		token = res.data.access_token;
		req.token = token;
		return next();
	} catch (err) {
		console.log("> TOKEN GENERATION ERR: ", err);
		return next(createError(500, "Failed to generate access token"));
	}
};

app.get("/token", getAccessToken, async (req, res) => {
	// token = await getAccessToken();
	token = req.token;
	console.log(token);
	res.status(200).json({ token });
});

// STEP 2 STK Push Route
app.post("/stk", getAccessToken, async (req, res, next) => {
	const phone = req.body.phone.substring(1); //formated to 72190........
	const amount = req.body.amount;

	const token = req.token;

	const date = new Date();
	const timestamp =
		date.getFullYear() +
		("0" + (date.getMonth() + 1)).slice(-2) +
		("0" + date.getDate()).slice(-2) +
		("0" + date.getHours()).slice(-2) +
		("0" + date.getMinutes()).slice(-2) +
		("0" + date.getSeconds()).slice(-2);
	const shortCode = MPESA_EXPRESS_SHORTCODE;
	const passkey = MPESA_PASSKEY;

	const MPESA_CALLBACK_URL_STRING = `${CALLBACK_URL}/${CALLBACK_ROUTE}`;

	const password = new Buffer.from(shortCode + passkey + timestamp).toString(
		"base64",
	);

	// res.json({ token, phone, amount });

	// https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
	// https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest
	await axios
		.post(
			"https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
			{
				BusinessShortCode: shortCode,
				Password: password,
				Timestamp: timestamp,
				TransactionType: "CustomerPayBillOnline",
				Amount: amount,
				PartyA: `254${phone}`,
				PartyB: shortCode,
				PhoneNumber: `254${phone}`,
				CallBackURL: MPESA_CALLBACK_URL_STRING,
				AccountReference: 1279306645,
				TransactionDesc: "Hotel Elmiriam",
			},
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
			},
		)
		.then((resp) => {
			const response = resp;
			res.json(response.data);
		})
		.catch((err) => {
			res.json(err);
			// console.log(err.message);
			console.log("> STK PUSH ERR: ", err);
		});

	// mpesa
	// 	.lipaNaMpesaOnline({
	// 		BusinessShortCode: 123456,
	// 		Amount: 1000 /* 1000 is an example amount */,
	// 		PartyA: "Party A",
	// 		PhoneNumber: "Phone Number",
	// 		CallBackURL: "CallBack URL",
	// 		AccountReference: "Account Reference",
	// 		passKey: "Lipa Na Mpesa Pass Key",
	// 		TransactionType: "Transaction Type" /* OPTIONAL */,
	// 		TransactionDesc: "Transaction Description" /* OPTIONAL */,
	// 	})
	// 	.then((response) => {
	// 		//Do something with the response
	// 		//eg
	// 		console.log(response);
	// 	})
	// 	.catch((error) => {
	// 		//Do something with the error;
	// 		//eg
	// 		console.error(error);
	// 	});
});

// STEP 3 STK Push Callback Route
const callback_route = CALLBACK_ROUTE;
app.post(`/${callback_route}`, (req, res) => {
	console.log(req.body);

	if (!req.body.Body.stkCallback.CallbackMetadata) {
		console.log(req.body.Body.stkCallback.ResultDesc);
		res.status(200).json("ok");
		return;
	}

	const amount = req.body.Body.stkCallback.CallbackMetadata.Item[0].Value;
	const code = req.body.Body.stkCallback.CallbackMetadata.Item[1].Value;
	const phone1 =
		req.body.Body.stkCallback.CallbackMetadata.Item[4].Value.toString().substring(
			3,
		);
	const phone = `0${phone1}`;
	// saving the transaction to db
	console.log({
		phone,
		code,
		amount,
	});
	const transaction = new Transaction();

	transaction.customer_number = phone;
	transaction.mpesa_ref = code;
	transaction.amount = amount;

	transaction
		.save()
		.then((data) => {
			console.log({ message: "transaction saved successfully", data });
		})
		.catch((err) => console.log(err.message));

	res.status(200).json("ok");
});

// STK Push Query
app.post("/stkpushquery", getAccessToken, async (req, res, next) => {
	const CheckoutRequestID = req.body.CheckoutRequestID;
	const token = req.token;

	const date = new Date();
	const timestamp =
		date.getFullYear() +
		("0" + (date.getMonth() + 1)).slice(-2) +
		("0" + date.getDate()).slice(-2) +
		("0" + date.getHours()).slice(-2) +
		("0" + date.getMinutes()).slice(-2) +
		("0" + date.getSeconds()).slice(-2);
	const shortCode = MPESA_EXPRESS_SHORTCODE;
	const passkey = MPESA_PASSKEY;

	const password = new Buffer.from(shortCode + passkey + timestamp).toString(
		"base64",
	);

	// https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query
	// https://sandbox.safaricom.co.ke/mpesa/transactionstatus/v1/query
	await axios

		.post(
			"https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query",
			{
				BusinessShortCode: shortCode,
				Password: password,
				Timestamp: timestamp,
				CheckoutRequestID: CheckoutRequestID,
			},
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			},
		)
		.then((response) => {
			res.status(200).json(response.data);
		})
		.catch((err) => {
			console.log(err.message);
			res.status(400).json(err);
		});
});

app.get("/transactions", (req, res) => {
	Transaction.find({})
		.sort({ createdAt: -1 })
		.exec(function (err, data) {
			if (err) {
				res.status(400).json(err.message);
			} else {
				res.status(201).json(data);
				// data.forEach((transaction) => {
				//   const firstFour = transaction.customer_number.substring(0, 4);
				//   const lastTwo = transaction.customer_number.slice(-2);

				//   console.log(`${firstFour}xxxx${lastTwo}`);
				// });
			}
		});
});

// Database connection & application initialization
mongoose
	.connect(DB_URI)
	.then(() => console.log("Database connection successfull"))
	.then(() => {
		app.listen(PORT, () => {
			console.log(`Payment service is running: http://localhost:${PORT}`);
		});
	})
	.catch((err) => console.log(err));
