import { RegisterBatchPurchaseUseCase } from '../../../src/contexts/inventory/application/use-cases/register-batch-purchase.use-case';
import { IProductVariantRepository } from '../../../src/contexts/inventory/domain/ports/product-variant.repository.port';
import { IKardexRepository } from '../../../src/contexts/inventory/domain/ports/kardex.repository.port';
import { ProductVariant } from '../../../src/contexts/inventory/domain/entities/product-variant.aggregate';
import { SKU } from '../../../src/contexts/inventory/domain/value-objects/sku.vo';
import { StockQuantity } from '../../../src/contexts/inventory/domain/value-objects/stock-quantity.vo';
import { CostoPromedioPonderado } from '../../../src/contexts/inventory/domain/value-objects/costo-promedio-ponderado.vo';
import { EntityNotFoundException } from '../../../src/contexts/shared/domain/domain.exception';

describe('RegisterBatchPurchaseUseCase', () => {
  let useCase: RegisterBatchPurchaseUseCase;
  let mockVariantRepository: jest.Mocked<IProductVariantRepository>;
  let mockKardexRepository: jest.Mocked<IKardexRepository>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const variantId = '00000000-0000-0000-0000-000000000002';

  beforeEach(() => {
    mockVariantRepository = {
      findById: jest.fn(),
      findBySku: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockKardexRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findByVariantId: jest.fn(),
    };
    useCase = new RegisterBatchPurchaseUseCase(
      mockVariantRepository,
      mockKardexRepository,
    );
  });

  it('should successfully execute batch purchase with totalBatchCost and recalculate CPP per RN-01', async () => {
    // Current: 20 units at $25 = $500 total value
    const existingVariant = new ProductVariant({
      id: variantId,
      tenantId,
      productId: 'prod-1',
      sku: new SKU('GORRA-BULLS-RED'),
      color: 'Rojo',
      sizeOrModel: 'Ajustable',
      salePrice: 65.0,
      currentUnitCost: new CostoPromedioPonderado(25.0),
      currentStock: new StockQuantity(20),
    });

    mockVariantRepository.findById.mockResolvedValue(existingVariant);

    // New batch: 10 units with total batch cost of $400 ($40/unit)
    // Expected new CPP = (500 + 400) / (20 + 10) = 900 / 30 = 30.00
    const result = await useCase.execute({
      tenantId,
      variantId,
      quantity: 10,
      totalBatchCost: 400.0,
      userId: '00000000-0000-0000-0000-000000000099',
      supplierName: 'Distribuidora Gorras Inc',
      referenceId: 'FAC-889',
      notes: 'Compra de reposición',
    });

    expect(result.variantId).toBe(variantId);
    expect(result.sku).toBe('GORRA-BULLS-RED');
    expect(result.previousStock).toBe(20);
    expect(result.addedQuantity).toBe(10);
    expect(result.newStock).toBe(30);
    expect(result.newCostoPromedioPonderado).toBe(30.0);
    expect(result.movementType).toBe('COMPRA');
    expect(mockVariantRepository.save).toHaveBeenCalledTimes(1);
    expect(mockKardexRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw EntityNotFoundException if variant is not found', async () => {
    mockVariantRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId,
        variantId,
        quantity: 10,
        totalBatchCost: 200.0,
        userId: '00000000-0000-0000-0000-000000000099',
      }),
    ).rejects.toThrow(EntityNotFoundException);
  });
});
