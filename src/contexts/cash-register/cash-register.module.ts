import { Module } from '@nestjs/common';
import { CashShiftController } from './infrastructure/controllers/cash-shift.controller';
import { OpenCashShiftUseCase } from './application/use-cases/open-cash-shift.use-case';
import { CloseCashShiftUseCase } from './application/use-cases/close-cash-shift.use-case';
import { RegisterCashMovementUseCase } from './application/use-cases/register-cash-movement.use-case';
import {
  CASH_SHIFT_REPOSITORY_PORT,
} from './domain/ports/cash-shift.repository.port';
import { PrismaCashShiftRepository } from './infrastructure/persistence/prisma-cash-shift.repository';
import { OnSaleCompletedRegisterCashHandler } from './application/handlers/on-sale-completed-register-cash.handler';

@Module({
  controllers: [CashShiftController],
  providers: [
    OpenCashShiftUseCase,
    CloseCashShiftUseCase,
    RegisterCashMovementUseCase,
    OnSaleCompletedRegisterCashHandler,
    {
      provide: CASH_SHIFT_REPOSITORY_PORT,
      useClass: PrismaCashShiftRepository,
    },
  ],
  exports: [
    OpenCashShiftUseCase,
    CloseCashShiftUseCase,
    RegisterCashMovementUseCase,
    CASH_SHIFT_REPOSITORY_PORT,
  ],
})
export class CashRegisterModule {}
