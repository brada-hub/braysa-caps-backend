import { CostoPromedioPonderado } from '../../../src/contexts/inventory/domain/value-objects/costo-promedio-ponderado.vo';
import { StockQuantity } from '../../../src/contexts/inventory/domain/value-objects/stock-quantity.vo';

describe('CostoPromedioPonderado Value Object', () => {
  it('should create a valid CostoPromedioPonderado rounded to 2 decimals', () => {
    const cost = new CostoPromedioPonderado(15.556);
    expect(cost.value).toBe(15.56);
    expect(cost.toString()).toBe('15.56');
  });

  it('should throw an error if cost is negative', () => {
    expect(() => new CostoPromedioPonderado(-10)).toThrow();
  });

  it('should calculate Costo Promedio Ponderado (CPP) correctly per ARCHITECTURE.md', () => {
    // Current stock: 10 units at $20 each = $200 total value
    const currentStock = new StockQuantity(10);
    const currentCost = new CostoPromedioPonderado(20.0);

    // New batch: 20 units at $35 each = $700 total batch cost
    const batchQuantity = new StockQuantity(20);
    const batchCost = new CostoPromedioPonderado(35.0);

    // Expected CPP = (200 + 700) / (10 + 20) = 900 / 30 = 30.00
    const newCpp = CostoPromedioPonderado.calculate(
      currentStock,
      currentCost,
      batchQuantity,
      batchCost,
    );

    expect(newCpp.value).toBe(30.0);
  });

  it('should set CPP to batch cost when initial stock is 0', () => {
    const currentStock = new StockQuantity(0);
    const currentCost = new CostoPromedioPonderado(0.0);

    const batchQuantity = new StockQuantity(50);
    const batchCost = new CostoPromedioPonderado(12.75);

    const newCpp = CostoPromedioPonderado.calculate(
      currentStock,
      currentCost,
      batchQuantity,
      batchCost,
    );

    expect(newCpp.value).toBe(12.75);
  });
});
