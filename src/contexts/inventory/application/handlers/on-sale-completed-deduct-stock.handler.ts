import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SaleCompletedDomainEvent } from '../../../../shared/domain/events/sale-completed.domain-event';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class OnSaleCompletedDeductStockHandler {
  private readonly logger = new Logger(OnSaleCompletedDeductStockHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(SaleCompletedDomainEvent.EVENT_NAME)
  async handle(event: SaleCompletedDomainEvent): Promise<void> {
    this.logger.log(
      `Handling ${event.eventName}: Deducting stock and recording Kardex for sale ${event.saleId}`,
    );

    await this.prisma.$transaction(async (tx) => {
      for (const item of event.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });

        if (!variant) {
          this.logger.error(
            `ProductVariant ${item.variantId} not found when processing sale ${event.saleId}`,
          );
          continue;
        }

        const previousStock = variant.currentStock;
        const newStock = previousStock - item.quantity;

        // 1. Descontar unidades de la variante
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: {
            currentStock: newStock,
          },
        });

        // 2. Generar salida en Kardex tipo 'VENTA_POS'
        await tx.inventoryKardex.create({
          data: {
            tenantId: event.tenantId,
            variantId: item.variantId,
            movementType: 'VENTA_POS',
            quantity: item.quantity,
            previousStock,
            newStock,
            unitCost: item.unitCost ?? Number(variant.currentUnitCost),
            referenceId: event.saleId,
            userId: event.userId,
            notes: `Salida por venta POS - Venta #${event.saleId.slice(0, 8)}`,
          },
        });
      }
    });
  }
}
