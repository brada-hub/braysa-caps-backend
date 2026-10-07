import { BusinessRuleViolationException } from '../../../shared/domain/domain.exception';
import { randomUUID } from 'crypto';

export type PaymentMethod = 'CASH' | 'QR_TRANSFER' | 'CARD';

export interface SaleItemProps {
  id?: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount?: number;
}

export class SaleItem {
  private readonly _id: string;
  private readonly _variantId: string;
  private readonly _quantity: number;
  private readonly _unitPrice: number;
  private readonly _unitCost: number;
  private readonly _discount: number;
  private readonly _subtotal: number;

  constructor(props: SaleItemProps) {
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new BusinessRuleViolationException(
        'Item quantity must be a positive integer.',
      );
    }
    if (props.unitPrice < 0) {
      throw new BusinessRuleViolationException('Unit price cannot be negative.');
    }
    if (props.unitCost < 0) {
      throw new BusinessRuleViolationException('Unit cost cannot be negative.');
    }

    const discount = props.discount ?? 0.0;
    if (discount < 0) {
      throw new BusinessRuleViolationException('Discount cannot be negative.');
    }

    const rawSubtotal = props.unitPrice * props.quantity - discount;
    const roundedSubtotal = Math.round((rawSubtotal + Number.EPSILON) * 100) / 100;

    if (roundedSubtotal < 0) {
      throw new BusinessRuleViolationException(
        'Item discount cannot exceed item total price.',
      );
    }

    // Regla de Negocio 2 de ARCHITECTURE.md:
    // El precio final de venta jamás puede ser menor al Costo Unitario (CPP).
    const effectiveUnitPrice = roundedSubtotal / props.quantity;
    // Tolerance of 0.005 for rounding differences
    if (effectiveUnitPrice < props.unitCost - 0.005) {
      throw new BusinessRuleViolationException(
        `Discount rejected: effective unit sale price (${effectiveUnitPrice.toFixed(2)}) cannot be lower than unit cost/CPP (${props.unitCost.toFixed(2)}).`,
      );
    }

    this._id = props.id ?? randomUUID();
    this._variantId = props.variantId;
    this._quantity = props.quantity;
    this._unitPrice = Math.round((props.unitPrice + Number.EPSILON) * 100) / 100;
    this._unitCost = Math.round((props.unitCost + Number.EPSILON) * 100) / 100;
    this._discount = Math.round((discount + Number.EPSILON) * 100) / 100;
    this._subtotal = roundedSubtotal;
  }

  get id(): string {
    return this._id;
  }

  get variantId(): string {
    return this._variantId;
  }

  get quantity(): number {
    return this._quantity;
  }

  get unitPrice(): number {
    return this._unitPrice;
  }

  get unitCost(): number {
    return this._unitCost;
  }

  get discount(): number {
    return this._discount;
  }

  get subtotal(): number {
    return this._subtotal;
  }
}

export interface SalePaymentProps {
  id?: string;
  paymentMethod: PaymentMethod;
  amountPaid: number;
}

export class SalePayment {
  private readonly _id: string;
  private readonly _paymentMethod: PaymentMethod;
  private readonly _amountPaid: number;

  constructor(props: SalePaymentProps) {
    if (props.amountPaid <= 0) {
      throw new BusinessRuleViolationException(
        'Payment amount must be greater than zero.',
      );
    }

    this._id = props.id ?? randomUUID();
    this._paymentMethod = props.paymentMethod;
    this._amountPaid = Math.round((props.amountPaid + Number.EPSILON) * 100) / 100;
  }

  get id(): string {
    return this._id;
  }

  get paymentMethod(): PaymentMethod {
    return this._paymentMethod;
  }

  get amountPaid(): number {
    return this._amountPaid;
  }
}

export interface SaleProps {
  id?: string;
  tenantId: string;
  cashShiftId?: string | null;
  userId: string;
  customerName?: string;
  items: SaleItem[];
  payments: SalePayment[];
  createdAt?: Date;
}

export class Sale {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _cashShiftId: string | null;
  private readonly _userId: string;
  private readonly _customerName: string;
  private readonly _items: SaleItem[];
  private readonly _payments: SalePayment[];
  private readonly _totalAmount: number;
  private readonly _discountAmount: number;
  private readonly _createdAt: Date;

  constructor(props: SaleProps) {
    if (!props.items || props.items.length === 0) {
      throw new BusinessRuleViolationException(
        'Sale must contain at least one item.',
      );
    }
    if (!props.payments || props.payments.length === 0) {
      throw new BusinessRuleViolationException(
        'Sale must contain at least one payment method.',
      );
    }

    // Calculate total amount and total discount across items
    let total = 0.0;
    let totalDiscount = 0.0;
    for (const item of props.items) {
      total += item.subtotal;
      totalDiscount += item.discount;
    }
    const cleanTotal = Math.round((total + Number.EPSILON) * 100) / 100;
    const cleanDiscount =
      Math.round((totalDiscount + Number.EPSILON) * 100) / 100;

    // Validate split payments cover the exact total amount
    let paymentsTotal = 0.0;
    for (const payment of props.payments) {
      paymentsTotal += payment.amountPaid;
    }
    const cleanPaymentsTotal =
      Math.round((paymentsTotal + Number.EPSILON) * 100) / 100;

    if (Math.abs(cleanPaymentsTotal - cleanTotal) > 0.01) {
      throw new BusinessRuleViolationException(
        `Total paid amount (${cleanPaymentsTotal.toFixed(2)}) does not match total sale amount (${cleanTotal.toFixed(2)}).`,
      );
    }

    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._cashShiftId = props.cashShiftId ?? null;
    this._userId = props.userId;
    this._customerName = props.customerName ?? 'Cliente Mostrador';
    this._items = props.items;
    this._payments = props.payments;
    this._totalAmount = cleanTotal;
    this._discountAmount = cleanDiscount;
    this._createdAt = props.createdAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get cashShiftId(): string | null {
    return this._cashShiftId;
  }

  get userId(): string {
    return this._userId;
  }

  get customerName(): string {
    return this._customerName;
  }

  get totalAmount(): number {
    return this._totalAmount;
  }

  get discountAmount(): number {
    return this._discountAmount;
  }

  get items(): SaleItem[] {
    return this._items;
  }

  get payments(): SalePayment[] {
    return this._payments;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
