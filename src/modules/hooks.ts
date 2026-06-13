import { ChariowClient } from "../client.js"

export type WebhookEvent =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.published'
  | 'sale.created'
  | 'sale.completed'
  | 'sale.refunded'
  | 'store.updated'
  | 'payment.succeeded'
  | 'payment.failed'

export interface Webhook {
  id: string
  url: string
  events: WebhookEvent[]
  secret?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at?: string
  last_triggered_at?: string | null
  failure_count?: number
}

export interface WebhookDelivery {
  id: string
  webhook_id: string
  event: WebhookEvent
  status: 'success' | 'failed' | 'pending'
  response_code?: number
  payload: Record<string, any>
  created_at: string
}

export interface CreateWebhookBody {
  url: string
  events: WebhookEvent[]
  secret?: string
}

export class HooksAPI {
  client: ChariowClient

  constructor(client: ChariowClient) {
    this.client = client
  }

  async list(): Promise<Webhook[]> {
    const res = await this.client.request<Webhook[] | { data: Webhook[] }>('/webhooks')
    return Array.isArray(res) ? res : (res as any).data ?? []
  }

  async get(id: string): Promise<Webhook> {
    return this.client.request<Webhook>(`/webhooks/${id}`)
  }

  async create(body: CreateWebhookBody): Promise<Webhook> {
    return this.client.request<Webhook>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async update(id: string, body: Partial<CreateWebhookBody> & { status?: 'active' | 'inactive' }): Promise<Webhook> {
    return this.client.request<Webhook>(`/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  async delete(id: string): Promise<void> {
    return this.client.request<void>(`/webhooks/${id}`, { method: 'DELETE' })
  }

  async test(id: string, event?: WebhookEvent): Promise<{ success: boolean; response_code?: number; message?: string }> {
    return this.client.request(`/webhooks/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ event: event ?? 'product.created' }),
    })
  }

  async deliveries(id: string): Promise<WebhookDelivery[]> {
    const res = await this.client.request<WebhookDelivery[] | { data: WebhookDelivery[] }>(`/webhooks/${id}/deliveries`)
    return Array.isArray(res) ? res : (res as any).data ?? []
  }
}
