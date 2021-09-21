import { Question, Option } from "./db";

const mockDBData = new Map<string, Question>();

export const mockDb = {
	get: async (id: string): Promise<Question | undefined> => {
		return mockDBData.get(id);
	},
	put: async (id: string, q: Question): Promise<Question> => {
		mockDBData.set(id, q);
		return q;
	},
	addQuestionOption: async (_userId: string, questionId: string): Promise<Question> => {
		const q = await mockDb.get(questionId);
		if (!q) {
			throw Error(`question ${questionId} not found`);
		}
		const option: Option = {
			index: q.options.length,
			text: "",
			selected: 0,
		};
		q.options.push(option);
		return await mockDb.put(questionId, q);
	},
	setQuestionOption: async (_userId: string, questionId: string, index: number, text: string): Promise<Question> => {
		const q = await mockDb.get(questionId);
		if (!q) {
			throw Error(`question ${questionId} not found`);
		}
		q.options[index].text = text;
		return await mockDb.put(questionId, q);
	},
	answer: async (_userId: string, questionId: string, index: number): Promise<Question> => {
		const q = await mockDb.get(questionId);
		if (!q) {
			throw Error(`question ${questionId} not found`);
		}
		q.options[index].selected++;
		return await mockDb.put(questionId, q);
	},
};

