import { InvalidValueObjectException } from '../../../shared/domain/domain.exception';

export class StockQuantity {
  private readonly _value: number;

  constructor(value: number) {
    if (!Number.isInteger(value)) {
      throw new InvalidValueObjectException(
        'StockQuantity',
        `Quantity must be an integer, received: ${value}`,
      );
    }
    if (value < 0) {
      throw new InvalidValueObjectException(
        'StockQuantity',
        `Stock quantity cannot be negative, received: ${value}`,
      );
    }
    this._value = value;
  }

  get value(): number {
    return this._value;
  }

  add(other: StockQuantity): StockQuantity {
    return new StockQuantity(this._value + other.value);
  }

  subtract(other: StockQuantity): StockQuantity {
    const result = this._value - other.value;
    if (result < 0) {
      throw new InvalidValueObjectException(
        'StockQuantity',
        `Insufficient stock: current ${this._value}, requested deduction ${other.value}`,
      );
    }
    return new StockQuantity(result);
  }

  equals(other: StockQuantity): boolean {
    return this._value === other.value;
  }

  toString(): string {
    return this._value.toString();
  }
}
