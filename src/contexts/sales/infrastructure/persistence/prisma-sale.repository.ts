import { Injectable } from '@nestjs/common';
import { ISaleRepository } from '../../domain/ports/sale.repository.port';
import { Sale } from '../../domain/entities/sale.entity';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { SaleMapper } from '../mappers/sale.mapper';

@Injectable()
export class PrismaSaleRepository implements ISaleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string, id: string): Promise<Sale | null> {
    const record = await this.prisma.sale.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!record) {
      return null;
    }

    return SaleMapper.toDomain(record);
  }

  async save(sale: Sale): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.sale.create({
        data: {
          id: sale.id,
          tenantId: sale.tenantId,
          cashShiftId: sale.cashShiftId,
          userId: sale.userId,
          customerName: sale.customerName,
          totalAmount: sale.totalAmount,
          discountAmount: sale.discountAmount,
          createdAt: sale.createdAt,
          items: {
            create: sale.items.map((item) => ({
              id: item.id,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.unitCost,
              discount: item.discount,
              subtotal: item.subtotal,
            })),
          },
          payments: {
            create: sale.payments.map((payment) => ({
              id: payment.id,
              paymentMethod: payment.paymentMethod,
              amountPaid: payment.amountPaid,
            })),
          },
        },
      });
    });
  }
}
