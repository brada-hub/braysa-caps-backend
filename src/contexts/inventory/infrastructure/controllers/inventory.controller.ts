import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RegisterBatchPurchaseUseCase } from '../../application/use-cases/register-batch-purchase.use-case';
import { RegisterBatchPurchaseDto } from './dtos/register-batch-purchase.dto';
import {
  PRODUCT_VARIANT_REPOSITORY_PORT,
} from '../../domain/ports/product-variant.repository.port';
import type { IProductVariantRepository } from '../../domain/ports/product-variant.repository.port';
import {
  KARDEX_REPOSITORY_PORT,
} from '../../domain/ports/kardex.repository.port';
import type { IKardexRepository } from '../../domain/ports/kardex.repository.port';
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
  InvalidValueObjectException,
} from '../../../shared/domain/domain.exception';

@Controller('api/v1/inventory')
export class InventoryController {
  constructor(
    private readonly registerBatchPurchaseUseCase: RegisterBatchPurchaseUseCase,
    @Inject(PRODUCT_VARIANT_REPOSITORY_PORT)
    private readonly variantRepository: IProductVariantRepository,
    @Inject(KARDEX_REPOSITORY_PORT)
    private readonly kardexRepository: IKardexRepository,
  ) {}

  @Post('purchases')
  @HttpCode(HttpStatus.CREATED)
  async registerBatchPurchase(@Body() dto: RegisterBatchPurchaseDto) {
    try {
      const result = await this.registerBatchPurchaseUseCase.execute(dto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Batch purchase registered successfully.',
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

  @Get('variants')
  @HttpCode(HttpStatus.OK)
  async listVariants(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Query parameter "tenantId" is required.');
    }

    const variants = await this.variantRepository.findAll(tenantId);
    return {
      statusCode: HttpStatus.OK,
      data: variants.map((v) => ({
        id: v.id,
        tenantId: v.tenantId,
        productId: v.productId,
        sku: v.sku.value,
        color: v.color,
        sizeOrModel: v.sizeOrModel,
        salePrice: v.salePrice,
        currentUnitCost: v.currentUnitCost.value,
        currentStock: v.currentStock.value,
        minStockThreshold: v.minStockThreshold.value,
        isLowStock: v.isLowStock(),
        isActive: v.isActive,
      })),
    };
  }

  @Get('kardex')
  @HttpCode(HttpStatus.OK)
  async listKardex(
    @Query('tenantId') tenantId: string,
    @Query('variantId') variantId?: string,
  ) {
    if (!tenantId) {
      throw new BadRequestException('Query parameter "tenantId" is required.');
    }

    const movements = variantId
      ? await this.kardexRepository.findByVariantId(tenantId, variantId)
      : this.kardexRepository.findByTenantId
        ? await this.kardexRepository.findByTenantId(tenantId)
        : await this.kardexRepository.findByVariantId(tenantId, '');

    return {
      statusCode: HttpStatus.OK,
      data: movements.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        variantId: m.variantId,
        movementType: m.movementType,
        quantity: m.quantity.value,
        previousStock: m.previousStock.value,
        newStock: m.newStock.value,
        unitCost: m.unitCost.value,
        referenceId: m.referenceId,
        userId: m.userId,
        notes: m.notes,
        createdAt: m.createdAt,
      })),
    };
  }
}

