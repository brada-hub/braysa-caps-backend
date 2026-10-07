import { ProductVariant } from '../entities/product-variant.aggregate';
import { SKU } from '../value-objects/sku.vo';
import { KardexMovement } from '../entities/kardex-movement.entity';

export const PRODUCT_VARIANT_REPOSITORY = 'PRODUCT_VARIANT_REPOSITORY';
export const PRODUCT_VARIANT_REPOSITORY_PORT = PRODUCT_VARIANT_REPOSITORY;

export interface PurchaseOrderRecordParams {
  supplierName?: string;
  userId: string;
  referenceId?: string;
}

export interface IProductVariantRepository {
  findById(tenantId: string, id: string): Promise<ProductVariant | null>;
  findBySku(tenantId: string, sku: SKU): Promise<ProductVariant | null>;
  findAll(tenantId: string): Promise<ProductVariant[]>;
  save(variant: ProductVariant): Promise<void>;
  saveWithKardex?(
    variant: ProductVariant,
    kardex: KardexMovement,
    purchaseOrderParams?: PurchaseOrderRecordParams,
  ): Promise<void>;
}
