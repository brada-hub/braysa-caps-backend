import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  SALE_REPOSITORY_PORT,
} from '../../domain/ports/sale.repository.port';
import type { ISaleRepository } from '../../domain/ports/sale.repository.port';
import { ProcessPosSaleDto } from '../../infrastructure/controllers/dtos/process-pos-sale.dto';
import {
  Sale,
  SaleItem,
  SalePayment,
  PaymentMethod,
} from '../../domain/entities/sale.entity';
import { SaleCompletedDomainEvent } from '../../../../shared/domain/events/sale-completed.domain-event';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
} from '../../../shared/domain/domain.exception';

export interface ProcessPosSaleResult {
  saleId: string;
  tenantId: string;
  customerName: string;
  totalAmount: number;
  discountAmount: number;
  itemsCount: number;
  payments: {
    paymentMethod: string;
    amountPaid: number;
  }[];
  createdAt: Date;
}

@Injectable()
export class ProcessPosSaleUseCase {
  constructor(
    @Inject(SALE_REPOSITORY_PORT)
    private readonly saleRepository: ISaleRepository,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: ProcessPosSaleDto): Promise<ProcessPosSaleResult> {
    // 1. Validar turno de caja activo si se proporciona cashShiftId
    if (dto.cashShiftId) {
      const activeShift = await this.prisma.cashShift.findFirst({
        where: {
          id: dto.cashShiftId,
          tenantId: dto.tenantId,
          status: 'OPEN',
        },
      });

      if (!activeShift) {
        throw new BusinessRuleViolationException(
          `Cash shift "${dto.cashShiftId}" is not open or does not exist for this tenant.`,
        );
      }
    }

    // 2. Recuperar variantes para precios base, stock y costo unitario (CPP)
    const variantIds = dto.items.map((i) => i.variantId);
    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        tenantId: dto.tenantId,
      },
    });

    const variantMap = new Map(variants.map((v) => [v.id, v]));

    // 3. Validar disponibilidad y regla RN-03 en cada ítem
    const domainItems: SaleItem[] = [];
    for (const itemDto of dto.items) {
      const variant = variantMap.get(itemDto.variantId);
      if (!variant) {
        throw new EntityNotFoundException('ProductVariant', itemDto.variantId);
      }
      if (!variant.isActive) {
        throw new BusinessRuleViolationException(
          `Product variant "${variant.sku}" is inactive.`,
        );
      }
      if (variant.currentStock < itemDto.quantity) {
        throw new BusinessRuleViolationException(
          `Insufficient stock for "${variant.sku}". Available: ${variant.currentStock}, Requested: ${itemDto.quantity}.`,
        );
      }

      // SaleItem valida RN-03: (unitPrice - discount) >= unitCost
      const domainItem = new SaleItem({
        variantId: variant.id,
        quantity: itemDto.quantity,
        unitPrice: Number(variant.salePrice),
        unitCost: Number(variant.currentUnitCost),
        discount: itemDto.discount ?? 0.0,
      });

      domainItems.push(domainItem);
    }

    // 4. Validar pagos mixtos (RN-04)
    const domainPayments: SalePayment[] = dto.payments.map(
      (p) =>
        new SalePayment({
          paymentMethod: p.paymentMethod as PaymentMethod,
          amountPaid: p.amountPaid,
        }),
    );

    // 5. Crear Agregado Sale (valida que suma(pagos) == total neto)
    const sale = new Sale({
      tenantId: dto.tenantId,
      cashShiftId: dto.cashShiftId,
      userId: dto.userId,
      customerName: dto.customerName,
      items: domainItems,
      payments: domainPayments,
    });

    // 6. Persistir la venta en el repositorio del módulo de ventas
    await this.saleRepository.save(sale);

    // 7. Desacoplamiento por eventos: emitir SaleCompletedDomainEvent
    const domainEvent = new SaleCompletedDomainEvent(
      sale.id,
      sale.tenantId,
      sale.cashShiftId,
      sale.userId,
      sale.totalAmount,
      sale.discountAmount,
      sale.items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        unitCost: i.unitCost,
        discount: i.discount,
        subtotal: i.subtotal,
      })),
      sale.payments.map((p) => ({
        method: p.paymentMethod,
        amount: p.amountPaid,
        paymentMethod: p.paymentMethod,
        amountPaid: p.amountPaid,
      })),
    );

    await this.eventEmitter.emitAsync(
      SaleCompletedDomainEvent.EVENT_NAME,
      domainEvent,
    );

    return {
      saleId: sale.id,
      tenantId: sale.tenantId,
      customerName: sale.customerName,
      totalAmount: sale.totalAmount,
      discountAmount: sale.discountAmount,
      itemsCount: sale.items.length,
      payments: sale.payments.map((p) => ({
        paymentMethod: p.paymentMethod,
        amountPaid: p.amountPaid,
      })),
      createdAt: sale.createdAt,
    };
  }
}
