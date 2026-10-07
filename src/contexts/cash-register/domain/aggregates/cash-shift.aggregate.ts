import { BusinessRuleViolationException } from '../../../shared/domain/domain.exception';
import { CashDifference } from '../value-objects/cash-difference.vo';
import { randomUUID } from 'crypto';

export type ShiftStatus = 'OPEN' | 'CLOSED';

export interface CashShiftProps {
  id?: string;
  tenantId: string;
  cashierId: string;
  initialAmount: number;
  totalCashSales?: number;
  totalDigitalSales?: number;
  manualIncome?: number;
  manualExpenses?: number;
  theoreticalAmount?: number | null;
  declaredPhysicalCash?: number | null;
  difference?: CashDifference | null;
  status?: ShiftStatus;
  openedAt?: Date;
  closedAt?: Date | null;
}

export class CashShift {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _cashierId: string;
  private readonly _initialAmount: number;
  private _totalCashSales: number;
  private _totalDigitalSales: number;
  private _manualIncome: number;
  private _manualExpenses: number;
  private _theoreticalAmount: number | null;
  private _declaredPhysicalCash: number | null;
  private _difference: CashDifference | null;
  private _status: ShiftStatus;
  private readonly _openedAt: Date;
  private _closedAt: Date | null;

  constructor(props: CashShiftProps) {
    if (props.initialAmount < 0) {
      throw new BusinessRuleViolationException(
        'Initial cash amount cannot be negative.',
      );
    }

    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._cashierId = props.cashierId;
    this._initialAmount = Math.round((props.initialAmount + Number.EPSILON) * 100) / 100;
    this._totalCashSales = props.totalCashSales ?? 0.0;
    this._totalDigitalSales = props.totalDigitalSales ?? 0.0;
    this._manualIncome = props.manualIncome ?? 0.0;
    this._manualExpenses = props.manualExpenses ?? 0.0;
    this._theoreticalAmount = props.theoreticalAmount ?? null;
    this._declaredPhysicalCash = props.declaredPhysicalCash ?? null;
    this._difference = props.difference ?? null;
    this._status = props.status ?? 'OPEN';
    this._openedAt = props.openedAt ?? new Date();
    this._closedAt = props.closedAt ?? null;
  }

  /**
   * Factory method to open a new CashShift with a base cash amount.
   */
  static open(params: {
    tenantId: string;
    cashierId: string;
    initialAmount: number;
  }): CashShift {
    return new CashShift({
      tenantId: params.tenantId,
      cashierId: params.cashierId,
      initialAmount: params.initialAmount,
      totalCashSales: 0.0,
      totalDigitalSales: 0.0,
      manualIncome: 0.0,
      manualExpenses: 0.0,
      status: 'OPEN',
    });
  }

  /**
   * Calculates theoretical cash per RN-06:
   * Efectivo_Teorico = Monto_Base_Inicial + Ventas_Efectivo + Ingresos_Manuales - Egresos_Manuales
   */
  calculateTheoreticalAmount(): number {
    const rawTheoretical =
      this._initialAmount +
      this._totalCashSales +
      this._manualIncome -
      this._manualExpenses;
    return Math.round((rawTheoretical + Number.EPSILON) * 100) / 100;
  }

  /**
   * Closes the cash shift and performs the arqueo reconciliation per RN-06:
   * Diferencia = Efectivo_Fisico_Declarado - Efectivo_Teorico
   * Estados: CUADRADO (0), SOBRANTE (> 0), FALTANTE (< 0)
   */
  closeShift(physicalCashCounted: number): CashDifference {
    if (this._status === 'CLOSED') {
      throw new BusinessRuleViolationException(
        `Cash shift "${this._id}" is already closed.`,
      );
    }

    if (physicalCashCounted < 0) {
      throw new BusinessRuleViolationException(
        'Declared physical cash cannot be negative.',
      );
    }

    const cleanDeclared =
      Math.round((physicalCashCounted + Number.EPSILON) * 100) / 100;
    const theoretical = this.calculateTheoreticalAmount();
    const difference = CashDifference.calculate(cleanDeclared, theoretical);

    this._declaredPhysicalCash = cleanDeclared;
    this._theoreticalAmount = theoretical;
    this._difference = difference;
    this._status = 'CLOSED';
    this._closedAt = new Date();

    return difference;
  }

  /**
   * Alias for closeShift.
   */
  close(physicalCashCounted: number): CashDifference {
    return this.closeShift(physicalCashCounted);
  }

  /**
   * Records sale payments separated into cash and digital payments (QR, cards, transfers).
   */
  recordSale(cashAmount: number, digitalAmount: number): void {
    if (this._status === 'CLOSED') {
      throw new BusinessRuleViolationException(
        'Cannot record sales on a closed cash shift.',
      );
    }

    if (cashAmount > 0) {
      this._totalCashSales =
        Math.round((this._totalCashSales + cashAmount + Number.EPSILON) * 100) /
        100;
    }
    if (digitalAmount > 0) {
      this._totalDigitalSales =
        Math.round(
          (this._totalDigitalSales + digitalAmount + Number.EPSILON) * 100,
        ) / 100;
    }
  }

  /**
   * Registers a manual minor expense (egreso menor).
   */
  registerExpense(amount: number): void {
    this.recordManualMovement('EXPENSE', amount);
  }

  /**
   * Registers a manual income (ingreso manual).
   */
  registerIncome(amount: number): void {
    this.recordManualMovement('INCOME', amount);
  }

  /**
   * Records a manual movement (income or expense).
   */
  recordManualMovement(type: 'INCOME' | 'EXPENSE', amount: number): void {
    if (this._status === 'CLOSED') {
      throw new BusinessRuleViolationException(
        'Cannot record manual cash movements on a closed cash shift.',
      );
    }

    if (amount <= 0) {
      throw new BusinessRuleViolationException(
        'Movement amount must be greater than zero.',
      );
    }

    const cleanAmount = Math.round((amount + Number.EPSILON) * 100) / 100;

    if (type === 'INCOME') {
      this._manualIncome =
        Math.round((this._manualIncome + cleanAmount + Number.EPSILON) * 100) /
        100;
    } else {
      this._manualExpenses =
        Math.round((this._manualExpenses + cleanAmount + Number.EPSILON) * 100) /
        100;
    }
  }

  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get cashierId(): string {
    return this._cashierId;
  }

  get initialAmount(): number {
    return this._initialAmount;
  }

  get totalCashSales(): number {
    return this._totalCashSales;
  }

  get totalDigitalSales(): number {
    return this._totalDigitalSales;
  }

  get manualIncome(): number {
    return this._manualIncome;
  }

  get manualExpenses(): number {
    return this._manualExpenses;
  }

  get theoreticalAmount(): number | null {
    return this._theoreticalAmount;
  }

  get declaredPhysicalCash(): number | null {
    return this._declaredPhysicalCash;
  }

  get difference(): CashDifference | null {
    return this._difference;
  }

  get status(): ShiftStatus {
    return this._status;
  }

  get openedAt(): Date {
    return this._openedAt;
  }

  get closedAt(): Date | null {
    return this._closedAt;
  }
}
