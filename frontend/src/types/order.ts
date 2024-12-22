import { Product } from './product';

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface OrderData {
  supplier: string;
  items: OrderItem[];
  date: Date;
} 