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

export interface SKU {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  inventoryType: InventoryType;
  measurementUnit: MeasurementUnit;
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