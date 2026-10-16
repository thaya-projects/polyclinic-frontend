// Espeja SubscriptionDTO del backend (snake_case). status llega como string libre porque el
// backend usa los 6 valores del enum + posibles futuros (ver comentario en SubscriptionDTO.cs):
// trialing | active | past_due | cancelled | expired | unpaid.
export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'unpaid';

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatus | string;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string | null;
  cancelled_at: string | null;
  cancel_at_period_end: boolean;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_price_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ChangePlanDto {
  plan_id: string;
}

export interface CancelSubscriptionDto {
  at_period_end?: boolean;
}

export interface ExtendTrialDto {
  days: number;
}

export interface CheckoutSessionDto {
  checkout_url: string;
  session_id: string;
}
