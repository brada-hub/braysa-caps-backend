import { ProcessPosSaleUseCase } from '../../../src/contexts/sales/application/use-cases/process-pos-sale.use-case';
import { ISaleRepository } from '../../../src/contexts/sales/domain/ports/sale.repository.port';
import { PrismaService } from '../../../src/contexts/shared/infrastructure/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentMethodDtoEnum } from '../../../src/contexts/sales/infrastructure/controllers/dtos/process-pos-sale.dto';
import { SaleCompletedDomainEvent } from '../../../src/shared/domain/events/sale-completed.domain-event';
import { BusinessRuleViolationException } from '../../../src/contexts/shared/domain/domain.exception';

describe('ProcessPosSaleUseCase', () => {
  let useCase: ProcessPosSaleUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockPrisma: any;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const variantId = '00000000-0000-0000-0000-000000000010';
  const userId = '00000000-0000-0000-0000-000000000020';
  const cashShiftId = '00000000-0000-0000-0000-000000000030';

  beforeEach(() => {
    mockSaleRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
    };
    mockPrisma = {
      productVariant: {
        findMany: jest.fn(),
      },
      cashShift: {
        findFirst: jest.fn(),
      },
    };
    mockEventEmitter = {
      emitAsync: jest.fn().mockResolvedValue([]),
    } as any;

    useCase = new ProcessPosSaleUseCase(
      mockSaleRepository,
      mockPrisma as unknown as PrismaService,
      mockEventEmitter,
    );
  });

  it('should process POS sale with split payment (Cash + QR) and emit SaleCompletedDomainEvent', async () => {
    mockPrisma.cashShift.findFirst.mockResolvedValue({
      id: cashShiftId,
      tenantId,
      status: 'OPEN',
    });

    mockPrisma.productVariant.findMany.mockResolvedValue([
      {
        id: variantId,
        tenantId,
        sku: 'GORRA-BULLS-RED',
        salePrice: 100.0,
        currentUnitCost: 40.0,
        currentStock: 15,
        isActive: true,
      },
    ]);

    const result = await useCase.execute({
      tenantId,
      cashShiftId,
      userId,
      customerName: 'Juan Pérez',
      items: [
        {
          variantId,
          quantity: 2,
          discount: 20.0, // Subtotal = (100 * 2) - 20 = 180.00
        },
      ],
      payments: [
        {
          paymentMethod: PaymentMethodDtoEnum.CASH,
          amountPaid: 100.0,
        },
        {
          paymentMethod: PaymentMethodDtoEnum.QR_TRANSFER,
          amountPaid: 80.0,
        },
      ],
    });

    expect(result.totalAmount).toBe(180.0);
    expect(result.discountAmount).toBe(20.0);
    expect(result.customerName).toBe('Juan Pérez');
    expect(mockSaleRepository.save).toHaveBeenCalledTimes(1);

    // Verify domain event emitted per ARCHITECTURE.md Rule #4
    expect(mockEventEmitter.emitAsync).toHaveBeenCalledWith(
      SaleCompletedDomainEvent.EVENT_NAME,
      expect.objectContaining({
        saleId: result.saleId,
        totalAmount: 180.0,
        discountAmount: 20.0,
      }),
    );
  });

  it('should reject sale if requested cashShiftId is not open', async () => {
    mockPrisma.cashShift.findFirst.mockResolvedValue(null);

    await expect(
      useCase.execute({
        tenantId,
        cashShiftId,
        userId,
        items: [{ variantId, quantity: 1 }],
        payments: [{ paymentMethod: PaymentMethodDtoEnum.CASH, amountPaid: 100 }],
      }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });

  it('should reject sale if requested quantity exceeds current stock', async () => {
    mockPrisma.productVariant.findMany.mockResolvedValue([
      {
        id: variantId,
        tenantId,
        sku: 'GORRA-BULLS-RED',
        salePrice: 100.0,
        currentUnitCost: 40.0,
        currentStock: 3, // Only 3 in stock
        isActive: true,
      },
    ]);

    await expect(
      useCase.execute({
        tenantId,
        userId,
        items: [
          {
            variantId,
            quantity: 5, // Requesting 5
          },
        ],
        payments: [
          {
            paymentMethod: PaymentMethodDtoEnum.CASH,
            amountPaid: 500.0,
          },
        ],
      }),
    ).rejects.toThrow(BusinessRuleViolationException);
  });
});
