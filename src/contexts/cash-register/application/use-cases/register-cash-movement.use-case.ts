import { Inject, Injectable } from '@nestjs/common';
import {
  CASH_SHIFT_REPOSITORY_PORT,
} from '../../domain/ports/cash-shift.repository.port';
import type { ICashShiftRepository } from '../../domain/ports/cash-shift.repository.port';
import { RegisterCashMovementDto } from '../../infrastructure/controllers/dtos/cash-shift.dto';
import { EntityNotFoundException } from '../../../shared/domain/domain.exception';

export interface RegisterCashMovementResult {
  shiftId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  reason: string;
  manualIncome: number;
  manualExpenses: number;
  theoreticalAmount: number;
}

@Injectable()
export class RegisterCashMovementUseCase {
  constructor(
    @Inject(CASH_SHIFT_REPOSITORY_PORT)
    private readonly cashShiftRepository: ICashShiftRepository,
  ) {}

  async execute(dto: RegisterCashMovementDto): Promise<RegisterCashMovementResult> {
    const shift = await this.cashShiftRepository.findById(
      dto.tenantId,
      dto.shiftId,
    );

    if (!shift) {
      throw new EntityNotFoundException('CashShift', dto.shiftId);
    }

    // Records manual income/expense in the domain aggregate
    shift.recordManualMovement(dto.type, dto.amount);

    await this.cashShiftRepository.save(shift);

    return {
      shiftId: shift.id,
      type: dto.type,
      amount: dto.amount,
      reason: dto.reason,
      manualIncome: shift.manualIncome,
      manualExpenses: shift.manualExpenses,
      theoreticalAmount: shift.calculateTheoreticalAmount(),
    };
  }
}
