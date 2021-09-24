import * as app from '../app';
import { configure } from '@vendia/serverless-express';
import express from 'express';
import { ExpressReceiver } from '@slack/bolt';
import * as expressWinston from 'express-winston';
import * as winston from 'winston';

const receiver = new ExpressReceiver({ signingSecret: process.env.SLACK_SIGNING_SECRET ?? "" });

// Wire up the bolt app to use the receiver.
app.create({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	receiver: receiver,
});

// Create an express app and route everything to the bolt app.
const expressHandler = express();
expressHandler.use(expressWinston.logger({
	transports: [
		new winston.transports.Console()
	],
	format: winston.format.json(),
}));
expressHandler.use('/', receiver.router);

// Configure the handler.
export const handler = configure({ app: expressHandler });
