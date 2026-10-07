import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_VARIANT_REPOSITORY_PORT,
} from '../../domain/ports/product-variant.repository.port';
import type { IProductVariantRepository } from '../../domain/ports/product-variant.repository.port';
import {
  KARDEX_REPOSITORY_PORT,
} from '../../domain/ports/kardex.repository.port';
import type { IKardexRepository } from '../../domain/ports/kardex.repository.port';
import { RegisterBatchPurchaseDto } from '../../infrastructure/controllers/dtos/register-batch-purchase.dto';
import { StockQuantity } from '../../domain/value-objects/stock-quantity.vo';
import { CostoPromedioPonderado } from '../../domain/value-objects/costo-promedio-ponderado.vo';
import { KardexMovement } from '../../domain/entities/kardex-movement.entity';
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
} from '../../../shared/domain/domain.exception';

export interface RegisterBatchPurchaseResult {
  variantId: string;
  sku: string;
  previousStock: number;
  addedQuantity: number;
  newStock: number;
  newCostoPromedioPonderado: number;
  kardexMovementId: string;
  movementType: string;
}

@Injectable()
export class RegisterBatchPurchaseUseCase {
  constructor(
    @Inject(PRODUCT_VARIANT_REPOSITORY_PORT)
    private readonly variantRepository: IProductVariantRepository,
    @Inject(KARDEX_REPOSITORY_PORT)
    private readonly kardexRepository: IKardexRepository,
  ) {}

  async execute(dto: RegisterBatchPurchaseDto): Promise<RegisterBatchPurchaseResult> {
    const totalCost =
      dto.totalBatchCost ??
      (dto.unitCost !== undefined ? dto.unitCost * dto.quantity : 0);

    if (totalCost <= 0) {
      throw new BusinessRuleViolationException(
        'A valid totalBatchCost or unitCost must be provided.',
      );
    }

    const variant = await this.variantRepository.findById(
      dto.tenantId,
      dto.variantId,
    );

    if (!variant) {
      throw new EntityNotFoundException('ProductVariant', dto.variantId);
    }

    const batchQuantity = new StockQuantity(dto.quantity);

    // Executes domain business rule RN-01:
    // CPP = ((Stock_Actual * Costo_Actual) + Costo_Total_Lote) / (Stock_Actual + Cantidad_Nueva)
    const { previousStock, newStock, newCost } = variant.registerRestock(
      batchQuantity,
      totalCost,
    );

    // Persist updated variant aggregate
    await this.variantRepository.save(variant);

    // Create Kardex movement of type 'COMPRA'
    const batchUnitCost = new CostoPromedioPonderado(totalCost / dto.quantity);
    const kardexMovement = KardexMovement.createPurchaseMovement({
      tenantId: dto.tenantId,
      variantId: variant.id,
      quantity: batchQuantity,
      previousStock,
      newStock,
      unitCost: batchUnitCost,
      userId: dto.userId,
      referenceId: dto.referenceId,
      notes:
        dto.notes ??
        (dto.supplierName
          ? `Lote de compra a ${dto.supplierName}`
          : 'Ingreso por compra de lote'),
    });

    await this.kardexRepository.save(kardexMovement);

    return {
      variantId: variant.id,
      sku: variant.sku.value,
      previousStock: previousStock.value,
      addedQuantity: batchQuantity.value,
      newStock: newStock.value,
      newCostoPromedioPonderado: newCost.value,
      kardexMovementId: kardexMovement.id,
      movementType: kardexMovement.movementType,
    };
  }
}
