import { ChariowClient } from "../client.js"

export interface DomainRecord {
  id: string
  domain: string
  type: 'custom' | 'subdomain'
  status: 'pending' | 'active' | 'failed' | 'inactive'
  ssl_status?: 'pending' | 'active' | 'failed'
  dns_records?: DnsRecord[]
  created_at: string
  verified_at?: string | null
}

export interface DnsRecord {
  type: 'CNAME' | 'A' | 'TXT'
  name: string
  value: string
  ttl?: number
}

export interface AddDomainBody {
  domain: string
}

export class DnsAPI {
  client: ChariowClient

  constructor(client: ChariowClient) {
    this.client = client
  }

  async list(): Promise<DomainRecord[]> {
    const res = await this.client.request<DomainRecord[] | { data: DomainRecord[] }>('/domains')
    return Array.isArray(res) ? res : (res as any).data ?? []
  }

  async get(id: string): Promise<DomainRecord> {
    return this.client.request<DomainRecord>(`/domains/${id}`)
  }

  async add(body: AddDomainBody): Promise<DomainRecord> {
    return this.client.request<DomainRecord>('/domains', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async verify(id: string): Promise<DomainRecord> {
    return this.client.request<DomainRecord>(`/domains/${id}/verify`, {
      method: 'POST',
    })
  }

  async remove(id: string): Promise<void> {
    return this.client.request<void>(`/domains/${id}`, { method: 'DELETE' })
  }

  async setDefault(id: string): Promise<DomainRecord> {
    return this.client.request<DomainRecord>(`/domains/${id}/default`, {
      method: 'POST',
    })
  }
}
