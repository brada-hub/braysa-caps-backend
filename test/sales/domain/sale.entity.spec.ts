import {
  Sale,
  SaleItem,
  SalePayment,
} from '../../../src/contexts/sales/domain/entities/sale.entity';
import { BusinessRuleViolationException } from '../../../src/contexts/shared/domain/domain.exception';

describe('Sale Domain Entities', () => {
  const variantId = '00000000-0000-0000-0000-000000000001';
  const tenantId = '00000000-0000-0000-0000-000000000010';
  const userId = '00000000-0000-0000-0000-000000000020';

  describe('SaleItem rebate rule (Regla de Negocio #2)', () => {
    it('should allow discount when effective selling price is greater than or equal to unit cost (CPP)', () => {
      // Unit price: 60, Quantity: 2, Unit Cost (CPP): 30
      // Normal total: 120, Discount: 40 => Subtotal: 80 => Effective unit price: 40 >= 30 (CPP)
      const item = new SaleItem({
        variantId,
        quantity: 2,
        unitPrice: 60.0,
        unitCost: 30.0,
        discount: 40.0,
      });

      expect(item.subtotal).toBe(80.0);
      expect(item.discount).toBe(40.0);
    });

    it('should reject discount when effective unit sale price drops below unit cost (CPP)', () => {
      // Unit price: 50, Quantity: 1, Unit Cost (CPP): 35
      // Discount: 20 => Effective unit price: 30 < 35 (CPP) => Must fail per ARCHITECTURE.md
      expect(
        () =>
          new SaleItem({
            variantId,
            quantity: 1,
            unitPrice: 50.0,
            unitCost: 35.0,
            discount: 20.0,
          }),
      ).toThrow(BusinessRuleViolationException);
    });
  });

  describe('Sale aggregate and split payments', () => {
    it('should successfully create sale with split payment (Cash + QR)', () => {
      const item1 = new SaleItem({
        variantId,
        quantity: 2,
        unitPrice: 50.0,
        unitCost: 25.0,
        discount: 10.0, // Subtotal: 90
      });

      const paymentCash = new SalePayment({
        paymentMethod: 'CASH',
        amountPaid: 50.0,
      });

      const paymentQr = new SalePayment({
        paymentMethod: 'QR_TRANSFER',
        amountPaid: 40.0,
      });

      const sale = new Sale({
        tenantId,
        userId,
        items: [item1],
        payments: [paymentCash, paymentQr],
      });

      expect(sale.totalAmount).toBe(90.0);
      expect(sale.discountAmount).toBe(10.0);
      expect(sale.payments.length).toBe(2);
    });

    it('should throw BusinessRuleViolationException when split payments do not equal total sale amount', () => {
      const item = new SaleItem({
        variantId,
        quantity: 1,
        unitPrice: 100.0,
        unitCost: 50.0,
      });

      const insufficientPayment = new SalePayment({
        paymentMethod: 'CASH',
        amountPaid: 80.0, // Missing 20
      });

      expect(
        () =>
          new Sale({
            tenantId,
            userId,
            items: [item],
            payments: [insufficientPayment],
          }),
      ).toThrow(BusinessRuleViolationException);
    });
  });
});
