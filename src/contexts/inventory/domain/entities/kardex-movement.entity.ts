import { CostoPromedioPonderado } from '../value-objects/costo-promedio-ponderado.vo';
import { StockQuantity } from '../value-objects/stock-quantity.vo';
import { randomUUID } from 'crypto';

export type KardexMovementType =
  | 'COMPRA'
  | 'VENTA_POS'
  | 'VENTA_WEB'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO';

export interface KardexMovementProps {
  id?: string;
  tenantId: string;
  variantId: string;
  movementType: KardexMovementType;
  quantity: StockQuantity;
  previousStock: StockQuantity;
  newStock: StockQuantity;
  unitCost: CostoPromedioPonderado;
  referenceId?: string | null;
  userId: string;
  notes?: string | null;
  createdAt?: Date;
}

export class KardexMovement {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _variantId: string;
  private readonly _movementType: KardexMovementType;
  private readonly _quantity: StockQuantity;
  private readonly _previousStock: StockQuantity;
  private readonly _newStock: StockQuantity;
  private readonly _unitCost: CostoPromedioPonderado;
  private readonly _referenceId: string | null;
  private readonly _userId: string;
  private readonly _notes: string | null;
  private readonly _createdAt: Date;

  constructor(props: KardexMovementProps) {
    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._variantId = props.variantId;
    this._movementType = props.movementType;
    this._quantity = props.quantity;
    this._previousStock = props.previousStock;
    this._newStock = props.newStock;
    this._unitCost = props.unitCost;
    this._referenceId = props.referenceId ?? null;
    this._userId = props.userId;
    this._notes = props.notes ?? null;
    this._createdAt = props.createdAt ?? new Date();
  }

  static createPurchaseMovement(params: {
    tenantId: string;
    variantId: string;
    quantity: StockQuantity;
    previousStock: StockQuantity;
    newStock: StockQuantity;
    unitCost: CostoPromedioPonderado;
    referenceId?: string | null;
    userId: string;
    notes?: string | null;
  }): KardexMovement {
    return new KardexMovement({
      tenantId: params.tenantId,
      variantId: params.variantId,
      movementType: 'COMPRA',
      quantity: params.quantity,
      previousStock: params.previousStock,
      newStock: params.newStock,
      unitCost: params.unitCost,
      referenceId: params.referenceId,
      userId: params.userId,
      notes: params.notes,
    });
  }

  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get variantId(): string {
    return this._variantId;
  }

  get movementType(): KardexMovementType {
    return this._movementType;
  }

  get quantity(): StockQuantity {
    return this._quantity;
  }

  get previousStock(): StockQuantity {
    return this._previousStock;
  }

  get newStock(): StockQuantity {
    return this._newStock;
  }

  get unitCost(): CostoPromedioPonderado {
    return this._unitCost;
  }

  get referenceId(): string | null {
    return this._referenceId;
  }

  get userId(): string {
    return this._userId;
  }

  get notes(): string | null {
    return this._notes;
  }

  get createdAt(): Date {
    return this._createdAt;
  }
}
