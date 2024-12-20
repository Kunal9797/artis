export enum InventoryType {
  DESIGN_PAPER_ROLL = 'DESIGN_PAPER_ROLL',
  DESIGN_PAPER_SHEET = 'DESIGN_PAPER_SHEET',
  LAMINATE_SHEET = 'LAMINATE_SHEET'
}

export enum MeasurementUnit {
  WEIGHT = 'WEIGHT',
  UNITS = 'UNITS'
}

export enum MovementType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  CONVERSION = 'CONVERSION'
}

export interface Product {
  id: string;
  artisCode: string;
  supplierCode?: string;
  name: string;
  category?: string;
  supplier?: string;
  texture?: string;
  thickness?: string;
  inventoryType: InventoryType;
  measurementUnit: MeasurementUnit;
  designPaperId?: string;
  designPaper?: Product;
}

export interface SKU extends Product {
  id: string;
  productId: string;
  quantity: number;
  minimumStock?: number;
  reorderPoint?: number;
}

export interface InventoryMovement {
  id: string;
  skuId: string;
  movementType: MovementType;
  quantity: number;
  fromSkuId?: string;
  notes?: string;
  date: Date;
} 