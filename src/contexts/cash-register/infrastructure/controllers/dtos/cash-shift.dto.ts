import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OpenCashShiftDto {
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @IsUUID()
  @IsNotEmpty()
  cashierId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  initialAmount: number;
}

export class CloseCashShiftDto {
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @IsUUID()
  @IsNotEmpty()
  shiftId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  declaredPhysicalCash: number;
}

export class RegisterCashMovementDto {
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @IsUUID()
  @IsNotEmpty()
  shiftId: string;

  @IsIn(['INCOME', 'EXPENSE'])
  type: 'INCOME' | 'EXPENSE';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
