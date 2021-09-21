import DynamoDB, { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as db from './db';

describe("db", () => {
	describe("put", () => {
		it("can create an initial record", async () => {
			const testDB = await createLocalTable();
			db.configure(testDB.name, testDB.client);
			try {
				const q = db.createQuestion("user123", "What is 2+2?");
				await db.put(q);
			} finally {
				await testDB.delete();
			}
		});
	});
	describe("get", () => {
		it("can get a record that has been created", async () => {
			const testDB = await createLocalTable();
			db.configure(testDB.name, testDB.client);
			try {
				const expected = db.createQuestion("user123", "What is 2+2?");
				await db.put(expected);

				const actual = await db.get(expected.questionId);
				expect(actual).toEqual(expected);
			} finally {
				await testDB.delete();
			}
		});
	});
	describe("addQuestionOption", () => {
		it("can add another option", async () => {
			const testDB = await createLocalTable();
			db.configure(testDB.name, testDB.client);
			try {
				const expected = db.createQuestion("user123", "What is 2+2?");
				await db.put(expected);
				await db.setQuestionOption("user123", expected.questionId, 0, "Answer 0");

				await db.addQuestionOption("user123", expected.questionId);

				const actual = await db.get(expected.questionId);
				expect(actual?.options.length).toEqual(expected.options.length + 1);
			} finally {
				await testDB.delete();
			}
		});
	});
	describe("setQuestionOption", () => {
		it("can set the value of an option", async () => {
			const testDB = await createLocalTable();
			db.configure(testDB.name, testDB.client);
			try {
				const expected = db.createQuestion("user123", "What is 2+2?");
				await db.put(expected);

				await db.setQuestionOption("user123", expected.questionId, 0, "Answer 0");

				const actual = await db.get(expected.questionId);
				expect(actual?.options[0].text).toEqual("Answer 0");
			} finally {
				await testDB.delete();
			}
		});
		it("can set the value of an option that doesn't exist", async () => {
			const testDB = await createLocalTable();
			db.configure(testDB.name, testDB.client);
			try {
				const expected = db.createQuestion("user123", "What is 2+2?");
				await db.put(expected);

				await db.setQuestionOption("user123", expected.questionId, 100, "Answer 100");

				const actual = await db.get(expected.questionId);
				expect(actual?.options.length).toEqual(4);
				expect(actual?.options[3].text).toEqual("Answer 100");
			} finally {
				await testDB.delete();
			}
		});
	});
	describe("answer", () => {
		it("can answer for a user", async () => {
			const testDB = await createLocalTable();
			db.configure(testDB.name, testDB.client);
			try {
				const expected = db.createQuestion("user1", "What is 2+2?");
				await db.put(expected);

				await db.answer("user2", expected.questionId, 0);

				const actual = await db.get(expected.questionId);
				expect(actual?.options[0].selected).toEqual(1);
			} finally {
				await testDB.delete();
			}
		});
		it("is not possible for a user to vote twice", async () => {
			const testDB = await createLocalTable();
			db.configure(testDB.name, testDB.client);
			try {
				const expected = db.createQuestion("user1", "What is 2+2?");
				await db.put(expected);

				await db.answer("user2", expected.questionId, 0);

				expect(db.answer("user2", expected.questionId, 0)).rejects.toThrow();
			} finally {
				await testDB.delete();
			}
		});
		it("is not possible to vote for a non-existent option", async () => {
			const testDB = await createLocalTable();
			db.configure(testDB.name, testDB.client);
			try {
				const expected = db.createQuestion("user1", "What is 2+2?");
				await db.put(expected);

				expect(db.answer("user2", expected.questionId, 60)).rejects.toThrow();
			} finally {
				await testDB.delete();
			}
		});
		it("can handle votes from multiple users", async () => {
			const testDB = await createLocalTable();
			db.configure(testDB.name, testDB.client);
			try {
				const expected = db.createQuestion("user1", "What is 2+2?");
				await db.put(expected);

				await db.answer("user2", expected.questionId, 0);
				await db.answer("user3", expected.questionId, 1);
				await db.answer("user4", expected.questionId, 1);
				await db.answer("user5", expected.questionId, 2);
				await db.answer("user6", expected.questionId, 2);

				const actual = await db.get(expected.questionId);
				expect(actual?.options[0].selected).toEqual(1);
				expect(actual?.options[1].selected).toEqual(2);
				expect(actual?.options[2].selected).toEqual(2);
			} finally {
				await testDB.delete();
			}
		});
	});
});

interface DB {
	name: string;
	client: DocumentClient;
	delete: () => Promise<any>;
}

const randomTableName = () => `qq_test_${new Date().getTime()}`;

const createLocalTable = async (): Promise<DB> => {
	const options = {
		region: "localhost", // The default for NoSQL Workbench.
		endpoint: "http://localhost:8000",
		credentials: {
			accessKeyId: "5dyqqr",
			secretAccessKey: "fqm4vf",
		},
	};

	const ddb = new DynamoDB(options);
	const tableName = randomTableName();
	await ddb
		.createTable({
			KeySchema: [
				{
					KeyType: "HASH",
					AttributeName: "pk",
				},
				{
					KeyType: "RANGE",
					AttributeName: "sk",
				},
			],
			TableName: tableName,
			AttributeDefinitions: [
				{
					AttributeName: "pk",
					AttributeType: "S",
				},
				{
					AttributeName: "sk",
					AttributeType: "S",
				},
			],
			BillingMode: "PAY_PER_REQUEST",
		})
		.promise();

	await ddb.waitFor("tableExists", { TableName: tableName }).promise();

	return {
		name: tableName,
		client: new DocumentClient(options),
		delete: async () => await ddb.deleteTable({ TableName: tableName }).promise(),
	};
};
