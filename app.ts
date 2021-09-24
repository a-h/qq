import { App, Receiver } from '@slack/bolt';
import { actions, createOptionsBlock, createQuestionBlock } from './blocks';
import * as db from './db';
import { createQuestion } from './db';

export interface Options {
	token: string | undefined,
	signingSecret: string | undefined,
	receiver: Receiver | undefined,
}

export const create = (options: Options) => {
	const app = new App({ ...options });

	app.command("/qq", async ({ ack, command, respond }) => {
		log.info("/qq: starting", {});
		const author = command.user_name;
		const questionText = command.text;
		const question = createQuestion(author, questionText);
		await db.put(question);
		await respond({
			text: "Preparing a question...",
			blocks: createQuestionBlock(question),
		});
		await ack();
	});

	app.action(actions.onOptionUpdated, async ({ ack, body }) => {
		log.info(actions.onOptionUpdated, {});
		if (body.type != "block_actions") {
			return;
		}
		for (const action of body.actions) {
			if (action.type != "plain_text_input") {
				continue;
			}
			const blockParts = action.block_id.split("/");
			const questionId = blockParts[1];
			const index = parseInt(blockParts[2]);
			await db.setQuestionOption(body.user.name, questionId, index, action.value);
		}
		await ack();
	});

	app.action(actions.onAddOption, async ({ ack, body, respond }) => {
		log.info(actions.onAddOption, {});
		if (body.type != "block_actions") {
			return;
		}
		for (const action of body.actions) {
			if (action.type != "button") {
				continue;
			}
			const question = await db.addQuestionOption(body.user.name, action.value);
			if (!question) {
				return
			}
			await respond({
				blocks: createQuestionBlock(question),
				replace_original: true,
			});
		}
		await ack();
	});

	app.action(actions.onCancel, async ({ ack, respond }) => {
		log.info(actions.onCancel, {});
		await respond({
			text: "Cancelled...",
			delete_original: true,
		});
		await ack();
	});

	app.action(actions.onSend, async ({ ack, body, respond, say }) => {
		log.info(actions.onSend, {});
		if (body.type != "block_actions") {
			await ack();
			return;
		}
		for (const action of body.actions) {
			if (action.type != "button") {
				continue;
			}
			const question = await db.get(action.value);
			if (!question) {
				return
			}
			await respond({
				text: "Sent...",
				replace_original: true,
			});
			await say({
				text: `@${body.user.name} has posted a quick question...`,
				blocks: createOptionsBlock(question),
			});
		}
		await ack();
	});

	app.action(actions.onOptionSelected, async ({ ack, body, respond }) => {
		log.info(actions.onOptionSelected, {});
		if (body.type != "block_actions") {
			await ack();
			return;
		}
		for (const action of body.actions) {
			if (action.type != "button") {
				continue;
			}
			const blockParts = action.value.split("/");
			const questionId = blockParts[1];
			const index = parseInt(blockParts[2]);
			console.log(`${body.user.id} is answering question ${questionId} with answer ${index}`)
			await db.answer(body.user.id, questionId, index);
			const question = await db.get(questionId);
			if (!question) {
				console.log(`question not found...`)
				await ack();
				return
			}
			await respond({
				response_type: "in_channel",
				replace_original: true,
				text: `@${body.user.name} has selected an answer...`,
				blocks: createOptionsBlock(question),
			});
		}
		await ack();
	});

	app.error(async error => log.error("unhandled error", { ...error }))

	return app;
};

const log = {
	info: (msg: string, data: Record<string, unknown>) =>
		console.log(
			JSON.stringify({
				time: new Date().toISOString(),
				level: "INFO",
				msg,
				...data,
			}),
		),
	error: (msg: string, data: Record<string, unknown>) =>
		console.log(
			JSON.stringify({
				time: new Date().toISOString(),
				level: "ERROR",
				msg,
				...data,
			}),
		),
};

export const start = async () => {
	const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
	const app = create({
		token: process.env.SLACK_BOT_TOKEN,
		signingSecret: process.env.SLACK_SIGNING_SECRET,
		receiver: undefined,
	});
	await app.start(port);
	console.log('⚡️ Bolt app is running!');
};
