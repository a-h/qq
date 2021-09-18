import { App } from '@slack/bolt';
import { actions, createOptionsBlock, createQuestionBlock } from './blocks';
import { db, Question } from './db';

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
});

app.command("/qq", async ({ ack, command, respond }) => {
	await ack();
	// TODO: Generate an ID properly.
	const question: Question = {
		author: command.user_name,
		questionId: `${(new Date()).getDate()}`,
		question: command.text,
		options: [
			{ text: "", selected: 0 },
			{ text: "", selected: 0 },
			{ text: "", selected: 0 }
		],
	};
	await db.put(question.questionId, question);
	await respond({
		text: "Preparing a question...",
		blocks: createQuestionBlock(question),
	});
});

app.action(actions.onOptionUpdated, async ({ ack, body }) => {
	await ack();
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
		await db.setQuestionOption(questionId, index, action.value);
	}
});

app.action(actions.onAddOption, async ({ ack, body, respond }) => {
	await ack();
	if (body.type != "block_actions") {
		return;
	}
	for (const action of body.actions) {
		if (action.type != "button") {
			continue;
		}
		const question = await db.addQuestionOption(action.value);
		if (!question) {
			return
		}
		await respond({
			blocks: createQuestionBlock(question),
			replace_original: true,
		});
	}
});

app.action(actions.onCancel, async ({ ack, respond }) => {
	await ack();
	await respond({
		text: "Cancelled...",
		delete_original: true,
	});
});

app.action(actions.onSend, async ({ ack, body, respond, say }) => {
	await ack();
	if (body.type != "block_actions") {
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
});

app.action(actions.onOptionSelected, async ({ ack, body, respond }) => {
	await ack();
	if (body.type != "block_actions") {
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
		const question = await db.answer(body.user.id, questionId, index);
		if (!question) {
			console.log(`question not found...`)
			return
		}
		await respond({
			response_type: "in_channel",
			replace_original: true,
			text: `@${body.user.name} has selected an answer...`,
			blocks: createOptionsBlock(question),
		});
	}
});

(async () => {
	const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
	await app.start(port);
	console.log('⚡️ Bolt app is running!');
})();
