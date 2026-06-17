export type Role = 'ADMIN' | 'CUSTOMER' | 'RESTAURANT' | 'DELIVERY';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Role;
  active?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
}

export interface Address {
  id: string;
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  defaultAddress: boolean;
}

export interface Restaurant {
  id: string;
  ownerId?: string;
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  open?: boolean;
  active?: boolean;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  description?: string;
  active?: boolean;
}

export interface Product {
  id: string;
  restaurantId: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  available?: boolean;
  active?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Cart {
  id?: string;
  restaurantId?: string;
  restaurantName?: string;
  subtotal: number;
  items: CartItem[];
  estimatedDeliveryFee?: number;
  estimatedDeliveryMinutes?: number;
  peakDemand?: boolean;
  distanceKm?: number;
}

export type OrderStatus =
  | 'CREATED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'ON_THE_WAY'
  | 'DELIVERED';

export interface OrderItem {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderHistory {
  status: OrderStatus | string;
  changedAt: string;
  notes?: string;
}

export interface Order {
  id: string;
  customerId?: string;
  restaurantId?: string;
  restaurantName?: string;
  deliveryAddressId?: string;
  status: OrderStatus | string;
  subtotalAmount: number;
  taxAmount: number;
  deliveryFee: number;
  tipAmount: number;
  discountAmount: number;
  totalAmount: number;
  estimatedDeliveryMinutes?: number;
  demandMultiplier?: number;
  peakDemand?: boolean;
  distanceKm?: number;
  createdAt?: string;
  items?: OrderItem[];
  statusHistory?: OrderHistory[];
}

export interface Tracking {
  orderId: string;
  status: string;
  restaurantName?: string;
  deliveryAddress?: string;
  deliveryStatus?: string;
  deliveryUserId?: string;
  deliveryUserName?: string;
  estimatedDeliveryMinutes?: number;
  deliveryFee?: number;
  distanceKm?: number;
  peakDemand?: boolean;
  history?: OrderHistory[];
}

export type DeliveryStatus =
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Delivery {
  id: string;
  orderId: string;
  deliveryUserId?: string;
  deliveryUserName?: string;
  status: DeliveryStatus | string;
  orderStatus?: string;
  restaurantName?: string;
  deliveryAddress?: string;
  orderSummary?: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt?: string;
}

export interface RestaurantSchedule {
  id?: number;
  dayOfWeek: number;
  opensAt?: string;
  closesAt?: string;
  closed: boolean;
}

export interface Complaint {
  id: string;
  orderId: string;
  customerUserId?: string;
  status: string;
  subject: string;
  description: string;
  resolution?: string;
  createdAt?: string;
  refund?: {
    id: string;
    status: string;
    amount?: number;
  };
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | string;
  discountValue: number;
  minimumOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usedCount?: number;
  startsAt?: string;
  expiresAt?: string;
  active?: boolean;
}

export interface LoyaltyBalance {
  userId?: string;
  pointsBalance?: number;
  totalPointsEarned?: number;
  totalPointsRedeemed?: number;
  points?: number;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerUserId?: string;
  restaurantId?: string;
  deliveryUserId?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
}

export interface MostOrderedRestaurant {
  restaurantId: string;
  restaurantName: string;
  orderCount: number;
  totalRevenue?: number;
}

export interface AdminSummary {
  totalUsers?: number;
  totalOrders?: number;
  totalRestaurants?: number;
  totalRevenue?: number;
  openComplaints?: number;
}

export interface CommissionConfig {
  id?: string;
  percentage?: number;
  fixedAmount?: number;
  active?: boolean;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
