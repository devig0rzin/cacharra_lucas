import { stayErrorMessages, type StayValidationError } from "./domain";

export class DatesUnavailableError extends Error {
  constructor() {
    super("Essas datas acabaram de ser reservadas. Escolha outras datas.");
    this.name = "DatesUnavailableError";
  }
}

export class InvalidStayError extends Error {
  constructor(public readonly reason: StayValidationError) {
    super(stayErrorMessages[reason]);
    this.name = "InvalidStayError";
  }
}
