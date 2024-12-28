import { QuestionType } from "../models";
import { v4 as uuidv4 } from "uuid";

export class Question {
  id: string;
  question: string;
  type: QuestionType;
  options: string[] | null;
  answer: string;
  full_answer: string | null;
  image: string | null;

  constructor(
    question: string,
    type: QuestionType,
    options: string[] | null,
    answer: string,
    full_answer: string | null,
    image: string | null
  ) {
    this.id = uuidv4();
    this.question = question;
    this.type = type;
    this.options = options;
    this.answer = answer;
    this.full_answer = full_answer;
    this.image = image;
  }
}

export class QuestionTrimmed {
  id: string;
  question: string;
  type: QuestionType;
  options: string[] | null;
  image: string | null;

  constructor(
    id: string, question: string, type: QuestionType, options: string[] | null, image: string | null
  ) {
    this.id = id;
    this.question = question;
    this.type = type;
    this.options = options;
    this.image = image;
  }  

  static fromQuestion(question: Question) {
    return new QuestionTrimmed(question.id, question.question, question.type, question.options, question.image);
  }
}
