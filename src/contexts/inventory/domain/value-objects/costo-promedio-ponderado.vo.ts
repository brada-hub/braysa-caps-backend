import { InvalidValueObjectException } from '../../../shared/domain/domain.exception';
import { StockQuantity } from './stock-quantity.vo';

export class CostoPromedioPonderado {
  private readonly _value: number;

  constructor(value: number) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      throw new InvalidValueObjectException(
        'CostoPromedioPonderado',
        `Cost must be a valid number, received: ${value}`,
      );
    }
    if (value < 0) {
      throw new InvalidValueObjectException(
        'CostoPromedioPonderado',
        `Cost cannot be negative, received: ${value}`,
      );
    }
    // Maintain standard financial precision (2 decimal places)
    this._value = Math.round((value + Number.EPSILON) * 100) / 100;
  }

  get value(): number {
    return this._value;
  }

  /**
   * Recalculates the Weighted Average Cost (CPP) per RN-01:
   * CPP = ((Stock_Actual * Costo_Actual) + Costo_Total_Lote) / (Stock_Actual + Cantidad_Nueva)
   */
  static calculateFromBatchTotal(
    currentStock: StockQuantity,
    currentCost: CostoPromedioPonderado,
    batchQuantity: StockQuantity,
    totalBatchCost: number,
  ): CostoPromedioPonderado {
    if (batchQuantity.value <= 0) {
      throw new InvalidValueObjectException(
        'CostoPromedioPonderado',
        'Batch purchase quantity must be greater than zero to recalculate CPP.',
      );
    }
    if (totalBatchCost < 0) {
      throw new InvalidValueObjectException(
        'CostoPromedioPonderado',
        'Total batch cost cannot be negative.',
      );
    }

    const currentTotalValue = currentStock.value * currentCost.value;
    const totalNewStock = currentStock.value + batchQuantity.value;

    if (totalNewStock === 0) {
      return new CostoPromedioPonderado(0);
    }

    const newCpp = (currentTotalValue + totalBatchCost) / totalNewStock;
    return new CostoPromedioPonderado(newCpp);
  }

  /**
   * Helper calculation receiving unit cost of the batch.
   */
  static calculate(
    currentStock: StockQuantity,
    currentCost: CostoPromedioPonderado,
    batchQuantity: StockQuantity,
    batchUnitCost: CostoPromedioPonderado,
  ): CostoPromedioPonderado {
    const totalBatchCost = batchQuantity.value * batchUnitCost.value;
    return CostoPromedioPonderado.calculateFromBatchTotal(
      currentStock,
      currentCost,
      batchQuantity,
      totalBatchCost,
    );
  }

  equals(other: CostoPromedioPonderado): boolean {
    return this._value === other.value;
  }

  toString(): string {
    return this._value.toFixed(2);
  }
}
