import { Injectable } from '@nestjs/common';
import {
  IProductVariantRepository,
  PurchaseOrderRecordParams,
} from '../../domain/ports/product-variant.repository.port';
import { ProductVariant } from '../../domain/entities/product-variant.aggregate';
import { KardexMovement } from '../../domain/entities/kardex-movement.entity';
import { SKU } from '../../domain/value-objects/sku.vo';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ProductVariantMapper } from '../mappers/product-variant.mapper';

@Injectable()
export class PrismaProductVariantRepository
  implements IProductVariantRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<ProductVariant | null> {
    const record = await this.prisma.productVariant.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!record) {
      return null;
    }

    return ProductVariantMapper.toDomain(record);
  }

  async findBySku(tenantId: string, sku: SKU): Promise<ProductVariant | null> {
    const record = await this.prisma.productVariant.findFirst({
      where: {
        sku: sku.value,
        tenantId,
      },
    });

    if (!record) {
      return null;
    }

    return ProductVariantMapper.toDomain(record);
  }

  async findAll(tenantId: string): Promise<ProductVariant[]> {
    const records = await this.prisma.productVariant.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ProductVariantMapper.toDomain(record));
  }

  async save(variant: ProductVariant): Promise<void> {
    await this.prisma.productVariant.upsert({
      where: { id: variant.id },
      create: {
        id: variant.id,
        tenantId: variant.tenantId,
        productId: variant.productId,
        sku: variant.sku.value,
        barcode: variant.barcode,
        color: variant.color,
        sizeOrModel: variant.sizeOrModel,
        salePrice: variant.salePrice,
        currentUnitCost: variant.currentUnitCost.value,
        currentStock: variant.currentStock.value,
        minStockThreshold: variant.minStockThreshold.value,
        isActive: variant.isActive,
        createdAt: variant.createdAt,
      },
      update: {
        color: variant.color,
        sizeOrModel: variant.sizeOrModel,
        salePrice: variant.salePrice,
        currentUnitCost: variant.currentUnitCost.value,
        currentStock: variant.currentStock.value,
        minStockThreshold: variant.minStockThreshold.value,
        isActive: variant.isActive,
      },
    });
  }

  async saveWithKardex(
    variant: ProductVariant,
    kardex: KardexMovement,
    purchaseOrderParams?: PurchaseOrderRecordParams,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Update ProductVariant current stock and CPP
      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          currentStock: variant.currentStock.value,
          currentUnitCost: variant.currentUnitCost.value,
        },
      });

      // 2. Insert Kardex movement
      await tx.inventoryKardex.create({
        data: {
          id: kardex.id,
          tenantId: kardex.tenantId,
          variantId: kardex.variantId,
          movementType: kardex.movementType,
          quantity: kardex.quantity.value,
          previousStock: kardex.previousStock.value,
          newStock: kardex.newStock.value,
          unitCost: kardex.unitCost.value,
          referenceId: kardex.referenceId,
          userId: kardex.userId,
          notes: kardex.notes,
          createdAt: kardex.createdAt,
        },
      });

      // 3. Create PurchaseOrder if params provided
      if (purchaseOrderParams) {
        const subtotal = kardex.quantity.value * kardex.unitCost.value;
        await tx.purchaseOrder.create({
          data: {
            tenantId: variant.tenantId,
            supplierName: purchaseOrderParams.supplierName ?? 'Proveedor Local',
            totalAmount: subtotal,
            userId: purchaseOrderParams.userId,
            items: {
              create: {
                variantId: variant.id,
                quantity: kardex.quantity.value,
                unitCost: kardex.unitCost.value,
                subtotal: subtotal,
              },
            },
          },
        });
      }
    });
  }
}
