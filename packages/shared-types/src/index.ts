export type Role = 'STUDENT' | 'DELIVERY_AGENT' | 'KITCHEN_STAFF' | 'ADMIN' | 'SUPER_ADMIN';

export type BlockType = 'ACADEMIC' | 'HOSTEL' | 'CAFETERIA' | 'ADMIN' | 'SPORTS';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';

export type SpiceLevel = 'MILD' | 'MEDIUM' | 'SPICY' | 'EXTRA_SPICY';

export type PollStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'FINALIZED';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethod = 'WALLET' | 'UPI' | 'CARD' | 'CASH_ON_DELIVERY' | 'NETBANKING';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export type TransactionType =
  | 'CREDIT_TOPUP'
  | 'CREDIT_REFUND'
  | 'CREDIT_BONUS'
  | 'DEBIT_ORDER'
  | 'DEBIT_PENALTY'
  | 'DEBIT_WITHDRAW'
  | 'CASHBACK';

export type DiscountType = 'FLAT' | 'PERCENTAGE' | 'FREE_DELIVERY' | 'BUY_ONE_GET_ONE';

export type NotificationType =
  | 'ORDER_CONFIRMED'
  | 'ORDER_PREPARING'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'POLL_OPENED'
  | 'POLL_RESULT'
  | 'POLL_REMINDER'
  | 'WALLET_CREDITED'
  | 'WALLET_DEBITED'
  | 'COUPON_UNLOCKED'
  | 'SYSTEM_ANNOUNCEMENT';

// API Response DTOs
export interface UserDTO {
  id: string;
  email: string;
  phone?: string;
  name: string;
  avatar?: string;
  role: Role;
  collegeId?: string;
  rollNumber?: string;
  department?: string;
  semester?: number;
  hostelBlock?: string;
  defaultAddress?: string;
  isVerified: boolean;
  walletBalance?: number;
  walletRealBalance?: number;
  walletPromoBalance?: number;
  collegeSettings?: any;
  votingStreak?: number;
  lastVotedAt?: string;
}

export interface MenuItemDTO {
  id: string;
  menuId: string;
  name: string;
  description?: string;
  image?: string;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
  allergens: string[];
  nutritionInfo?: any;
  spiceLevel: SpiceLevel;
  tags: string[];
  basePrice?: number;
  studentPrice?: number;
}

export interface MenuDTO {
  id: string;
  collegeId: string;
  name: string;
  description?: string;
  mealType: MealType;
  isActive: boolean;
  items: MenuItemDTO[];
  basePrice: number;
  studentPrice: number;
  deliveryFee: number;
  packagingFee: number;
}

export interface PollOptionDTO {
  id: string;
  pollId: string;
  menuId: string;
  menu: MenuDTO;
  voteCount: number;
  percentage: number;
  isWinner: boolean;
}

export interface PollDTO {
  id: string;
  collegeId: string;
  title: string;
  description?: string;
  mealType: MealType;
  targetDate: string;
  status: PollStatus;
  openAt: string;
  closeAt: string;
  options: PollOptionDTO[];
  totalVotes: number;
  userVotedOptionId?: string;
  winnerMenuId?: string;
  winnerMenu?: MenuDTO;
  finalizedAt?: string;
}

export interface OrderItemDTO {
  id: string;
  menuItemId: string;
  menuItem: MenuItemDTO;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customizations?: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  userId: string;
  user: { name: string; email: string; phone?: string };
  deliveryBlockId: string;
  deliveryBlock: { name: string; shortCode: string };
  deliveryAddress: string;
  scheduledFor: string;
  items: OrderItemDTO[];
  status: OrderStatus;
  agentId?: string;
  agent?: { name: string; phone?: string };
  estimatedDelivery?: string;
  actualDelivery?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  discount: number;
  tax: number;
  totalAmount: number;
  specialInstructions?: string;
  verificationCode?: string;
  isLockerPickup?: boolean;
  lockerId?: string;
  lockerPasscode?: string;
  lockerDroppedAt?: string;
  locker?: { code: string };
  createdAt: string;
}
