export enum InventoryType {
  DESIGN_PAPER_SHEET = 'DESIGN_PAPER_SHEET'
}

export interface Product {
  id: string;
  artisCode: string;
  supplierCode?: string;
  name: string;
  category: string;
  supplier?: string;
  gsm?: string;
  catalogs?: string[];
  inventoryType: InventoryType;
} 