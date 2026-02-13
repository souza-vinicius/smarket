// Admin User Types
export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  admin_role: string | null;
  deleted_at: string | null;
  created_at: string;
  subscription_plan?: string;
  subscription_status?: string;
  invoices_count: number;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  admin_role: string | null;
  deleted_at: string | null;
  preferences: Record<string, unknown>;
  household_income?: number;
  adults_count?: number;
  children_count?: number;
  created_at: string;
  updated_at: string;
  subscription: {
    plan: string;
    status: string;
    billing_cycle: string | null;
    trial_end: string | null;
    current_period_end: string | null;
  } | null;
  usage_record?: {
    invoices_count: number;
    ai_analyses_count: number;
  } | null;
  invoices_count: number;
  total_spent: number;
}

export interface AdminUserUpdateRequest {
  full_name?: string;
  is_active?: boolean;
  admin_role?: "super_admin" | "admin" | "support" | "finance" | "read_only" | null;
  household_income?: number;
  adults_count?: number;
  children_count?: number;
}

export interface UsersListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Impersonation
export interface ImpersonateResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
}

// Activity Log
export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  admin_email: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  success: boolean;
  created_at: string;
}

export interface UserActivityResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Dashboard Stats
export interface DashboardStats {
  total_users: number;
  active_users: number;
  paying_users: number;
  trial_users: number;
  mrr: number;
  arr: number;
  arpu: number;
  churn_rate: number;
  trial_conversion_rate: number;
  total_invoices: number;
  invoices_this_month: number;
}

// Chart Data
export interface RevenueChartData {
  month: string; // YYYY-MM
  mrr: number;
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churn_mrr: number;
}

export interface GrowthChartData {
  month: string; // YYYY-MM
  new_users: number;
  churned_users: number;
  net_growth: number;
  total_users: number;
}

// Operational Metrics
export interface OperationalMetrics {
  invoices_today: number;
  invoices_this_week: number;
  invoices_this_month: number;
  ocr_success_rate: number;
  avg_processing_time: number; // seconds
  openrouter_usage: number;
  gemini_usage: number;
  openai_usage: number;
  anthropic_usage: number;
  avg_tokens_per_invoice: number;
  estimated_monthly_cost: number;
}

// Admin Subscription Types
export interface AdminSubscription {
  id: string;
  user_id: string;
  user_email: string;
  plan: string;
  billing_cycle: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface AdminSubscriptionDetail {
  id: string;
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  plan: string;
  billing_cycle: string;
  status: string;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancelled_at: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  payments: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    created_at: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface SubscriptionsListResponse {
  subscriptions: AdminSubscription[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ExtendTrialRequest {
  days: number;
}

export interface ExtendTrialResponse {
  message: string;
  new_trial_end: string;
}

// Admin Payment Types
export interface AdminPayment {
  id: string;
  subscription_id: string;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_payment_id: string | null;
  created_at: string;
}

export interface AdminPaymentDetail {
  id: string;
  subscription: {
    id: string;
    plan: string;
    status: string;
  };
  user: {
    id: string;
    email: string;
    full_name: string;
  };
  amount: number;
  currency: string;
  status: string;
  provider: string;
  provider_payment_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

export interface PaymentsListResponse {
  payments: AdminPayment[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface RefundRequest {
  amount?: number;
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  refund_id: string;
  amount_refunded: number;
  message: string;
}

// System Health
export interface ServiceHealth {
  status: "healthy" | "unhealthy" | "degraded" | "configured" | "not_configured";
  latency_ms?: number;
  used_memory_mb?: number;
  error?: string;
  http_status?: number;
}

export interface SystemHealth {
  status: "healthy" | "unhealthy" | "degraded";
  services: Record<string, ServiceHealth>;
  checked_at: string;
}

// Audit Logs
export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// Settings / Feature Flags
export interface FeatureFlags {
  subscription: Record<string, boolean | number>;
  cnpj: Record<string, boolean>;
  ai_analysis: Record<string, boolean>;
  image_optimization: Record<string, boolean | number>;
  providers: Record<string, boolean | string>;
}

export interface SettingsResponse {
  feature_flags: FeatureFlags;
}

export interface FeatureFlagsUpdate {
  [key: string]: boolean | number;
}

export interface FeatureFlagsUpdateResponse {
  message: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}

// Roles
export interface RoleInfo {
  role: string;
  label: string;
  permissions: string[];
}

export interface RolesResponse {
  roles: RoleInfo[];
}

// Coupons
export type CouponType = "percentage" | "fixed";

export interface CouponListItem {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponType;
  discount_value: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface CouponResponse {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponType;
  discount_value: number;
  max_uses: number | null;
  max_uses_per_user: number;
  min_purchase_amount: number | null;
  first_time_only: boolean;
  allow_reuse_after_cancel: boolean;
  is_stackable: boolean;
  applicable_plans: string[];
  applicable_cycles: string[];
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  usage_count: number;
}

export interface CouponCreate {
  code: string;
  description?: string | null;
  discount_type: CouponType;
  discount_value: number;
  max_uses?: number | null;
  max_uses_per_user?: number;
  min_purchase_amount?: number | null;
  first_time_only?: boolean;
  allow_reuse_after_cancel?: boolean;
  is_stackable?: boolean;
  applicable_plans?: string[];
  applicable_cycles?: string[];
  valid_from: string;
  valid_until?: string | null;
  is_active?: boolean;
}

export interface CouponUpdate {
  description?: string | null;
  max_uses?: number | null;
  max_uses_per_user?: number;
  min_purchase_amount?: number | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export interface CouponUsageResponse {
  id: string;
  user_id: string;
  subscription_id: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  is_active: boolean;
  canceled_at: string | null;
  used_at: string;
}

export interface CouponStatsResponse {
  coupon_id: string;
  code: string;
  total_uses: number;
  active_uses: number;
  total_revenue: number;
  total_discount: number;
  unique_users: number;
  most_recent_use: string | null;
}

// Reports - Churn
export interface ChurnTimelineEntry {
  month: string;
  cancelled: number;
  subscribers_at_start: number;
  churn_rate: number;
}

export interface ChurnByPlan {
  plan: string;
  cancelled: number;
  total: number;
  churn_rate: number;
}

export interface ChurnReport {
  timeline: ChurnTimelineEntry[];
  by_plan: ChurnByPlan[];
  summary: {
    total_cancelled: number;
    average_churn_rate: number;
  };
}

// Reports - Conversion
export interface TrialFunnelEntry {
  month: string;
  trials_started: number;
  converted: number;
  conversion_rate: number;
}

export interface PlanDistribution {
  plan: string;
  count: number;
}

export interface PlanFlow {
  from_plan: string;
  to_plan: string;
  count: number;
}

export interface ConversionReport {
  trial_funnel: TrialFunnelEntry[];
  plan_distribution: PlanDistribution[];
  plan_flows: PlanFlow[];
  summary: {
    total_trials: number;
    total_converted: number;
    overall_conversion_rate: number;
  };
}

// Reports - MRR
export interface MRRTimelineEntry {
  month: string;
  mrr: number;
  monthly_mrr: number;
  yearly_mrr_equivalent: number;
  premium_mrr: number;
  basic_mrr: number;
  active_subscribers: number;
}

export interface MRRByPlan {
  plan: string;
  billing_cycle: string;
  mrr: number;
  subscribers: number;
}

export interface MRRReport {
  timeline: MRRTimelineEntry[];
  by_plan: MRRByPlan[];
  summary: {
    current_mrr: number;
    arr: number;
  };
}
