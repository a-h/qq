import { KnownBlock } from "@slack/bolt";
import { Question } from "./db";

export const actions = {
	onAddOption: "onAddOption",
	onQuestionOptionUpdated: "onQuestionOptionUpdated",
	onSend: "onSend",
	onCancel: "onCancel",
	onAnswerSelected: "onAnswerSelected",
}

export const createQuestionBlock = (q: Question): Array<KnownBlock> => [
	createQuestionHeader(q),
	...q.options.map((qo, i) => createQuestionOptionBlock(qo, q.questionId, i)),
	createQuestionOptionAddBlock(q.questionId),
	dividerBlock,
	createSendCancelBlock(q.questionId),
];


export const createOptionsBlock = (q: Question): Array<KnownBlock> => [
	createQuestionHeader(q),
	createPostedByText(q),
	...q.options.map((qo, i) => createAnswerSelectOptionBlock(qo, q.questionId, i)),
];

const createQuestionHeader = (q: Question): KnownBlock => ({
	type: "header",
	text: {
		type: "plain_text",
		text: q.question,
		emoji: true
	}
});

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
			action_id: actions.onAddOption,
		},
	],
});

const dividerBlock: KnownBlock = { type: "divider" };

const createSendCancelBlock = (questionId: string): KnownBlock => ({
	type: "actions",
	elements: [
		{
			action_id: actions.onSend,
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
			action_id: actions.onCancel,
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

const createQuestionOptionBlock = (text: string, questionId: string, index: number): KnownBlock => ({
	block_id: `questionOption/${questionId}/${index}`,
	type: "input",
	element: {
		type: "plain_text_input",
		initial_value: text,
		action_id: actions.onQuestionOptionUpdated,
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


const createPostedByText = (q: Question): KnownBlock => ({
	type: "context",
	elements: [
		{
			type: "plain_text",
			text: `Posted by: ${q.author}`,
			emoji: true
		}
	],
});

const createAnswerSelectOptionBlock = (text: string, questionId: string, index: number): KnownBlock => ({
	type: "section",
	text: {
		type: "plain_text",
		text: text,
	},
	accessory: {
		type: "button",
		text: {
			type: "plain_text",
			text: "Choose",
			emoji: true
		},
		value: `questionOption/${questionId}/${index}`,
		action_id: actions.onAnswerSelected,
	}
})
