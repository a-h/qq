const mockDb = new Map<string, Question>();

export const db = {
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

export interface Question {
	author: string
	questionId: string
	question: string
	options: Array<string>
}
