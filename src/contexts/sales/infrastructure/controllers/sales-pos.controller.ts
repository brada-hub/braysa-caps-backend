import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProcessPosSaleUseCase } from '../../application/use-cases/process-pos-sale.use-case';
import { ProcessPosSaleDto } from './dtos/process-pos-sale.dto';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
  InvalidValueObjectException,
} from '../../../shared/domain/domain.exception';

@Controller('api/v1/sales')
export class SalesPosController {
  constructor(
    private readonly processPosSaleUseCase: ProcessPosSaleUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async processSale(@Body() dto: ProcessPosSaleDto) {
    try {
      const result = await this.processPosSaleUseCase.execute(dto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'POS sale processed successfully.',
        data: result,
      };
    } catch (error) {
      if (error instanceof EntityNotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (
        error instanceof BusinessRuleViolationException ||
        error instanceof InvalidValueObjectException
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('pos')
  @HttpCode(HttpStatus.CREATED)
  async processPosSale(@Body() dto: ProcessPosSaleDto) {
    return this.processSale(dto);
  }

  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  async getDailyMetrics(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Query parameter "tenantId" is required.');
    }

    // 1. Fetch sales for the tenant with items and payments
    const sales = await this.prisma.sale.findMany({
      where: { tenantId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalSoldBs = 0;
    let totalCashBs = 0;
    let totalQrBs = 0;
    let totalCapsCount = 0;
    let totalNetProfitBs = 0;

    const variantSalesMap = new Map<
      string,
      {
        variantId: string;
        sku: string;
        name: string;
        model: string;
        color: string;
        unitsSold: number;
        revenue: number;
      }
    >();

    for (const sale of sales) {
      totalSoldBs += Number(sale.totalAmount);

      for (const p of sale.payments) {
        if (p.paymentMethod === 'CASH') {
          totalCashBs += Number(p.amountPaid);
        } else if (p.paymentMethod === 'QR_TRANSFER') {
          totalQrBs += Number(p.amountPaid);
        }
      }

      for (const item of sale.items) {
        const qty = item.quantity;
        const unitPrice = Number(item.unitPrice);
        const discount = Number(item.discount);
        const unitCost = Number(item.unitCost);
        const itemProfit = (unitPrice - discount - unitCost) * qty;

        totalCapsCount += qty;
        totalNetProfitBs += itemProfit;

        const vId = item.variantId;
        const existing = variantSalesMap.get(vId) || {
          variantId: vId,
          sku: item.variant?.sku || 'SKU',
          name: item.variant?.product?.name || 'Gorra',
          model: item.variant?.sizeOrModel || 'Modelo',
          color: item.variant?.color || 'Color',
          unitsSold: 0,
          revenue: 0,
        };

        existing.unitsSold += qty;
        existing.revenue += Number(item.subtotal);
        variantSalesMap.set(vId, existing);
      }
    }

    const topSellingCaps = Array.from(variantSalesMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 5);

    return {
      statusCode: HttpStatus.OK,
      data: {
        totalSales: Number(totalSoldBs.toFixed(2)),
        totalCash: Number(totalCashBs.toFixed(2)),
        totalQr: Number(totalQrBs.toFixed(2)),
        netProfit: Number(totalNetProfitBs.toFixed(2)),
        totalCapsSold: totalCapsCount,
        salesCount: sales.length,
        topSellingCaps,
      },
    };
  }
}

