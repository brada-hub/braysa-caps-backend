import { InvalidValueObjectException } from '../../../shared/domain/domain.exception';

export type ArqueoResult = 'CUADRADO' | 'SOBRANTE' | 'FALTANTE';

export class CashDifference {
  private readonly _difference: number;
  private readonly _status: ArqueoResult;

  constructor(difference: number) {
    if (typeof difference !== 'number' || Number.isNaN(difference)) {
      throw new InvalidValueObjectException(
        'CashDifference',
        `Difference must be a valid number, received: ${difference}`,
      );
    }

    // Standard financial rounding to 2 decimal places
    this._difference = Math.round((difference + Number.EPSILON) * 100) / 100;

    // Negligible epsilon for floating point equality
    if (Math.abs(this._difference) < 0.001) {
      this._difference = 0.0;
      this._status = 'CUADRADO';
    } else if (this._difference > 0) {
      this._status = 'SOBRANTE';
    } else {
      this._status = 'FALTANTE';
    }
  }

  /**
   * Calculates cash difference per ARCHITECTURE.md:
   * Diferencia = Efectivo_Declarado - Efectivo_Teorico
   * Estados: CUADRADO (0), SOBRANTE (> 0), FALTANTE (< 0)
   */
  static calculate(
    declaredCash: number,
    theoreticalCash: number,
  ): CashDifference {
    const diff = declaredCash - theoreticalCash;
    return new CashDifference(diff);
  }

  get difference(): number {
    return this._difference;
  }

  get status(): ArqueoResult {
    return this._status;
  }

  isBalanced(): boolean {
    return this._status === 'CUADRADO';
  }

  isSurplus(): boolean {
    return this._status === 'SOBRANTE';
  }

  isShortage(): boolean {
    return this._status === 'FALTANTE';
  }

  equals(other: CashDifference): boolean {
    return this._difference === other.difference && this._status === other.status;
  }

  toString(): string {
    return `${this._status} (${this._difference >= 0 ? '+' : ''}${this._difference.toFixed(2)})`;
  }
}
