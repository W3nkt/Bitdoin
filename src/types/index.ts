// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'CUSTOMER' | 'ADMIN' | 'OPERATIONS' | 'FINANCE'
export type Language = 'lo' | 'en'
export type Currency = 'LAK' | 'USD'

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_REVIEW'
  | 'PROCESSING'
  | 'PURCHASING_FROM_BOOKSTORE'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OUT_OF_STOCK'
  | 'RETURNED'

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'REQUIRES_REVIEW' | 'REJECTED' | 'REFUNDED'
export type PaymentMethod = 'QR_PAYMENT' | 'BANK_TRANSFER' | 'CASH_ON_DELIVERY'

export type DeliveryStatus =
  | 'NOT_ASSIGNED'
  | 'READY_FOR_SHIPMENT'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED'

export type AvailabilityStatus = 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN'
export type NotificationChannel = 'IN_APP' | 'WHATSAPP' | 'MESSENGER'

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  phone?: string
  email?: string
  role: UserRole
  language: Language
  currency: Currency
  created_at: string
  updated_at: string
}

export interface Address {
  id: string
  user_id: string
  full_name: string
  phone: string
  address_line: string
  city?: string
  province?: string
  country: string
  is_default: boolean
  created_at: string
}

export interface Category {
  id: string
  name_lo: string
  name_en: string
  slug: string
  created_at: string
}

export interface Bookstore {
  id: string
  name: string
  contact_name?: string
  phone?: string
  whatsapp?: string
  messenger_url?: string
  address?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Book {
  id: string
  isbn?: string
  title: string
  author?: string
  publisher?: string
  language: string
  category_id?: string
  description?: string
  pages?: number
  publication_date?: string
  cover_image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined
  category?: Category
  prices?: BookPrice[]
  min_price?: number
  max_price?: number
}

export interface BookPrice {
  id: string
  book_id: string
  bookstore_id: string
  bookstore_price: number
  margin_percent: number
  final_price: number
  availability: AvailabilityStatus
  last_checked_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  bookstore?: Bookstore
  book?: Book
}

export interface MarginRule {
  id: string
  name: string
  category_id?: string
  bookstore_id?: string
  min_price?: number
  max_price?: number
  margin_percent: number
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  book_id: string
  bookstore_id: string
  quantity: number
  // Resolved at runtime
  book?: Book
  bookstore?: Bookstore
  unit_price?: number
}

export interface Order {
  id: string
  order_number: string
  customer_id: string
  status: OrderStatus
  payment_status: PaymentStatus
  subtotal_amount: number
  total_amount: number
  currency: Currency
  delivery_fee_note: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  customer?: User
  items?: OrderItem[]
  payments?: Payment[]
  deliveries?: Delivery[]
}

export interface OrderItem {
  id: string
  order_id: string
  book_id: string
  bookstore_id: string
  quantity: number
  bookstore_price: number
  margin_percent: number
  final_price: number
  fulfillment_status: OrderStatus
  created_at: string
  // Joined
  book?: Book
  bookstore?: Bookstore
}

export interface Payment {
  id: string
  order_id: string
  user_id: string
  method: PaymentMethod
  amount: number
  currency: Currency
  receipt_image_url?: string
  verification_status: PaymentStatus
  transaction_reference?: string
  bank_name?: string
  sender_name?: string
  transferred_at?: string
  ai_confidence_score?: number
  ai_extracted_data?: Record<string, unknown>
  reviewed_by_user_id?: string
  reviewed_at?: string
  rejection_reason?: string
  created_at: string
  // Joined
  order?: Order
  user?: User
}

export interface Delivery {
  id: string
  order_id: string
  courier: string
  tracking_number?: string
  status: DeliveryStatus
  shipped_at?: string
  delivered_at?: string
  estimated_delivery_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // Joined
  order?: Order
}

export interface Notification {
  id: string
  user_id?: string
  channel: NotificationChannel
  recipient: string
  subject?: string
  message: string
  status: string
  sent_at?: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id?: string
  entity: string
  entity_id?: string
  action: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  created_at: string
  user?: User
}

// ─── UI / App Types ───────────────────────────────────────────────────────────

export interface LocalCart {
  items: CartItem[]
}

export interface CheckoutForm {
  full_name: string
  phone: string
  logistics_provider: string
  province: string
  district: string
  delivery_address: string
  notes?: string
  payment_method: PaymentMethod
  language: Language
}

export interface AnalyticsSummary {
  gmv: number
  revenue: number
  gross_margin: number
  pending_payments: number
  pending_deliveries: number
  total_orders: number
  avg_order_value: number
}

export interface TopBook {
  book_id: string
  title: string
  cover_image_url?: string
  total_quantity: number
  total_revenue: number
}

export interface MarginByBookstore {
  bookstore_id: string
  bookstore_name: string
  total_margin: number
  order_count: number
}

export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}

export interface SearchFilters {
  query?: string
  category_id?: string
  language?: string
  min_price?: number
  max_price?: number
  availability?: AvailabilityStatus
  isbn?: string
  author?: string
  publisher?: string
}
