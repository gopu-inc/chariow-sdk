import http from 'http'
import fs from 'fs'
import path from 'path'
import { ChariowClient } from '../client.js'
import { PayAPI, CreateCheckoutBody, Payment } from './pay.js'
import { ProductsAPI } from './products.js'

// ─── Types ────────────────────────────────────────────────────────────────────

export type RouteType = 'html' | 'json' | 'text' | 'stream'

export type TransactionType = 'APP' | 'WEB' | 'GATEWAY'

export interface ChariowPayOptions {
  /** API key Chariow (CRUD) */
  Crud: string
  /** Server address to proxy towards  e.g. "localhost:4242" */
  Server?: string
  /** Transaction mode */
  Type?: TransactionType
  /** Accepted currencies  e.g. "USD, FC" or ["USD","XAF"] */
  Devis?: string | string[]
  /** Port to listen on  (default: 4242) */
  Port?: number
}

export interface ChariowPayRequest {
  method: string
  path: string
  query: URLSearchParams
  headers: http.IncomingHttpHeaders
  body: any
  raw: http.IncomingMessage
}

export interface ChariowPayResult {
  _type: RouteType
  _status: number
  _headers: Record<string, string>
  _body: string | Buffer
}

// ─── Response builder ─────────────────────────────────────────────────────────

export class ChariowRes {
  private _apiPay: ChariowPay

  constructor(apiPay: ChariowPay) {
    this._apiPay = apiPay
  }

  /** Serve an HTML file from disk */
  load(file: string, status = 200): ChariowPayResult {
    return this._apiPay.load(file, status)
  }

  /** Return JSON */
  json(data: unknown, status = 200): ChariowPayResult {
    return {
      _type: 'json',
      _status: status,
      _headers: { 'Content-Type': 'application/json' },
      _body: JSON.stringify(data, null, 2),
    }
  }

  /** Return plain text */
  text(content: string, status = 200): ChariowPayResult {
    return {
      _type: 'text',
      _status: status,
      _headers: { 'Content-Type': 'text/plain' },
      _body: content,
    }
  }

  /** Return HTML string */
  html(content: string, status = 200): ChariowPayResult {
    return {
      _type: 'html',
      _status: status,
      _headers: { 'Content-Type': 'text/html; charset=utf-8' },
      _body: content,
    }
  }

  /** Redirect */
  redirect(url: string, status = 302): ChariowPayResult {
    return {
      _type: 'text',
      _status: status,
      _headers: { 'Location': url, 'Content-Type': 'text/plain' },
      _body: `Redirecting to ${url}`,
    }
  }
}

// ─── Route handler type ───────────────────────────────────────────────────────

export type RouteHandler = (
  req: ChariowPayRequest,
  res: ChariowRes
) => ChariowPayResult | Promise<ChariowPayResult>

interface Route {
  method: string
  path: string
  type: RouteType
  handler: RouteHandler
}

// ─── ChariowPay ───────────────────────────────────────────────────────────────

export class ChariowPay {
  readonly options: ChariowPayOptions
  readonly currencies: string[]

  private _client: ChariowClient
  private _pay: PayAPI
  private _products: ProductsAPI
  private _routes: Route[] = []
  private _server: http.Server | null = null
  private _res: ChariowRes

  constructor(options: ChariowPayOptions) {
    this.options = options

    if (!options.Crud) {
      throw new Error('[ChariowPay] Crud (API key) is required')
    }

    this._client   = new ChariowClient({ apiKey: options.Crud })
    this._pay      = new PayAPI(this._client)
    this._products = new ProductsAPI(this._client)
    this._res      = new ChariowRes(this)

    // Parse accepted currencies
    const raw = options.Devis ?? 'USD'
    this.currencies = (Array.isArray(raw) ? raw : raw.split(/[,;\s]+/))
      .map(c => c.trim().toUpperCase())
      .filter(Boolean)
  }

  // ─── Route registration ───────────────────────────────────────────────────

  private _addRoute(
    method: string,
    routePath: string,
    typeOrHandler: RouteType | string | RouteHandler,
    handler?: RouteHandler
  ): this {
    let type: RouteType = 'json'
    let fn: RouteHandler

    if (typeof typeOrHandler === 'function') {
      fn = typeOrHandler
    } else if (typeof typeOrHandler === 'string') {
      type = typeOrHandler as RouteType
      fn = handler!
    } else {
      fn = handler!
    }

    this._routes.push({ method: method.toUpperCase(), path: routePath, type, handler: fn })
    return this
  }

  /** Register a GET route */
  get(routePath: string, handler: RouteHandler): this
  get(routePath: string, type: RouteType | string, handler: RouteHandler): this
  get(routePath: string, typeOrHandler: any, handler?: RouteHandler): this {
    return this._addRoute('GET', routePath, typeOrHandler, handler)
  }

  /** Register a POST route */
  post(routePath: string, handler: RouteHandler): this
  post(routePath: string, type: RouteType | string, handler: RouteHandler): this
  post(routePath: string, typeOrHandler: any, handler?: RouteHandler): this {
    return this._addRoute('POST', routePath, typeOrHandler, handler)
  }

  /** Register a PUT route */
  put(routePath: string, handler: RouteHandler): this
  put(routePath: string, type: RouteType | string, handler: RouteHandler): this
  put(routePath: string, typeOrHandler: any, handler?: RouteHandler): this {
    return this._addRoute('PUT', routePath, typeOrHandler, handler)
  }

  /** Register a DELETE route */
  delete(routePath: string, handler: RouteHandler): this
  delete(routePath: string, type: RouteType | string, handler: RouteHandler): this
  delete(routePath: string, typeOrHandler: any, handler?: RouteHandler): this {
    return this._addRoute('DELETE', routePath, typeOrHandler, handler)
  }

  // ─── Response helpers (can be called on the instance) ────────────────────

  /** Serve an HTML file from disk */
  load(file: string, status = 200): ChariowPayResult {
    const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file)
    try {
      const content = fs.readFileSync(filePath)
      const ext     = path.extname(file).toLowerCase()
      const mime: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.htm':  'text/html; charset=utf-8',
        '.css':  'text/css',
        '.js':   'application/javascript',
        '.json': 'application/json',
        '.png':  'image/png',
        '.jpg':  'image/jpeg',
        '.svg':  'image/svg+xml',
      }
      return {
        _type:    'html',
        _status:  status,
        _headers: { 'Content-Type': mime[ext] ?? 'text/html; charset=utf-8' },
        _body:    content,
      }
    } catch (err: any) {
      return {
        _type:    'html',
        _status:  404,
        _headers: { 'Content-Type': 'text/html; charset=utf-8' },
        _body:    `<h1>404 — File not found</h1><p>${file}</p>`,
      }
    }
  }

  /** Shortcut: return JSON result */
  json(data: unknown, status = 200): ChariowPayResult {
    return this._res.json(data, status)
  }

  /** Shortcut: return HTML string result */
  html(content: string, status = 200): ChariowPayResult {
    return this._res.html(content, status)
  }

  /** Shortcut: redirect */
  redirect(url: string, status = 302): ChariowPayResult {
    return this._res.redirect(url, status)
  }

  // ─── Pay integration ──────────────────────────────────────────────────────

  /** Create a checkout (buy a product) */
  async checkout(params: CreateCheckoutBody): Promise<Payment> {
    // Enforce Devis constraint
    if (params.currency && !this.currencies.includes(params.currency.toUpperCase())) {
      throw new Error(
        `[ChariowPay] Currency "${params.currency}" not accepted. Accepted: ${this.currencies.join(', ')}`
      )
    }
    return this._pay.checkout({
      ...params,
      currency: params.currency ?? this.currencies[0],
    })
  }

  /** Get a payment */
  async getPayment(id: string): Promise<Payment> {
    return this._pay.get(id)
  }

  /** Refund a payment */
  async refund(id: string, options?: { reason?: string; amount?: number }): Promise<Payment> {
    return this._pay.refund(id, options)
  }

  /** List products */
  async products(opts?: { per_page?: number; status?: string }): Promise<any> {
    return this._products.list(opts ?? {})
  }

  /** Get a product */
  async product(id: string): Promise<any> {
    return this._products.get(id)
  }

  // ─── Server ───────────────────────────────────────────────────────────────

  /** Start the ChariowPay server */
  listen(port?: number, callback?: () => void): this {
    const listenPort = port ?? this.options.Port ?? 4242

    this._server = http.createServer(async (req, res) => {
      const start  = Date.now()
      const method = (req.method ?? 'GET').toUpperCase()
      const rawUrl = new URL(req.url ?? '/', `http://localhost`)

      // Read body
      const body = await new Promise<any>((resolve) => {
        let data = ''
        req.on('data', (chunk: string) => { data += chunk })
        req.on('end', () => {
          try { resolve(JSON.parse(data || '{}')) }
          catch { resolve({}) }
        })
      })

      const payReq: ChariowPayRequest = {
        method,
        path:    rawUrl.pathname,
        query:   rawUrl.searchParams,
        headers: req.headers,
        body,
        raw: req,
      }

      // CORS preflight
      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin':  '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        })
        res.end()
        return
      }

      // Match route
      const route = this._routes.find(r =>
        r.method === method && this._matchPath(r.path, rawUrl.pathname)
      )

      let result: ChariowPayResult

      if (!route) {
        result = {
          _type:    'json',
          _status:  404,
          _headers: { 'Content-Type': 'application/json' },
          _body: JSON.stringify({
            error: `Route not found: ${method} ${rawUrl.pathname}`,
            routes: this._routes.map(r => `${r.method} ${r.path}`),
          }),
        }
      } else {
        try {
          result = await route.handler(payReq, this._res)
          if (!result || !result._type) {
            result = this._res.json(result)
          }
        } catch (err: any) {
          result = {
            _type:    'json',
            _status:  500,
            _headers: { 'Content-Type': 'application/json' },
            _body:    JSON.stringify({ error: err.message }),
          }
        }
      }

      const headers = {
        ...result._headers,
        'Access-Control-Allow-Origin': '*',
        'X-Powered-By': 'ChariowPay',
        'X-Response-Time': `${Date.now() - start}ms`,
      }

      res.writeHead(result._status, headers)
      res.end(result._body)
    })

    this._server.listen(listenPort, () => {
      if (callback) {
        callback()
      } else {
        console.log(`[ChariowPay] Server running on http://localhost:${listenPort}`)
        console.log(`[ChariowPay] Type: ${this.options.Type ?? 'APP'}  |  Currencies: ${this.currencies.join(', ')}`)
        console.log(`[ChariowPay] Routes:`)
        this._routes.forEach(r => console.log(`  ${r.method.padEnd(7)} ${r.path}  (${r.type})`))
      }
    })

    return this
  }

  /** Stop the server */
  close(callback?: () => void): void {
    this._server?.close(callback)
    this._server = null
  }

  /** Check if server is running */
  get isRunning(): boolean {
    return this._server?.listening ?? false
  }

  // ─── Path matching (simple, supports :param) ──────────────────────────────
  private _matchPath(routePath: string, reqPath: string): boolean {
    const routeParts = routePath.split('/').filter(Boolean)
    const reqParts   = reqPath.split('/').filter(Boolean)
    if (routeParts.length !== reqParts.length) {
      // Allow wildcard /* routes
      if (routePath === '/*' || routePath === '*') return true
      return false
    }
    return routeParts.every((part, i) => part.startsWith(':') || part === reqParts[i])
  }
}
