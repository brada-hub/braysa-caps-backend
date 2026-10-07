import { CashShift } from '../../../src/contexts/cash-register/domain/entities/cash-shift.entity';
import { BusinessRuleViolationException } from '../../../src/contexts/shared/domain/domain.exception';

describe('CashShift Aggregate Root', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001';
  const cashierId = '00000000-0000-0000-0000-000000000002';

  it('should open a shift in OPEN status with given initial cash base', () => {
    const shift = CashShift.open({
      tenantId,
      cashierId,
      initialAmount: 200.0,
    });

    expect(shift.status).toBe('OPEN');
    expect(shift.initialAmount).toBe(200.0);
    expect(shift.totalCashSales).toBe(0.0);
    expect(shift.totalDigitalSales).toBe(0.0);
    expect(shift.manualIncome).toBe(0.0);
    expect(shift.manualExpenses).toBe(0.0);
    expect(shift.closedAt).toBeNull();
  });

  it('should accurately calculate theoretical amount per ARCHITECTURE.md formula', () => {
    // Base: 200, Cash Sales: 350, Income: 50, Expense: 30
    // Expected: 200 + 350 + 50 - 30 = 570.00
    const shift = CashShift.open({ tenantId, cashierId, initialAmount: 200.0 });
    shift.recordSale(350.0, 150.0); // 150 digital sale doesn't affect physical cash
    shift.recordManualMovement('INCOME', 50.0);
    shift.recordManualMovement('EXPENSE', 30.0);

    expect(shift.calculateTheoreticalAmount()).toBe(570.0);
  });

  it('should perform arqueo and close shift with CUADRADO status', () => {
    const shift = CashShift.open({ tenantId, cashierId, initialAmount: 100.0 });
    shift.recordSale(200.0, 50.0); // Physical cash in drawer should be 300.00

    const diff = shift.close(300.0);

    expect(shift.status).toBe('CLOSED');
    expect(shift.theoreticalAmount).toBe(300.0);
    expect(shift.declaredPhysicalCash).toBe(300.0);
    expect(diff.difference).toBe(0.0);
    expect(diff.status).toBe('CUADRADO');
    expect(shift.closedAt).toBeInstanceOf(Date);
  });

  it('should perform arqueo and report FALTANTE when drawer has less cash', () => {
    const shift = CashShift.open({ tenantId, cashierId, initialAmount: 100.0 });
    shift.recordSale(200.0, 0.0); // Theoretical: 300.00

    const diff = shift.close(270.0); // Declared: 270.00 => Diff: -30.00

    expect(diff.difference).toBe(-30.0);
    expect(diff.status).toBe('FALTANTE');
    expect(shift.status).toBe('CLOSED');
  });

  it('should prevent operations on an already closed shift', () => {
    const shift = CashShift.open({ tenantId, cashierId, initialAmount: 100.0 });
    shift.close(100.0);

    expect(() => shift.close(100.0)).toThrow(BusinessRuleViolationException);
    expect(() => shift.recordSale(50, 0)).toThrow(BusinessRuleViolationException);
    expect(() => shift.recordManualMovement('INCOME', 20)).toThrow(
      BusinessRuleViolationException,
    );
  });
});
