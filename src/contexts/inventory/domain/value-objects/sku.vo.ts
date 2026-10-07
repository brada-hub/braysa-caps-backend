import { InvalidValueObjectException } from '../../../shared/domain/domain.exception';

export class SKU {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || typeof value !== 'string') {
      throw new InvalidValueObjectException(
        'SKU',
        'SKU must be a non-empty string.',
      );
    }

    const trimmed = value.trim().toUpperCase();

    if (trimmed.length < 3 || trimmed.length > 60) {
      throw new InvalidValueObjectException(
        'SKU',
        `SKU length must be between 3 and 60 characters, received length: ${trimmed.length}`,
      );
    }

    // SKU can contain alphanumeric characters, hyphens, and underscores
    const skuRegex = /^[A-Z0-9_-]+$/;
    if (!skuRegex.test(trimmed)) {
      throw new InvalidValueObjectException(
        'SKU',
        `SKU "${trimmed}" contains invalid characters. Only alphanumeric, hyphens and underscores are allowed.`,
      );
    }

    this._value = trimmed;
  }

  get value(): string {
    return this._value;
  }

  equals(other: SKU): boolean {
    return this._value === other.value;
  }

  toString(): string {
    return this._value;
  }
}
