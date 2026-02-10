// User Types
export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  household_income?: number;
  adults_count?: number;
  children_count?: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdate {
  household_income?: number;
  adults_count?: number;
  children_count?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Invoice Types
export interface InvoiceItem {
  code?: string;
  description: string;
  normalized_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount?: number;
  total_price: number;
  category_name?: string;
  subcategory?: string;
}

export interface Product {
  id: string;
  code: string;
  description: string;
  normalized_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  category_id?: string;
  ai_category_suggestion?: string;
  category_name?: string;
  subcategory?: string;
}

export interface Invoice {
  id: string;
  access_key: string;
  number: string;
  series: string;
  issue_date: string;
  issuer_cnpj: string;
  issuer_name: string;
  total_value: number;
  type: "NFC-e" | "NF-e";
  source: "qrcode" | "xml" | "pdf" | "manual" | "image";
  user_id: string;
  created_at: string;
  products: Product[];
}

export interface InvoiceList {
  id: string;
  access_key: string;
  issuer_name: string;
  total_value: number;
  issue_date: string;
  product_count: number;
  created_at: string;
  type?: "NFC-e" | "NF-e";
}

export interface QRCodeRequest {
  qrcode_url: string;
}

export interface InvoiceItemUpdate {
  id?: string;
  code?: string;
  description: string;
  normalized_name?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount?: number;
  total_price: number;
  category_name?: string;
  subcategory?: string;
}

export interface InvoiceUpdateRequest {
  number?: string;
  series?: string;
  issue_date?: string;
  issuer_name?: string;
  issuer_cnpj?: string;
  total_value?: number;
  access_key?: string;
  items?: InvoiceItemUpdate[];
}

export interface ProcessingResponse {
  processing_id: string;
  status: string;
  message: string;
  estimated_seconds: number;
}

export interface InvoiceProcessingList {
  processing_id: string;
  status: "pending" | "processing" | "extracted" | "error";
  image_count: number;
  confidence_score?: number;
  extracted_issuer_name?: string;
  extracted_total_value?: number;
  extracted_issue_date?: string;
  errors: string[];
  created_at: string;
  updated_at: string;
}

// Product Purchase Search
export interface ProductPurchaseResult {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  issue_date: string;
  issuer_name: string;
  merchant_name?: string;
  invoice_id: string;
}

// Analysis Types
export interface Analysis {
  id: string;
  user_id: string;
  invoice_id?: string;
  type: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  details: Record<string, unknown>;
  reference_period_start?: string;
  reference_period_end?: string;
  related_categories: string[];
  related_merchants: string[];
  is_read: boolean;
  is_acted_upon: boolean;
  dismissed_at?: string;
  ai_model?: string;
  confidence_score?: number;
  created_at: string;
  updated_at: string;
}

// Dashboard Types
export interface DashboardSummary {
  total_spent_this_month: number;
  total_spent_last_month: number;
  month_over_month_change_percent: number;
  invoice_count_this_month: number;
  unread_insights_count: number;
  top_merchant_this_month: {
    name: string;
    total: number;
  } | null;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  created_at: string;
}

// Merchant Types
export interface Merchant {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  created_at: string;
}

// API Response Types
export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}
