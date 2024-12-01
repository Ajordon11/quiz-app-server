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
