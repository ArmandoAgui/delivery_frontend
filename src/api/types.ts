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
  imageUrl?: string;
  open?: boolean;
  active?: boolean;
  averageRating?: number;
  reviewCount?: number;
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
  imageUrl?: string;
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
  | 'WAITING_FOR_DRIVER'
  | 'NO_DRIVER_AVAILABLE'
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
  paymentStatus?: string;
  refundStatus?: string;
  statusReason?: string;
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
  paymentStatus?: string;
  refundStatus?: string;
  statusReason?: string;
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
  restaurantAddress?: string;
  deliveryAddress?: string;
  orderSummary?: string;
  distanceKm?: number;
  deliveryFee?: number;
  tipAmount?: number;
  totalAmount?: number;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  createdAt?: string;
}

export interface DeliveryProfile {
  deliveryUserId: string;
  deliveryUserName: string;
  available: boolean;
  latitude?: number;
  longitude?: number;
  locationRecordedAt?: string;
  averageRating?: number;
  reviewCount?: number;
}

export interface DeliveryStats {
  pendingRequests: number;
  activeDeliveries: number;
  completedDeliveries: number;
  rejectedRequests: number;
  estimatedDeliveryEarnings: number;
  tipsReceived: number;
  platformCommissionPercentage?: number;
  grossEarnings?: number;
  platformCommissionAmount?: number;
  netEarnings?: number;
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
  customerName?: string;
  customerEmail?: string;
  restaurantId?: string;
  restaurantName?: string;
  orderStatus?: string;
  status: string;
  subject: string;
  description: string;
  resolution?: string;
  createdAt?: string;
  refund?: {
    id: string;
    status: string;
    refundStatus?: string;
    amount?: number;
  };
}

export type RefundType = 'NONE' | 'PARTIAL' | 'TOTAL';

export interface Coupon {
  id: string | number;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED' | string;
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
  pointsCreditBalance?: number;
  creditBalance?: number;
  totalAvailableCredit?: number;
  totalPointsEarned?: number;
  totalPointsRedeemed?: number;
  points?: number;
  transactions?: LoyaltyTransaction[];
}

export interface LoyaltyTransaction {
  id: string;
  transactionType?: string;
  type?: string;
  points: number;
  creditAmount?: number;
  description?: string;
  createdAt?: string;
}

export interface Review {
  id: string;
  orderId: string;
  reviewerUserId?: string;
  restaurantId?: string;
  deliveryUserId?: string;
  productId?: string;
  productName?: string;
  reviewType?: 'RESTAURANT' | 'PRODUCT' | 'DELIVERY';
  rating: number;
  comment?: string;
  createdAt?: string;
}

export interface MostOrderedRestaurant {
  restaurantId: string;
  restaurantName: string;
  orders?: number;
  orderCount?: number;
  revenue?: number;
  totalRevenue?: number;
}

export interface AdminSummary {
  users?: number;
  restaurants?: number;
  orders?: number;
  revenue?: number;
  openComplaints?: number;
  estimatedCommissions?: number;
  totalUsers?: number;
  totalOrders?: number;
  totalRestaurants?: number;
  totalRevenue?: number;
}

export interface CommissionConfig {
  id?: string | number;
  restaurantId?: string;
  commissionPercentage?: number;
  deliveryCommissionPercentage?: number;
  startsAt?: string;
  endsAt?: string;
  global?: boolean;
}

export interface StatusCountReport {
  status: string;
  count: number;
  amount?: number;
}

export interface RoleCountReport {
  role: string;
  users: number;
}

export interface TopDeliveryReport {
  deliveryUserId: string;
  deliveryUserName: string;
  deliveries: number;
  earnings?: number;
}

export interface TopProductReport {
  productId: string;
  productName: string;
  restaurantName: string;
  quantitySold: number;
  revenue?: number;
}

export interface RestaurantCommissionReport {
  restaurantId: string;
  restaurantName: string;
  orders: number;
  revenue: number;
  commissionPercentage: number;
  commissionAmount: number;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
