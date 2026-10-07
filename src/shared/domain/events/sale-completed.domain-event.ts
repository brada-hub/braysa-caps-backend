export interface SaleCompletedItem {
  variantId: string;
  quantity: number;
  unitPrice?: number;
  unitCost?: number;
  discount?: number;
  subtotal?: number;
}

export interface SaleCompletedPayment {
  method: string;
  amount: number;
  // Aliases for compatibility
  paymentMethod?: string;
  amountPaid?: number;
}

export class SaleCompletedDomainEvent {
  static readonly EVENT_NAME = 'sale.completed';

  readonly eventName = SaleCompletedDomainEvent.EVENT_NAME;
  readonly occurredOn: Date;

  constructor(
    public readonly saleId: string,
    public readonly tenantId: string,
    public readonly cashShiftId: string | null,
    public readonly userId: string,
    public readonly totalAmount: number,
    public readonly discountAmount: number,
    public readonly items: SaleCompletedItem[],
    public readonly payments: SaleCompletedPayment[],
  ) {
    this.occurredOn = new Date();
  }
}
