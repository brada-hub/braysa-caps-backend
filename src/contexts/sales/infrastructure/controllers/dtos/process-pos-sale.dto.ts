import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentMethodDtoEnum {
  CASH = 'CASH',
  QR_TRANSFER = 'QR_TRANSFER',
  CARD = 'CARD',
}

export class SaleItemInputDto {
  @IsUUID()
  @IsNotEmpty()
  variantId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;
}

export class SalePaymentInputDto {
  @IsEnum(PaymentMethodDtoEnum)
  paymentMethod: PaymentMethodDtoEnum;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amountPaid: number;
}

export class ProcessPosSaleDto {
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @IsOptional()
  @IsUUID()
  cashShiftId?: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items: SaleItemInputDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalePaymentInputDto)
  payments: SalePaymentInputDto[];
}
