export abstract class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, identifier: string) {
    super(`${entityName} with identifier "${identifier}" was not found.`);
  }
}

export class InvalidValueObjectException extends DomainException {
  constructor(voName: string, message: string) {
    super(`[${voName}]: ${message}`);
  }
}

export class BusinessRuleViolationException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}
