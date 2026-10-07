import { Inject, Injectable } from '@nestjs/common';
import {
  CASH_SHIFT_REPOSITORY,
} from '../../domain/repositories/cash-shift.repository.interface';
import type { ICashShiftRepository } from '../../domain/repositories/cash-shift.repository.interface';
import { CloseCashShiftDto } from '../dtos/close-cash-shift.dto';
import {
  EntityNotFoundException,
} from '../../../shared/domain/domain.exception';
import { ArqueoResult } from '../../domain/value-objects/cash-difference.vo';

export interface CloseCashShiftResult {
  id: string;
  tenantId: string;
  cashierId: string;
  status: string;
  initialAmount: number;
  totalCashSales: number;
  totalDigitalSales: number;
  manualIncome: number;
  manualExpenses: number;
  theoreticalAmount: number;
  declaredPhysicalCash: number;
  difference: number;
  arqueoResult: ArqueoResult;
  openedAt: Date;
  closedAt: Date;
}

@Injectable()
export class CloseCashShiftUseCase {
  constructor(
    @Inject(CASH_SHIFT_REPOSITORY)
    private readonly cashShiftRepository: ICashShiftRepository,
  ) {}

  async execute(dto: CloseCashShiftDto): Promise<CloseCashShiftResult> {
    const shift = await this.cashShiftRepository.findById(
      dto.tenantId,
      dto.shiftId,
    );

    if (!shift) {
      throw new EntityNotFoundException('CashShift', dto.shiftId);
    }

    // Domain entity performs calculation and transitions to CLOSED
    const differenceVO = shift.close(dto.declaredPhysicalCash);

    await this.cashShiftRepository.save(shift);

    return {
      id: shift.id,
      tenantId: shift.tenantId,
      cashierId: shift.cashierId,
      status: shift.status,
      initialAmount: shift.initialAmount,
      totalCashSales: shift.totalCashSales,
      totalDigitalSales: shift.totalDigitalSales,
      manualIncome: shift.manualIncome,
      manualExpenses: shift.manualExpenses,
      theoreticalAmount: shift.theoreticalAmount!,
      declaredPhysicalCash: shift.declaredPhysicalCash!,
      difference: differenceVO.difference,
      arqueoResult: differenceVO.status,
      openedAt: shift.openedAt,
      closedAt: shift.closedAt!,
    };
  }
}
