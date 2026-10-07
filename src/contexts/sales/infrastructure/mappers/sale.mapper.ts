import {
  Sale as PrismaSale,
  SaleItem as PrismaSaleItem,
  SalePayment as PrismaSalePayment,
} from '@prisma/client';
import {
  Sale,
  SaleItem,
  SalePayment,
  PaymentMethod,
} from '../../domain/entities/sale.entity';

type FullPrismaSale = PrismaSale & {
  items: PrismaSaleItem[];
  payments: PrismaSalePayment[];
};

export class SaleMapper {
  static toDomain(raw: FullPrismaSale): Sale {
    const items = raw.items.map(
      (item) =>
        new SaleItem({
          id: item.id,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          unitCost: Number(item.unitCost),
          discount: Number(item.discount),
        }),
    );

    const payments = raw.payments.map(
      (payment) =>
        new SalePayment({
          id: payment.id,
          paymentMethod: payment.paymentMethod as PaymentMethod,
          amountPaid: Number(payment.amountPaid),
        }),
    );

    return new Sale({
      id: raw.id,
      tenantId: raw.tenantId,
      cashShiftId: raw.cashShiftId,
      userId: raw.userId,
      customerName: raw.customerName ?? undefined,
      items,
      payments,
      createdAt: raw.createdAt,
    });
  }
}
