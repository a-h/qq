const mockDb = new Map<string, Question>();

export const db = {
	get: async (id: string): Promise<Question | undefined> => {
		return mockDb.get(id);
	},
	put: async (id: string, q: Question): Promise<Question> => {
		mockDb.set(id, q);
		return q;
	},
	addQuestionOption: async (userId: string, questionId: string): Promise<Question> => {
		//TODO: This mock example isn't thread safe.
		const q = await db.get(questionId);
		if (!q) {
			throw Error(`question ${questionId} not found`);
		}
		q.options.push({ text: "" } as Option);
		//TODO: Not strictly required, since it's in-memory.
		return await db.put(questionId, q);
	},
	setQuestionOption: async (userId: string, questionId: string, index: number, text: string): Promise<Question> => {
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

// SQL thinking...
// Table questions {
  //questionId int [pk, increment]
  //authorId int [ref: > users.userId]
  //question varchar(max)
//}

//Table options {
  //optionId int [pk, increment]
  //questionId int [ref: > questions.questionId]
  //optionText varchar(max)
 //}
 
//Table selections {
   //selectionId int [pk, increment]
   //userId int [ref: > users.userId]
   //optionId int [ref: > options.optionId]
//}

//Table users {
   //userId int [pk, increment]
   //name varchar(max)
//}

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

interface QuestionRecord {
	pk: string
	sk: string
	author: string
	questionId: string
	question: string
}

interface OptionRecord {
	pk: string
	sk: string
	index: number
	text: string
	selected: number
}

interface SelectionRecord {
	pk: string
	sk: string
	questionId: string
	userId: string
	selectedIndex: number
}
