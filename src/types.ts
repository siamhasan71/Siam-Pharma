export type MedicineCategory =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Injection'
  | 'Ointment'
  | 'Drops'
  | 'Inhaler'
  | 'Other';

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  category: MedicineCategory;
  batchNumber: string;
  manufacturer: string;
  expiryDate: string; // YYYY-MM-DD
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockThreshold: number; // default e.g. 15
  shelfLocation?: string;
  dosage?: string;
  form?: string;
  strength?: string;
  packSize?: string;
  unit?: string; // e.g. Box, Pcs, Strip, Bottle, Ampoule
  barcode?: string;
  isOtherProduct?: boolean;
}

export interface CartItem {
  medicine: Medicine;
  quantity: number;
  discountPercent: number;
  itemTotal: number;
  unitLabel?: string; // e.g. 'Tablet', 'Strip', 'Box'
}

export type PaymentMethod = 'Cash' | 'Online' | 'Credit/Debit Card' | 'Digital / UPI' | 'Insurance' | 'Due / Credit';

export interface SaleItem {
  medicineId: string;
  medicineName: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discountPercent: number;
  totalPrice: number;
  unitLabel?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string; // ISO string
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxRate: number; // percentage, e.g. 5
  grandTotal: number;
  totalAmount?: number;
  paymentMethod: PaymentMethod;
  amountTendered?: number;
  changeDue?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  cashierName: string;
  status: 'Completed' | 'Refunded';
  paymentStatus?: 'Full Paid' | 'Partial Paid' | 'Full Due';
  paidAmount?: number;
  dueAmount?: number;
  isOneTimeDue?: boolean;
  globalDiscount?: number;
  netAmount?: number;
  saleType?: string;
  salesPerson?: string;
  isPosted?: boolean;
  ageDetail?: string;
  sex?: string;
  patientIdNo?: string;
  regNo?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  dueBalance: number;
  medicinesSupplied: string[];
}

export interface PurchaseOrderItem {
  medicineId: string;
  medicineName: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  receivedDate?: string;
  status: 'Received' | 'Pending';
  items: PurchaseOrderItem[];
  totalAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Due';
  paidAmount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  totalSpent: number;
  dueAmount?: number;
  lastVisit: string;
  createdAt: string;
  isOneTime?: boolean;
}

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  items: { medicineName: string; quantity: number; price: number }[];
  totalAmount: number;
  status: 'Pending' | 'Accepted' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
  createdAt: string;
  paymentMethod: 'Cash on Delivery' | 'bKash / Nagad' | 'Paid Online';
  prescriptionRequired?: boolean;
}

export type UserRole = 'admin' | 'pharmacist';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatarUrl?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  password?: string;
  dateOfBirth?: string;
  country?: string;
  district?: string;
  thana?: string;
  postOffice?: string;
  village?: string;
  avatarUrl?: string;
  role: UserRole;

  // Business & Professional Details
  businessName?: string;
  qualification?: string;
  licenseNumber?: string;
  address?: string;
  shopLogoUrl?: string;
}

export interface PharmaCompany {
  id: string;
  name: string;
  iconName?: string;
  iconColor?: string;
  customIconUrl?: string;
  createdAt?: string;
}

export interface PettyExpense {
  id: string;
  category: string;
  note: string;
  amount: number;
  date: string;
  userId?: string;
}
