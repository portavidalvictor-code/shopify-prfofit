// Vercel Function: GET /api/dashboard
// Reads the last 7 days of paid orders + recent customers from the Shopify
// Admin GraphQL API and returns them in the shape the dashboard renders.
//
// Env vars (Vercel → Project → Settings → Environment Variables):
//   SHOPIFY_STORE_DOMAIN   tu-tienda.myshopify.com
//   SHOPIFY_CLIENT_ID      } app created in the Shopify Dev Dashboard
//   SHOPIFY_CLIENT_SECRET  } (client credentials grant, token renewed automatically)
//   SHOPIFY_ADMIN_TOKEN    alternative to the two above: a static shpat_ token
//   DASHBOARD_PASSWORD     password required to view the dashboard
//   SHOPIFY_API_VERSION    optional, defaults to 2026-07
//   FEE_RATE               optional, fee estimate when Shopify reports no fees (default 0.025)

import type { Customer, DailyStat, RecentOrder } from '../src/data.ts'

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07'
const DAYS = 7

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(shop: string): Promise<string> {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SHOPIFY_CLIENT_ID ?? '',
      client_secret: process.env.SHOPIFY_CLIENT_SECRET ?? '',
    }),
  })
  if (!res.ok) throw new Error(`Shopify token request failed (${res.status}): ${await res.text()}`)
  const json = (await res.json()) as { access_token: string; expires_in?: number }
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 86_399) * 1000,
  }
  return cachedToken.value
}

async function shopifyGraphql<T>(shop: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken(shop)
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Shopify API error (${res.status}): ${await res.text()}`)
  const json = (await res.json()) as { data?: T; errors?: unknown }
  if (json.errors || !json.data) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`)
  return json.data
}

const QUERY = /* GraphQL */ `
  query Dashboard($ordersQuery: String!) {
    shop {
      ianaTimezone
      currencyCode
    }
    orders(first: 250, query: $ordersQuery, sortKey: CREATED_AT, reverse: true) {
      nodes {
        name
        createdAt
        customer { displayName }
        currentTotalPriceSet { shopMoney { amount } }
        lineItems(first: 100) {
          nodes {
            currentQuantity
            variant { inventoryItem { unitCost { amount } } }
          }
        }
        transactions(first: 20) {
          kind
          status
          fees { amount { amount } }
        }
      }
    }
    customers(first: 6, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        displayName
        defaultEmailAddress { emailAddress }
        numberOfOrders
        amountSpent { amount }
        lastOrder { createdAt }
      }
    }
  }
`

interface Money { amount: string }
interface QueryResult {
  shop: { ianaTimezone: string; currencyCode: string }
  orders: {
    nodes: {
      name: string
      createdAt: string
      customer: { displayName: string } | null
      currentTotalPriceSet: { shopMoney: Money }
      lineItems: {
        nodes: {
          currentQuantity: number
          variant: { inventoryItem: { unitCost: Money | null } } | null
        }[]
      }
      transactions: { kind: string; status: string; fees: { amount: Money }[] }[]
    }[]
  }
  customers: {
    nodes: {
      id: string
      displayName: string
      defaultEmailAddress: { emailAddress: string } | null
      numberOfOrders: string
      amountSpent: Money
      lastOrder: { createdAt: string } | null
    }[]
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

export async function GET(request: Request): Promise<Response> {
  const password = process.env.DASHBOARD_PASSWORD
  const shop = process.env.SHOPIFY_STORE_DOMAIN
  const hasCredentials =
    !!process.env.SHOPIFY_ADMIN_TOKEN || (!!process.env.SHOPIFY_CLIENT_ID && !!process.env.SHOPIFY_CLIENT_SECRET)

  if (!shop || !hasCredentials || !password) {
    return Response.json({ error: 'not_configured' }, { status: 503 })
  }
  if (request.headers.get('x-dashboard-key') !== password) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const since = new Date(Date.now() - (DAYS + 1) * 86_400_000).toISOString()
    const data = await shopifyGraphql<QueryResult>(shop, QUERY, {
      ordersQuery: `created_at:>='${since}' (financial_status:paid OR financial_status:partially_refunded)`,
    })

    const tz = data.shop.ianaTimezone
    const dayKey = (iso: string | Date) =>
      new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
        new Date(iso),
      )
    const timeLabel = (iso: string) =>
      new Intl.DateTimeFormat('es-ES', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
    const relativeLabel = (iso: string) => {
      const diff = Math.round(
        (Date.parse(dayKey(new Date())) - Date.parse(dayKey(iso))) / 86_400_000,
      )
      if (diff === 0) return `Hoy, ${timeLabel(iso)}`
      if (diff === 1) return `Ayer, ${timeLabel(iso)}`
      return `Hace ${diff} días`
    }

    const feeRate = Number(process.env.FEE_RATE ?? 0.025)

    const orders = data.orders.nodes.map((o) => {
      const revenue = Number(o.currentTotalPriceSet.shopMoney.amount)
      const productCost = o.lineItems.nodes.reduce(
        (sum, li) => sum + li.currentQuantity * Number(li.variant?.inventoryItem.unitCost?.amount ?? 0),
        0,
      )
      const reportedFees = o.transactions
        .filter((t) => t.status === 'SUCCESS')
        .flatMap((t) => t.fees)
        .reduce((sum, f) => sum + Number(f.amount.amount), 0)
      const shopifyFee = reportedFees > 0 ? reportedFees : revenue * feeRate
      return {
        id: o.name,
        customer: o.customer?.displayName ?? 'Cliente invitado',
        createdAt: o.createdAt,
        revenue: round2(revenue),
        shopifyFee: round2(shopifyFee),
        productCost: round2(productCost),
        netProfit: round2(revenue - shopifyFee - productCost),
      }
    })

    // One bucket per day, oldest → today, in the shop's timezone.
    const weekday = new Intl.DateTimeFormat('es-ES', { timeZone: tz, weekday: 'short' })
    const dailyStats: DailyStat[] = Array.from({ length: DAYS }, (_, i) => {
      const date = new Date(Date.now() - (DAYS - 1 - i) * 86_400_000)
      const key = dayKey(date)
      const dayOrders = orders.filter((o) => dayKey(o.createdAt) === key)
      const sum = (f: 'revenue' | 'shopifyFee' | 'productCost' | 'netProfit') =>
        round2(dayOrders.reduce((s, o) => s + o[f], 0))
      const label = weekday.format(date).replace('.', '')
      return {
        date: i === DAYS - 1 ? 'Hoy' : label.charAt(0).toUpperCase() + label.slice(1),
        revenue: sum('revenue'),
        shopifyFee: sum('shopifyFee'),
        productCost: sum('productCost'),
        netProfit: sum('netProfit'),
      }
    })

    const recentOrders: RecentOrder[] = orders.slice(0, 8).map((o) => ({
      id: o.id,
      customer: o.customer,
      revenue: o.revenue,
      shopifyFee: o.shopifyFee,
      productCost: o.productCost,
      netProfit: o.netProfit,
      time: relativeLabel(o.createdAt),
    }))

    const customers: Customer[] = data.customers.nodes.map((c) => ({
      id: c.id,
      name: c.displayName || 'Sin nombre',
      email: c.defaultEmailAddress?.emailAddress ?? '',
      orders: Number(c.numberOfOrders),
      totalSpent: Number(c.amountSpent.amount),
      lastOrder: c.lastOrder ? relativeLabel(c.lastOrder.createdAt) : '—',
    }))

    return Response.json(
      { currency: data.shop.currencyCode, dailyStats, customers, recentOrders },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'shopify_error', message: (err as Error).message }, { status: 502 })
  }
}
