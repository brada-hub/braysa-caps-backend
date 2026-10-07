import { Module } from '@nestjs/common';
import { InventoryController } from './infrastructure/controllers/inventory.controller';
import { RegisterBatchPurchaseUseCase } from './application/use-cases/register-batch-purchase.use-case';
import {
  PRODUCT_VARIANT_REPOSITORY_PORT,
} from './domain/ports/product-variant.repository.port';
import { PrismaProductVariantRepository } from './infrastructure/persistence/prisma-product-variant.repository';
import {
  KARDEX_REPOSITORY_PORT,
} from './domain/ports/kardex.repository.port';
import { PrismaKardexRepository } from './infrastructure/persistence/prisma-kardex.repository';
import { OnSaleCompletedDeductStockHandler } from './application/handlers/on-sale-completed-deduct-stock.handler';

@Module({
  controllers: [InventoryController],
  providers: [
    RegisterBatchPurchaseUseCase,
    OnSaleCompletedDeductStockHandler,
    {
      provide: PRODUCT_VARIANT_REPOSITORY_PORT,
      useClass: PrismaProductVariantRepository,
    },
    {
      provide: KARDEX_REPOSITORY_PORT,
      useClass: PrismaKardexRepository,
    },
  ],
  exports: [
    RegisterBatchPurchaseUseCase,
    PRODUCT_VARIANT_REPOSITORY_PORT,
    KARDEX_REPOSITORY_PORT,
  ],
})
export class InventoryModule {}
