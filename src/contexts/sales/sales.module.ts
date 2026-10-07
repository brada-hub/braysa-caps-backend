import { Module } from '@nestjs/common';
import { SalesPosController } from './infrastructure/controllers/sales-pos.controller';
import { ProcessPosSaleUseCase } from './application/use-cases/process-pos-sale.use-case';
import { SALE_REPOSITORY_PORT } from './domain/ports/sale.repository.port';
import { PrismaSaleRepository } from './infrastructure/persistence/prisma-sale.repository';
import { InventoryModule } from '../inventory/inventory.module';
import { CashRegisterModule } from '../cash-register/cash-register.module';

@Module({
  imports: [InventoryModule, CashRegisterModule],
  controllers: [SalesPosController],
  providers: [
    ProcessPosSaleUseCase,
    {
      provide: SALE_REPOSITORY_PORT,
      useClass: PrismaSaleRepository,
    },
  ],
  exports: [ProcessPosSaleUseCase, SALE_REPOSITORY_PORT],
})
export class SalesModule {}
