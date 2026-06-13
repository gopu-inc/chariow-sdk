import { ChariowClient } from "../client.js"

export interface PaymentMethod {
  type: 'card' | 'mobile_money' | 'bank_transfer' | 'crypto' | 'paypal'
  provider?: string
}

export interface CheckoutItem {
  product_id: string
  quantity?: number
}

export interface CreateCheckoutBody {
  items: CheckoutItem[]
  customer_email?: string
  customer_name?: string
  payment_method?: PaymentMethod
  currency?: string
  success_url?: string
  cancel_url?: string
  metadata?: Record<string, string>
}

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded' | 'cancelled'

export interface Payment {
  id: string
  status: PaymentStatus
  amount: number
  currency: string
  items: Array<{
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    total: number
  }>
  customer_email?: string
  customer_name?: string
  checkout_url?: string
  receipt_url?: string
  payment_method?: PaymentMethod
  metadata?: Record<string, string>
  created_at: string
  updated_at?: string
  paid_at?: string | null
}

export interface RefundBody {
  reason?: string
  amount?: number
}

export class PayAPI {
  client: ChariowClient

  constructor(client: ChariowClient) {
    this.client = client
  }

  async checkout(body: CreateCheckoutBody): Promise<Payment> {
    return this.client.request<Payment>('/checkout', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async get(id: string): Promise<Payment> {
    return this.client.request<Payment>(`/payments/${id}`)
  }

  async list(params: { per_page?: number; status?: PaymentStatus; cursor?: string } = {}): Promise<{ data: Payment[]; pagination?: any }> {
    const p = new URLSearchParams()
    if (params.per_page) p.append('per_page', String(params.per_page))
    if (params.status)   p.append('status', params.status)
    if (params.cursor)   p.append('cursor', params.cursor)
    const qs = p.toString()
    const res = await this.client.request<any>(`/payments${qs ? `?${qs}` : ''}`)
    if (Array.isArray(res)) return { data: res }
    return res as { data: Payment[] }
  }

  async refund(id: string, body?: RefundBody): Promise<Payment> {
    return this.client.request<Payment>(`/payments/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    })
  }

  async capture(id: string): Promise<Payment> {
    return this.client.request<Payment>(`/payments/${id}/capture`, {
      method: 'POST',
    })
  }
}
