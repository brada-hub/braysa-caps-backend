import { Injectable } from '@nestjs/common';
import { ICashShiftRepository } from '../../domain/ports/cash-shift.repository.port';
import { CashShift } from '../../domain/aggregates/cash-shift.aggregate';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { CashShiftMapper } from '../mappers/cash-shift.mapper';

@Injectable()
export class PrismaCashShiftRepository implements ICashShiftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<CashShift | null> {
    const record = await this.prisma.cashShift.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!record) {
      return null;
    }

    return CashShiftMapper.toDomain(record);
  }

  async findActiveByCashier(
    tenantId: string,
    cashierId: string,
  ): Promise<CashShift | null> {
    const record = await this.prisma.cashShift.findFirst({
      where: {
        tenantId,
        cashierId,
        status: 'OPEN',
      },
    });

    if (!record) {
      return null;
    }

    return CashShiftMapper.toDomain(record);
  }

  async save(shift: CashShift): Promise<void> {
    await this.prisma.cashShift.upsert({
      where: { id: shift.id },
      create: {
        id: shift.id,
        tenantId: shift.tenantId,
        cashierId: shift.cashierId,
        initialAmount: shift.initialAmount,
        totalCashSales: shift.totalCashSales,
        totalDigitalSales: shift.totalDigitalSales,
        manualIncome: shift.manualIncome,
        manualExpenses: shift.manualExpenses,
        theoreticalAmount: shift.theoreticalAmount,
        declaredPhysicalCash: shift.declaredPhysicalCash,
        difference: shift.difference ? shift.difference.difference : null,
        arqueoResult: shift.difference ? shift.difference.status : null,
        status: shift.status,
        openedAt: shift.openedAt,
        closedAt: shift.closedAt,
      },
      update: {
        totalCashSales: shift.totalCashSales,
        totalDigitalSales: shift.totalDigitalSales,
        manualIncome: shift.manualIncome,
        manualExpenses: shift.manualExpenses,
        theoreticalAmount: shift.theoreticalAmount,
        declaredPhysicalCash: shift.declaredPhysicalCash,
        difference: shift.difference ? shift.difference.difference : null,
        arqueoResult: shift.difference ? shift.difference.status : null,
        status: shift.status,
        closedAt: shift.closedAt,
      },
    });
  }
}
