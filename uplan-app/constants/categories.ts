/**
 * UPlan — Spending Categories
 */

export type CategoryKey =
  | 'food'
  | 'coffee'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'bills'
  | 'health'
  | 'other';

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  labelEn: string;
  icon: string; // FontAwesome 6 icon name (without 'fa-')
  color: string;
  bgColor: string;
}

export const CATEGORIES: Record<CategoryKey, CategoryDef> = {
  food: {
    key: 'food',
    label: 'Makanan',
    labelEn: 'Food',
    icon: 'utensils',
    color: '#FF6B35',
    bgColor: 'rgba(255, 107, 53, 0.12)',
  },
  coffee: {
    key: 'coffee',
    label: 'Minuman',
    labelEn: 'Drinks',
    icon: 'mug-hot',
    color: '#A88264',
    bgColor: 'rgba(168, 130, 100, 0.12)',
  },
  transport: {
    key: 'transport',
    label: 'Transport',
    labelEn: 'Transport',
    icon: 'car',
    color: '#6366F1',
    bgColor: 'rgba(99, 102, 241, 0.12)',
  },
  shopping: {
    key: 'shopping',
    label: 'Belanja',
    labelEn: 'Shopping',
    icon: 'bag-shopping',
    color: '#EC4899',
    bgColor: 'rgba(236, 72, 153, 0.12)',
  },
  entertainment: {
    key: 'entertainment',
    label: 'Hiburan',
    labelEn: 'Entertainment',
    icon: 'film',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
  },
  bills: {
    key: 'bills',
    label: 'Tagihan',
    labelEn: 'Bills',
    icon: 'file-invoice',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.12)',
  },
  health: {
    key: 'health',
    label: 'Kesehatan',
    labelEn: 'Health',
    icon: 'heart-pulse',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
  },
  other: {
    key: 'other',
    label: 'Lainnya',
    labelEn: 'Other',
    icon: 'circle',
    color: '#6B7280',
    bgColor: 'rgba(107, 114, 128, 0.12)',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export const PAYMENT_METHODS = [
  { key: 'qris', label: 'QRIS', icon: 'qrcode' },
  { key: 'cash', label: 'Tunai', icon: 'money-bill' },
  { key: 'bca', label: 'BCA', icon: 'building-columns' },
  { key: 'bni', label: 'BNI', icon: 'building-columns' },
  { key: 'mandiri', label: 'Mandiri', icon: 'building-columns' },
  { key: 'bri', label: 'BRI', icon: 'building-columns' },
  { key: 'gopay', label: 'GoPay', icon: 'wallet' },
  { key: 'ovo', label: 'OVO', icon: 'wallet' },
  { key: 'dana', label: 'DANA', icon: 'wallet' },
  { key: 'shopeepay', label: 'ShopeePay', icon: 'wallet' },
  { key: 'card', label: 'Kartu Kredit', icon: 'credit-card' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['key'];
