import { CashShift as PrismaCashShift } from '@prisma/client';
import { CashShift } from '../../domain/entities/cash-shift.entity';
import { CashDifference } from '../../domain/value-objects/cash-difference.vo';

export class CashShiftMapper {
  static toDomain(raw: PrismaCashShift): CashShift {
    return new CashShift({
      id: raw.id,
      tenantId: raw.tenantId,
      cashierId: raw.cashierId,
      initialAmount: Number(raw.initialAmount),
      totalCashSales: Number(raw.totalCashSales),
      totalDigitalSales: Number(raw.totalDigitalSales),
      manualIncome: Number(raw.manualIncome),
      manualExpenses: Number(raw.manualExpenses),
      theoreticalAmount:
        raw.theoreticalAmount !== null ? Number(raw.theoreticalAmount) : null,
      declaredPhysicalCash:
        raw.declaredPhysicalCash !== null
          ? Number(raw.declaredPhysicalCash)
          : null,
      difference:
        raw.difference !== null ? new CashDifference(Number(raw.difference)) : null,
      status: raw.status as 'OPEN' | 'CLOSED',
      openedAt: raw.openedAt,
      closedAt: raw.closedAt,
    });
  }
}
