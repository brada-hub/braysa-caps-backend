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
import { OpenCashShiftUseCase } from '../../application/use-cases/open-cash-shift.use-case';
import { CloseCashShiftUseCase } from '../../application/use-cases/close-cash-shift.use-case';
import { RegisterCashMovementUseCase } from '../../application/use-cases/register-cash-movement.use-case';
import {
  OpenCashShiftDto,
  CloseCashShiftDto,
  RegisterCashMovementDto,
} from './dtos/cash-shift.dto';
import {
  CASH_SHIFT_REPOSITORY_PORT,
} from '../../domain/ports/cash-shift.repository.port';
import type { ICashShiftRepository } from '../../domain/ports/cash-shift.repository.port';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  BusinessRuleViolationException,
  EntityNotFoundException,
  InvalidValueObjectException,
} from '../../../shared/domain/domain.exception';

@Controller('api/v1/cash-shifts')
export class CashShiftController {
  constructor(
    private readonly openCashShiftUseCase: OpenCashShiftUseCase,
    private readonly closeCashShiftUseCase: CloseCashShiftUseCase,
    private readonly registerCashMovementUseCase: RegisterCashMovementUseCase,
    @Inject(CASH_SHIFT_REPOSITORY_PORT)
    private readonly cashShiftRepository: ICashShiftRepository,
    private readonly prisma: PrismaService,
  ) {}

  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  async openShift(@Body() dto: OpenCashShiftDto) {
    try {
      const result = await this.openCashShiftUseCase.execute(dto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Cash shift opened successfully.',
        data: result,
      };
    } catch (error) {
      if (
        error instanceof BusinessRuleViolationException ||
        error instanceof InvalidValueObjectException
      ) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('close')
  @HttpCode(HttpStatus.OK)
  async closeShift(@Body() dto: CloseCashShiftDto) {
    try {
      const result = await this.closeCashShiftUseCase.execute(dto);
      return {
        statusCode: HttpStatus.OK,
        message: 'Cash shift closed and arqueo calculated successfully.',
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

  @Post('movements')
  @HttpCode(HttpStatus.CREATED)
  async registerMovement(@Body() dto: RegisterCashMovementDto) {
    try {
      const result = await this.registerCashMovementUseCase.execute(dto);
      return {
        statusCode: HttpStatus.CREATED,
        message: 'Cash movement registered successfully.',
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

  @Get('active')
  @HttpCode(HttpStatus.OK)
  async getActiveShift(
    @Query('tenantId') tenantId: string,
    @Query('cashierId') cashierId: string,
  ) {
    if (!tenantId || !cashierId) {
      throw new BadRequestException(
        'Both "tenantId" and "cashierId" query parameters are required.',
      );
    }

    const shift = await this.cashShiftRepository.findActiveByCashier(
      tenantId,
      cashierId,
    );

    if (!shift) {
      throw new NotFoundException(
        `No active cash shift found for cashier "${cashierId}".`,
      );
    }

    return {
      statusCode: HttpStatus.OK,
      data: {
        id: shift.id,
        tenantId: shift.tenantId,
        cashierId: shift.cashierId,
        initialAmount: shift.initialAmount,
        totalCashSales: shift.totalCashSales,
        totalDigitalSales: shift.totalDigitalSales,
        manualIncome: shift.manualIncome,
        manualExpenses: shift.manualExpenses,
        theoreticalAmount: shift.calculateTheoreticalAmount(),
        status: shift.status,
        openedAt: shift.openedAt,
      },
    };
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  async getShiftHistory(@Query('tenantId') tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('Query parameter "tenantId" is required.');
    }

    const shifts = await this.prisma.cashShift.findMany({
      where: {
        tenantId,
        status: 'CLOSED',
      },
      include: {
        cashier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { closedAt: 'desc' },
      take: 50,
    });

    return {
      statusCode: HttpStatus.OK,
      data: shifts.map((s) => ({
        id: s.id,
        tenantId: s.tenantId,
        cashierId: s.cashierId,
        cashierName: s.cashier?.name || 'Cajero',
        cashierEmail: s.cashier?.email || '',
        initialAmount: Number(s.initialAmount),
        totalCashSales: Number(s.totalCashSales),
        totalDigitalSales: Number(s.totalDigitalSales),
        manualIncome: Number(s.manualIncome),
        manualExpenses: Number(s.manualExpenses),
        theoreticalAmount: s.theoreticalAmount ? Number(s.theoreticalAmount) : null,
        declaredPhysicalCash: s.declaredPhysicalCash
          ? Number(s.declaredPhysicalCash)
          : null,
        difference: s.difference ? Number(s.difference) : 0,
        arqueoResult: s.arqueoResult || 'CUADRADO',
        status: s.status,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
      })),
    };
  }
}

