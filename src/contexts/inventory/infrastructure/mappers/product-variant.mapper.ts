import { ProductVariant as PrismaProductVariant } from '@prisma/client';
import { ProductVariant } from '../../domain/entities/product-variant.entity';
import { SKU } from '../../domain/value-objects/sku.vo';
import { CostoPromedioPonderado } from '../../domain/value-objects/costo-promedio-ponderado.vo';
import { StockQuantity } from '../../domain/value-objects/stock-quantity.vo';

export class ProductVariantMapper {
  static toDomain(raw: PrismaProductVariant): ProductVariant {
    return new ProductVariant({
      id: raw.id,
      tenantId: raw.tenantId,
      productId: raw.productId,
      sku: new SKU(raw.sku),
      barcode: raw.barcode,
      color: raw.color,
      sizeOrModel: raw.sizeOrModel,
      salePrice: Number(raw.salePrice),
      currentUnitCost: new CostoPromedioPonderado(Number(raw.currentUnitCost)),
      currentStock: new StockQuantity(raw.currentStock),
      minStockThreshold: new StockQuantity(raw.minStockThreshold),
      isActive: raw.isActive,
      createdAt: raw.createdAt,
    });
  }
}
