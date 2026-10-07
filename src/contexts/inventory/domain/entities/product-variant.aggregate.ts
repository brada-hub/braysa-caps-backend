import { BusinessRuleViolationException } from '../../../shared/domain/domain.exception';
import { CostoPromedioPonderado } from '../value-objects/costo-promedio-ponderado.vo';
import { SKU } from '../value-objects/sku.vo';
import { StockQuantity } from '../value-objects/stock-quantity.vo';
import { KardexMovement } from './kardex-movement.entity';
import { randomUUID } from 'crypto';

export interface ProductVariantProps {
  id?: string;
  tenantId: string;
  productId: string;
  sku: SKU;
  barcode?: string | null;
  color: string;
  sizeOrModel: string;
  salePrice: number;
  currentUnitCost: CostoPromedioPonderado;
  currentStock: StockQuantity;
  minStockThreshold?: StockQuantity;
  isActive?: boolean;
  createdAt?: Date;
}

export class ProductVariant {
  private readonly _id: string;
  private readonly _tenantId: string;
  private readonly _productId: string;
  private _sku: SKU;
  private _barcode: string | null;
  private _color: string;
  private _sizeOrModel: string;
  private _salePrice: number;
  private _currentUnitCost: CostoPromedioPonderado;
  private _currentStock: StockQuantity;
  private _minStockThreshold: StockQuantity;
  private _isActive: boolean;
  private readonly _createdAt: Date;

  constructor(props: ProductVariantProps) {
    this._id = props.id ?? randomUUID();
    this._tenantId = props.tenantId;
    this._productId = props.productId;
    this._sku = props.sku;
    this._barcode = props.barcode ?? null;
    this._color = props.color;
    this._sizeOrModel = props.sizeOrModel;
    this._salePrice = props.salePrice;
    this._currentUnitCost = props.currentUnitCost;
    this._currentStock = props.currentStock;
    this._minStockThreshold = props.minStockThreshold ?? new StockQuantity(3);
    this._isActive = props.isActive ?? true;
    this._createdAt = props.createdAt ?? new Date();
  }

  /**
   * Registers a restock batch and recalculates the Weighted Average Cost (CPP) per RN-01:
   * CPP = ((Stock_Actual * Costo_Actual) + Costo_Total_Lote) / (Stock_Actual + Cantidad_Nueva)
   */
  registerRestock(
    quantity: StockQuantity,
    totalBatchCost: number,
  ): {
    previousStock: StockQuantity;
    newStock: StockQuantity;
    previousCost: CostoPromedioPonderado;
    newCost: CostoPromedioPonderado;
  } {
    if (!this._isActive) {
      throw new BusinessRuleViolationException(
        `Cannot restock inactive variant "${this._sku.value}".`,
      );
    }

    if (quantity.value <= 0) {
      throw new BusinessRuleViolationException(
        'Restock quantity must be greater than zero.',
      );
    }

    const previousStock = this._currentStock;
    const previousCost = this._currentUnitCost;

    // Recalculate CPP
    const newCost = CostoPromedioPonderado.calculateFromBatchTotal(
      previousStock,
      previousCost,
      quantity,
      totalBatchCost,
    );

    const newStock = previousStock.add(quantity);

    // Update aggregate state
    this._currentStock = newStock;
    this._currentUnitCost = newCost;

    return {
      previousStock,
      newStock,
      previousCost,
      newCost,
    };
  }

  /**
   * Deducts stock for sales or adjustments.
   */
  deductStock(quantity: StockQuantity): {
    previousStock: StockQuantity;
    newStock: StockQuantity;
  } {
    if (!this._isActive) {
      throw new BusinessRuleViolationException(
        `Cannot deduct stock from inactive variant "${this._sku.value}".`,
      );
    }

    if (quantity.value <= 0) {
      throw new BusinessRuleViolationException(
        'Deduction quantity must be greater than zero.',
      );
    }

    const previousStock = this._currentStock;
    const newStock = this._currentStock.subtract(quantity);

    this._currentStock = newStock;

    return {
      previousStock,
      newStock,
    };
  }

  /**
   * Helper that calls registerRestock and produces a KardexMovement of type 'COMPRA'.
   */
  registerBatchPurchase(params: {
    quantity: StockQuantity;
    unitCost: CostoPromedioPonderado;
    userId: string;
    notes?: string | null;
    referenceId?: string | null;
  }): { kardexMovement: KardexMovement } {
    const totalBatchCost = params.quantity.value * params.unitCost.value;
    const { previousStock, newStock } = this.registerRestock(
      params.quantity,
      totalBatchCost,
    );

    const kardexMovement = KardexMovement.createPurchaseMovement({
      tenantId: this._tenantId,
      variantId: this._id,
      quantity: params.quantity,
      previousStock,
      newStock,
      unitCost: params.unitCost,
      userId: params.userId,
      referenceId: params.referenceId,
      notes: params.notes,
    });

    return { kardexMovement };
  }

  get id(): string {
    return this._id;
  }

  get tenantId(): string {
    return this._tenantId;
  }

  get productId(): string {
    return this._productId;
  }

  get sku(): SKU {
    return this._sku;
  }

  get barcode(): string | null {
    return this._barcode;
  }

  get color(): string {
    return this._color;
  }

  get sizeOrModel(): string {
    return this._sizeOrModel;
  }

  get salePrice(): number {
    return this._salePrice;
  }

  get currentUnitCost(): CostoPromedioPonderado {
    return this._currentUnitCost;
  }

  get currentStock(): StockQuantity {
    return this._currentStock;
  }

  get minStockThreshold(): StockQuantity {
    return this._minStockThreshold;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  isLowStock(): boolean {
    return this._currentStock.value <= this._minStockThreshold.value;
  }
}
