import { CashDifference } from '../../../src/contexts/cash-register/domain/value-objects/cash-difference.vo';

describe('CashDifference Value Object', () => {
  it('should categorize status as CUADRADO when difference is 0', () => {
    // Declared: 500, Theoretical: 500 => Diff: 0
    const diff = CashDifference.calculate(500, 500);

    expect(diff.difference).toBe(0);
    expect(diff.status).toBe('CUADRADO');
    expect(diff.isBalanced()).toBe(true);
    expect(diff.isSurplus()).toBe(false);
    expect(diff.isShortage()).toBe(false);
    expect(diff.toString()).toBe('CUADRADO (+0.00)');
  });

  it('should categorize status as SOBRANTE when declared cash exceeds theoretical cash', () => {
    // Declared: 550, Theoretical: 500 => Diff: +50
    const diff = CashDifference.calculate(550, 500);

    expect(diff.difference).toBe(50.0);
    expect(diff.status).toBe('SOBRANTE');
    expect(diff.isSurplus()).toBe(true);
    expect(diff.isBalanced()).toBe(false);
    expect(diff.toString()).toBe('SOBRANTE (+50.00)');
  });

  it('should categorize status as FALTANTE when declared cash is less than theoretical cash', () => {
    // Declared: 480, Theoretical: 500 => Diff: -20
    const diff = CashDifference.calculate(480, 500);

    expect(diff.difference).toBe(-20.0);
    expect(diff.status).toBe('FALTANTE');
    expect(diff.isShortage()).toBe(true);
    expect(diff.isBalanced()).toBe(false);
    expect(diff.toString()).toBe('FALTANTE (-20.00)');
  });
});
