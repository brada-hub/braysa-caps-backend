import { Injectable } from '@nestjs/common';
import { IKardexRepository } from '../../domain/ports/kardex.repository.port';
import { KardexMovement } from '../../domain/entities/kardex-movement.entity';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { StockQuantity } from '../../domain/value-objects/stock-quantity.vo';
import { CostoPromedioPonderado } from '../../domain/value-objects/costo-promedio-ponderado.vo';

@Injectable()
export class PrismaKardexRepository implements IKardexRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(movement: KardexMovement): Promise<void> {
    await this.prisma.inventoryKardex.create({
      data: {
        id: movement.id,
        tenantId: movement.tenantId,
        variantId: movement.variantId,
        movementType: movement.movementType,
        quantity: movement.quantity.value,
        previousStock: movement.previousStock.value,
        newStock: movement.newStock.value,
        unitCost: movement.unitCost.value,
        referenceId: movement.referenceId,
        userId: movement.userId,
        notes: movement.notes,
        createdAt: movement.createdAt,
      },
    });
  }

  async findByVariantId(
    tenantId: string,
    variantId: string,
  ): Promise<KardexMovement[]> {
    const records = await this.prisma.inventoryKardex.findMany({
      where: {
        tenantId,
        variantId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map(
      (r) =>
        new KardexMovement({
          id: r.id,
          tenantId: r.tenantId,
          variantId: r.variantId,
          movementType: r.movementType,
          quantity: new StockQuantity(r.quantity),
          previousStock: new StockQuantity(r.previousStock),
          newStock: new StockQuantity(r.newStock),
          unitCost: new CostoPromedioPonderado(Number(r.unitCost)),
          referenceId: r.referenceId,
          userId: r.userId,
          notes: r.notes,
          createdAt: r.createdAt,
        }),
    );
  }

  async findByTenantId(tenantId: string): Promise<KardexMovement[]> {
    const records = await this.prisma.inventoryKardex.findMany({
      where: {
        tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return records.map(
      (r) =>
        new KardexMovement({
          id: r.id,
          tenantId: r.tenantId,
          variantId: r.variantId,
          movementType: r.movementType,
          quantity: new StockQuantity(r.quantity),
          previousStock: new StockQuantity(r.previousStock),
          newStock: new StockQuantity(r.newStock),
          unitCost: new CostoPromedioPonderado(Number(r.unitCost)),
          referenceId: r.referenceId,
          userId: r.userId,
          notes: r.notes,
          createdAt: r.createdAt,
        }),
    );
  }
}

