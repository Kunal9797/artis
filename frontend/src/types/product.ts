export interface Product {
  id: string;
  artisCode: string;
  supplierCode?: string;
  name: string;
  category: string;
  supplier?: string;
  gsm?: string;
  catalogs?: string[];
  altCode?: string;
} 