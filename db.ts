import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { v4 as uuidv4 } from 'uuid';

export const config = {
	tableName: process.env.QUESTIONS_TABLE_NAME ?? "questions",
	client: new DocumentClient(),
};

export const configure = (tableName: string, client: DocumentClient) => {
	config.tableName = tableName;
	config.client = client;
}

interface Record {
	pk: string
	sk: string
}

const createQuestionPartitionKey = (id: string) => `questions/${id}`;
const createQuestionSortKey = () => `_question`;

const createOptionSortKey = (index: number) => `_option/${index.toString().padStart(6, "0")}`;
const createAnswerSortKey = (userId: string) => `selection/${userId}`;

const createDefaultOptions = () => <Array<Option>>([
	{ index: 0, selected: 0, text: "", },
	{ index: 1, selected: 0, text: "", },
	{ index: 2, selected: 0, text: "", },
]);

export const createQuestion = (author: string, question: string, options: Array<Option> = createDefaultOptions()): Question => ({
	questionId: uuidv4(),
	author: author,
	question: question,
	options: options,
});

export interface Question {
	author: string
	questionId: string
	question: string
	options: Array<Option>
}

export interface Option {
	text: string
	index: number
	selected: number
}

interface QuestionRecord extends Record {
	author: string
	questionId: string
	question: string
}

interface OptionRecord extends Record {
	index: number
	text: string
	selected: number
}

interface AnswerRecord extends Record {
	questionId: string
	userId: string
	selectedIndex: number
}

export const get = async (id: string): Promise<Question | undefined> => {
	const params = {
		TableName: config.tableName,
		KeyConditionExpression: `#pk = :pk AND begins_with(#sk, :sk)`,
		ExpressionAttributeNames: {
			"#pk": "pk",
			"#sk": "sk",
		},
		ExpressionAttributeValues: {
			":pk": createQuestionPartitionKey(id),
			":sk": "_",
		},
		ConsistentRead: true,
	} as DocumentClient.QueryInput;
	const result = await config.client.query(params).promise();
	if (!result || !result.Items) {
		return undefined;
	}
	const q: Question = {
		questionId: "",
		question: "",
		author: "",
		options: [],
	};
	result.Items.forEach((item, index) => {
		const r = item as Record;
		if (r.sk == "_question") {
			const dbQuestion = r as QuestionRecord;
			q.questionId = dbQuestion.questionId;
			q.question = dbQuestion.question;
			q.author = dbQuestion.author;
			return;
		}
		if (r.sk.startsWith("_option")) {
			const dbOption = item as OptionRecord;
			const o: Option = {
				selected: dbOption.selected,
				index: index,
				text: dbOption.text,
			}
			q.options.push(o);
		}
	})
	return q;
}

export const put = async (q: Question): Promise<Question> => {
	const questionRecord: QuestionRecord = {
		...q,
		pk: createQuestionPartitionKey(q.questionId),
		sk: createQuestionSortKey(),
	};
	const optionRecords = q.options.map((o: Option, i: number) => <OptionRecord>({
		...o,
		pk: createQuestionPartitionKey(q.questionId),
		sk: createOptionSortKey(i),
	}));
	const writeItems = [questionRecord, ...optionRecords].map(r => <DocumentClient.TransactWriteItem>({
		Put: {
			Item: r,
			TableName: config.tableName,
		},
	}));
	await config.client.transactWrite({
		TransactItems: writeItems,
	}).promise();
	return q;
};

export const addQuestionOption = async (userId: string, questionId: string): Promise<Question> => {
	const question = await get(questionId);
	if (!question) {
		throw Error(`question ${questionId} not found`);
	}
	if (question.author !== userId) {
		throw Error(`${userId} is not allowed to edit question ${questionId} because they are not the author`);
	}
	const option: Option = {
		selected: 0,
		text: "",
		index: question.options.length + 1,
	}
	const optionRecord: OptionRecord = {
		...option,
		pk: createQuestionPartitionKey(questionId),
		sk: createOptionSortKey(option.index),
	};
	await config.client.put({
		Item: optionRecord,
		TableName: config.tableName,
	}).promise()
	question.options.push(option);
	return question;
};

export const setQuestionOption = async (userId: string, questionId: string, index: number, text: string): Promise<void> => {
	const question = await get(questionId);
	if (!question) {
		throw Error(`question ${questionId} not found`);
	}
	if (question.author !== userId) {
		throw Error(`${userId} is not allowed to edit question ${questionId} because they are not the author`);
	}
	const option: Option = {
		selected: 0,
		text: text,
		index,
	}
	const optionRecord: OptionRecord = {
		...option,
		pk: createQuestionPartitionKey(questionId),
		sk: createOptionSortKey(index),
	};
	await config.client.put({
		Item: optionRecord,
		TableName: config.tableName,
	}).promise()
};

export const answer = async (userId: string, questionId: string, index: number): Promise<void> => {
	const answerRecord: AnswerRecord = {
		pk: createQuestionPartitionKey(questionId),
		sk: createAnswerSortKey(userId),
		questionId: questionId,
		selectedIndex: index,
		userId: userId,
	};
	const putUserAnswer: DocumentClient.TransactWriteItem = {
		Put: {
			TableName: config.tableName,
			Item: answerRecord,
			ConditionExpression: "attribute_not_exists(#pk)",
			ExpressionAttributeNames: {
				"#pk": "pk",
			},
		},
	};
	const updateTotal: DocumentClient.TransactWriteItem = {
		Update: {
			TableName: config.tableName,
			Key: {
				pk: createQuestionPartitionKey(questionId),
				sk: createOptionSortKey(index),
			},
			UpdateExpression: `ADD #selected :value`,
			ExpressionAttributeNames: {
				"#pk": "pk",
				"#selected": "selected",
			},
			ExpressionAttributeValues: {
				":value": 1,
			},
			ConditionExpression: `attribute_exists(#pk)`,
		},
	};
	await config.client.transactWrite({
		TransactItems: [
			putUserAnswer,
			updateTotal,
		],
	}).promise();
};

