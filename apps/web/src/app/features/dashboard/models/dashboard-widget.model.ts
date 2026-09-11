export type ProductVisual = 'camera' | 'dress' | 'bottle' | 'perfume' | 'shoe' | 'phone';

export interface RecentOrder {
  id: string;
  trackingNumber: string;
  productName: string;
  productVisual: ProductVisual;
  price: number;
  quantity: number;
  totalAmount: number;
}

export interface TopProduct {
  id: string;
  name: string;
  productVisual: ProductVisual;
  price: number;
  rating: number;
  reviews: number;
}
