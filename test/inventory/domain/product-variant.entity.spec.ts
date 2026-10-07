import { ProductVariant } from '../../../src/contexts/inventory/domain/entities/product-variant.aggregate';
import { SKU } from '../../../src/contexts/inventory/domain/value-objects/sku.vo';
import { StockQuantity } from '../../../src/contexts/inventory/domain/value-objects/stock-quantity.vo';
import { CostoPromedioPonderado } from '../../../src/contexts/inventory/domain/value-objects/costo-promedio-ponderado.vo';
import { BusinessRuleViolationException } from '../../../src/contexts/shared/domain/domain.exception';

describe('ProductVariant Domain Aggregate', () => {
  const defaultParams = {
    tenantId: '00000000-0000-0000-0000-000000000001',
    productId: '00000000-0000-0000-0000-000000000002',
    sku: new SKU('GORRA-NY-NAVY-L'),
    color: 'Navy Blue',
    sizeOrModel: 'Large',
    salePrice: 50.0,
    currentUnitCost: new CostoPromedioPonderado(20.0),
    currentStock: new StockQuantity(10),
  };

  it('should execute registerRestock recalculating CPP and incrementing stock', () => {
    const variant = new ProductVariant(defaultParams);

    // Initial: 10 units at $20 = $200. Restock: 10 units with totalBatchCost of $400.
    // Expected CPP = (200 + 400) / 20 = $30.00
    const result = variant.registerRestock(new StockQuantity(10), 400.0);

    expect(result.previousStock.value).toBe(10);
    expect(result.newStock.value).toBe(20);
    expect(result.previousCost.value).toBe(20.0);
    expect(result.newCost.value).toBe(30.0);
    expect(variant.currentStock.value).toBe(20);
    expect(variant.currentUnitCost.value).toBe(30.0);
  });

  it('should execute deductStock decrementing stock', () => {
    const variant = new ProductVariant(defaultParams);

    const result = variant.deductStock(new StockQuantity(4));

    expect(result.previousStock.value).toBe(10);
    expect(result.newStock.value).toBe(6);
    expect(variant.currentStock.value).toBe(6);
  });

  it('should throw an error when deducting more than current stock', () => {
    const variant = new ProductVariant(defaultParams);

    expect(() => variant.deductStock(new StockQuantity(15))).toThrow();
  });

  it('should register a batch purchase, update stock and CPP, and return KardexMovement', () => {
    const variant = new ProductVariant(defaultParams);

    const { kardexMovement } = variant.registerBatchPurchase({
      quantity: new StockQuantity(10),
      unitCost: new CostoPromedioPonderado(40.0),
      userId: 'user-123',
      notes: 'Lote importado',
      referenceId: 'OC-1001',
    });

    // Stock: 10 + 10 = 20
    expect(variant.currentStock.value).toBe(20);
    // CPP: ((10 * 20) + (10 * 40)) / 20 = (200 + 400) / 20 = 30.00
    expect(variant.currentUnitCost.value).toBe(30.0);

    // Kardex
    expect(kardexMovement.movementType).toBe('COMPRA');
    expect(kardexMovement.quantity.value).toBe(10);
    expect(kardexMovement.previousStock.value).toBe(10);
    expect(kardexMovement.newStock.value).toBe(20);
    expect(kardexMovement.unitCost.value).toBe(40.0);
    expect(kardexMovement.notes).toBe('Lote importado');
    expect(kardexMovement.referenceId).toBe('OC-1001');
  });

  it('should reject batch purchase if variant is inactive', () => {
    const variant = new ProductVariant({
      ...defaultParams,
      isActive: false,
    });

    expect(() =>
      variant.registerBatchPurchase({
        quantity: new StockQuantity(5),
        unitCost: new CostoPromedioPonderado(20.0),
        userId: 'user-123',
      }),
    ).toThrow(BusinessRuleViolationException);
  });
});
