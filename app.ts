import { App, KnownBlock, SlackEventMiddlewareArgs } from '@slack/bolt';

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const mockDb = new Map<string, Question>();

const db = {
	get: async (id: string): Promise<Question | undefined> => {
		return mockDb.get(id);
	},
	put: async (id: string, q: Question): Promise<Question> => {
		mockDb.set(id, q);
		return q;
	},
	addQuestionOption: async (questionId: string): Promise<Question> => {
		//TODO: This mock example isn't thread safe.
		const q = await db.get(questionId);
		if (!q) {
			throw Error(`question ${questionId} not found`);
		}
		q.options.push("");
		//TODO: Not strictly required, since it's in-memory.
		return await db.put(questionId, q);
	},
	setQuestionOption: async (questionId: string, index: number, text: string): Promise<Question> => {
		//TODO: This mock example isn't thread safe.
		const q = await db.get(questionId);
		if (!q) {
			throw Error(`question ${questionId} not found`);
		}
		q.options[index] = text;
		//TODO: Not strictly required, since it's in-memory.
		return await db.put(questionId, q);
	},
};

// insert an example question.
const q: Question = {
	questionId: "question123",
	question: "What day is it?",
	options: ["Monday", "Tuesday", "Wednesday", "Thursday"],
};
(async () => {
	db.put(q.questionId, q);
})();

interface Question {
	questionId: string
	question: string
	options: Array<string>
}

const actionAddOption = "actionAddOption";
const actionSend = "actionSend";
const actionCancel = "actionCancel";
const actionQuestionOptionUpdated = "actionQuestionOptionUpdated";

const createQuestionBlock = (q: Question): Array<KnownBlock> => [
	createQuestionHeader(q),
	...q.options.map((qo, i) => createQuestionOptionBlock(qo, q.questionId, i)),
	createQuestionOptionAddBlock(q.questionId),
	dividerBlock,
	createSendCancelBlock(q.questionId),
];

const createQuestionHeader = (q: Question): KnownBlock => ({
	type: "header",
	text: {
		type: "plain_text",
		text: q.question,
		emoji: true
	}
});

const createQuestionOptionBlock = (text: string, questionId: string, index: number): KnownBlock => ({
	block_id: `questionOption/${questionId}/${index}`,
	type: "input",
	element: {
		type: "plain_text_input",
		initial_value: text,
		action_id: actionQuestionOptionUpdated,
		dispatch_action_config: {
			trigger_actions_on: ['on_character_entered'],
		},
	},
	dispatch_action: true,
	label: {
		type: "plain_text",
		text: `Option ${index + 1}`,
		emoji: true,
	}
})

const createQuestionOptionAddBlock = (questionId: string): KnownBlock => ({
	type: "actions",
	elements: [
		{
			type: "button",
			text: {
				type: "plain_text",
				text: "Add option",
				emoji: true
			},
			value: questionId,
			action_id: actionAddOption,
		},
	],
});

const dividerBlock: KnownBlock = { type: "divider" };

const createSendCancelBlock = (questionId: string): KnownBlock => ({
	type: "actions",
	elements: [
		{
			action_id: actionSend,
			type: "button",
			text: {
				"type": "plain_text",
				"emoji": true,
				"text": "Send"
			},
			style: "primary",
			value: questionId,
		},
		{
			action_id: actionCancel,
			type: "button",
			text: {
				type: "plain_text",
				emoji: true,
				text: "Cancel"
			},
			style: "danger",
			value: questionId,
		}
	]
});

app.message('hello', async (params: SlackEventMiddlewareArgs<"message">) => {
	const question = await db.get("question123");
	if (!question) {
		return
	}
	if (params.message.subtype !== undefined) {
		return
	}
	await params.say({
		text: "Preparing a question...",
		blocks: createQuestionBlock(question),
	});
});

app.action(actionQuestionOptionUpdated, async ({ ack, body }) => {
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

app.action(actionAddOption, async ({ ack, body, respond }) => {
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
	}
	await respond({
		blocks: createQuestionBlock(q),
		replace_original: true,
	});
});

app.action(actionCancel, async ({ ack, respond }) => {
	await ack();
	await respond({
		text: "Cancelled...",
		delete_original: true,
	});
});

app.action(actionSend, async ({ ack, body, respond, say }) => {
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
	}
	await respond({
		text: "Sent...",	
		replace_original: true,
	});
	await say({
		text: `@${body.user.name} wanted to post a poll...`,
	});
});

(async () => {
	const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
	await app.start(port);
	console.log('⚡️ Bolt app is running!');
})();
