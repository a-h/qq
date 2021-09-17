import { App, KnownBlock, LogLevel, SlackEventMiddlewareArgs } from '@slack/bolt';

const app = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
	logLevel: LogLevel.DEBUG,
});

const mockDb = new Map<string, Question>();

const db = {
	get: async (id: string): Promise<Question | undefined> => {
		return mockDb.get(id);
	},
	put: async (id: string, q: Question) => {
		mockDb.set(id, q);
	},
	deleteQuestionOption: async (questionId: string, questionOptionId: string): Promise<void> => {
		//TODO: This mock example isn't thread safe.
		const q = await db.get(questionId);
		if (!q) {
			return
		}
		q.options = q?.options.filter(o => o.questionOptionId != questionOptionId);
		//TODO: Not strictly required. ;)
		await db.put(questionId, q);
	},
};

// insert an example question.
const q: Question = {
	questionId: "question123",
	question: "What day is it?",
	options: [
		{ questionOptionId: "questionOption1", text: "Monday" },
		{ questionOptionId: "questionOption2", text: "Tuesday" },
		{ questionOptionId: "questionOption3", text: "Wednesday" },
		{ questionOptionId: "questionOption4", text: "Thursday" },
	],
};
(async () => {
	db.put(q.questionId, q);
})();

interface Question {
	questionId: string
	question: string
	options: Array<QuestionOption>
}

interface QuestionOption {
	questionOptionId: string
	text: string
}

interface Answers {
	answerId: string
}

const actionDelete = "actionDeleteOption";
const actionAddOption = "actionAddOption";

const createQuestionBlock = (q: Question): Array<KnownBlock> => [
	questionTextBlock(q),
	questionOptionsHeaderBlock,
	...q.options.map(qo => questionOptionBlock(q, qo)),
	questionOptionAddBlock,
	dividerBlock,
	sendCancelBlock,
];

const questionTextBlock = (q: Question): KnownBlock => ({
	"type": "input",
	"element": {
		"type": "plain_text_input",
		"action_id": "question",
	},
	"label": {
		"type": "plain_text",
		"text": "Question",
		"emoji": true
	}
});

const questionOptionsHeaderBlock: KnownBlock = {
	"type": "header",
	"text": {
		"type": "plain_text",
		"text": "Options",
		"emoji": true
	}
};

const questionOptionBlock = (q: Question, o: QuestionOption): KnownBlock => ({
	"type": "section",
	"text": {
		"type": "mrkdwn",
		"text": o.text,
	},
	"accessory": {
		"type": "button",
		"text": {
			"type": "plain_text",
			"text": ":bin:",
			"emoji": true
		},
		"value": getQuestionOptionBlockValueFromQuestionOptionId(q.questionId, o.questionOptionId),
		"action_id": actionDelete,
	}
})

interface QuestionIds {
	questionId: string
	questionOptionId: string
}

const getQuestionOptionIdFromQuestionOptionBlockValue = (v: string): QuestionIds => {
	const ids = v.split("/");
	return {
		questionId: ids[0],
		questionOptionId: ids[1],
	}
};
const getQuestionOptionBlockValueFromQuestionOptionId = (questionId: string, questionOptionId: string): string => `${questionId}/${questionOptionId}`;

const questionOptionAddBlock: KnownBlock = {
	"dispatch_action": true,
	"type": "input",
	"element": {
		"type": "plain_text_input",
		"action_id": actionAddOption,
	},
	"label": {
		"type": "plain_text",
		"text": "Add option",
		"emoji": true
	}
}

const dividerBlock: KnownBlock = { "type": "divider" };

const sendCancelBlock: KnownBlock = {
	"type": "actions",
	"elements": [
		{
			"type": "button",
			"text": {
				"type": "plain_text",
				"emoji": true,
				"text": "Send"
			},
			"style": "primary",
			"value": "send"
		},
		{
			"type": "button",
			"text": {
				"type": "plain_text",
				"emoji": true,
				"text": "Cancel"
			},
			"style": "danger",
			"value": "cancel"
		}
	]
}

app.message('hello', async (params: SlackEventMiddlewareArgs<"message">) => {
	const question = await db.get("question123");
	if (!question) {
		return
	}
	if (params.message.subtype === undefined) {
		await params.say({
			blocks: createQuestionBlock(question),
		});
	}
});

app.action(actionDelete, async ({ ack, body, respond }) => {
	await ack();
	if (body.type != "block_actions") {
		return;
	}
	for (const action of body.actions) {
		if (action.type == "button") {
			const id = getQuestionOptionIdFromQuestionOptionBlockValue(action.value);
			await db.deleteQuestionOption(id.questionId, id.questionOptionId);
			const question = await db.get(id.questionId);
			if (!question) {
				return
			}
		}
	}
	await respond({
		blocks: createQuestionBlock(q),
		replace_original: true,
	});
});

(async () => {
	const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
	await app.start(port);
	console.log('⚡️ Bolt app is running!');
})();
