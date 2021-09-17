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
  }
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
	...q.options.map(qo => questionOptionBlock(qo)),
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

const questionOptionBlock = (o: QuestionOption): KnownBlock => ({
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
		"value": o.questionOptionId,
		"action_id": actionDelete,
	}
})

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
	console.log('received message');
	const question = await db.get("question123");
	if(!question) {
	  return
	}
	if (params.message.subtype === undefined) {
		await params.say({
			blocks: createQuestionBlock(question),
			text: `Hey there <@${params.message.user}>!`
		});
	}
});

app.action(actionDelete, async ({ ack, body, respond }) => {
	// Acknowledge the action
	await ack();
	if (body.type != "block_actions") {
		return;
	}
	console.log("received action", { body });
	// TODO: Get the question by ID.
	const question = await db.get("question123");
	if(!question) {
	  return
	}
	question.options[0].text = "Mon";
	await respond({
		blocks: createQuestionBlock(q),
		replace_original: true,
	});
	//await say(`<@${body.user.id}> clicked the button`);
});

(async () => {
	const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
	await app.start(port);
	console.log('⚡️ Bolt app is running!');
})();
