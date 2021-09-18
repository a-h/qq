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
		q.options.push({ text: "" } as Option);
		//TODO: Not strictly required, since it's in-memory.
		return await db.put(questionId, q);
	},
	setQuestionOption: async (questionId: string, index: number, text: string): Promise<Question> => {
		//TODO: This mock example isn't thread safe.
		const q = await db.get(questionId);
		if (!q) {
			throw Error(`question ${questionId} not found`);
		}
		q.options[index].text = text;
		//TODO: Not strictly required, since it's in-memory.
		return await db.put(questionId, q);
	},
	answer: async (userId: string, questionId: string, index: number): Promise<Question> => {
		
		//TODO: This mock example isn't thread safe.
		const q = await db.get(questionId);
		if (!q) {
			throw Error(`question ${questionId} not found`);
		}
		q.options[index].selected ++;
		//TODO: Not strictly required, since it's in-memory.
		return await db.put(questionId, q);
	},
};

export interface Question {
	author: string
	questionId: string
	question: string
	options: Array<Option>
}

export interface Option {
	text: string
	selected: number
}
