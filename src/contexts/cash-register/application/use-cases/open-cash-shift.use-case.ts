import { Inject, Injectable } from '@nestjs/common';
import {
  CASH_SHIFT_REPOSITORY,
} from '../../domain/repositories/cash-shift.repository.interface';
import type { ICashShiftRepository } from '../../domain/repositories/cash-shift.repository.interface';
import { OpenCashShiftDto } from '../dtos/open-cash-shift.dto';
import { CashShift } from '../../domain/entities/cash-shift.entity';
import { BusinessRuleViolationException } from '../../../shared/domain/domain.exception';

export interface OpenCashShiftResult {
  id: string;
  tenantId: string;
  cashierId: string;
  initialAmount: number;
  status: string;
  openedAt: Date;
}

@Injectable()
export class OpenCashShiftUseCase {
  constructor(
    @Inject(CASH_SHIFT_REPOSITORY)
    private readonly cashShiftRepository: ICashShiftRepository,
  ) {}

  async execute(dto: OpenCashShiftDto): Promise<OpenCashShiftResult> {
    const existingActiveShift =
      await this.cashShiftRepository.findActiveByCashier(
        dto.tenantId,
        dto.cashierId,
      );

    if (existingActiveShift) {
      throw new BusinessRuleViolationException(
        `Cashier "${dto.cashierId}" already has an active open shift (ID: "${existingActiveShift.id}").`,
      );
    }

    const shift = CashShift.open({
      tenantId: dto.tenantId,
      cashierId: dto.cashierId,
      initialAmount: dto.initialAmount,
    });

    await this.cashShiftRepository.save(shift);

    return {
      id: shift.id,
      tenantId: shift.tenantId,
      cashierId: shift.cashierId,
      initialAmount: shift.initialAmount,
      status: shift.status,
      openedAt: shift.openedAt,
    };
  }
}
