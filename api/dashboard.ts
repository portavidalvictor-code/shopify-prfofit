// Vercel Function: GET /api/dashboard
// Reads every paid order of the current month from the Shopify Admin GraphQL API
// and returns today's and this month's revenue, 2.5% Shopify fee, product cost,
// net profit, daily breakdown and what each customer has spent.
//
// Env vars (Vercel → Project → Settings → Environment Variables):
//   SHOPIFY_STORE_DOMAIN   tu-tienda.myshopify.com
//   SHOPIFY_CLIENT_ID      } app created by the store owner in dev.shopify.com
//   SHOPIFY_CLIENT_SECRET  } (client credentials grant, token renewed automatically)
//   SHOPIFY_ADMIN_TOKEN    alternative to the two above: a static shpat_ token
//   DASHBOARD_PASSWORD     password required to view the dashboard
//   FEE_RATE               optional, Shopify fee as a fraction (default 0.025 = 2.5%)
//   SHOPIFY_API_VERSION    optional, defaults to 2026-07

import type { Customer, DailyStat, DashboardData, RecentOrder, Totals } from '../src/data.ts'

const API_VERSION = process.env.SHOPIFY_API_VERSION || '2026-07'
const ORDERS_PER_PAGE = 30 // keeps each request under Shopify's 1000-point query cost limit
const MAX_PAGES = 100 // 3000 orders/month; beyond that the response is flagged `truncated`
const CACHE_MS = 60_000

let cachedToken: { value: string; expiresAt: number } | null = null
let cachedResponse: { data: DashboardData; at: number } | null = null

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const round2 = (n: number) => Math.round(n * 100) / 100

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
  if (!res.ok) throw new Error(`Shopify rechazó las credenciales (${res.status}): ${await res.text()}`)
  const json = (await res.json()) as { access_token: string; expires_in?: number }
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 86_399) * 1000,
  }
  return cachedToken.value
}

async function shopifyGraphql<T>(shop: string, query: string, variables: Record<string, unknown> = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const token = await getAccessToken(shop)
    const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) throw new Error(`Shopify API error (${res.status}): ${await res.text()}`)
    const json = (await res.json()) as { data?: T; errors?: { extensions?: { code?: string } }[] }
    const throttled = json.errors?.some((e) => e.extensions?.code === 'THROTTLED')
    if (throttled && attempt < 10) {
      await sleep(1000 * (attempt + 1))
      continue
    }
    if (json.errors || !json.data) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`)
    return json.data
  }
}

const SHOP_QUERY = /* GraphQL */ `
  query Shop {
    shop {
      ianaTimezone
      currencyCode
    }
  }
`

const ORDERS_QUERY = /* GraphQL */ `
  query Orders($query: String!, $after: String) {
    orders(first: ${ORDERS_PER_PAGE}, after: $after, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        name
        createdAt
        currentTotalPriceSet { shopMoney { amount } }
        customer {
          id
          displayName
          defaultEmailAddress { emailAddress }
          numberOfOrders
          amountSpent { amount }
        }
        lineItems(first: 20) {
          nodes {
            currentQuantity
            variant { id }
          }
        }
      }
    }
  }
`

const VARIANT_COSTS_QUERY = /* GraphQL */ `
  query VariantCosts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        inventoryItem { unitCost { amount } }
      }
    }
  }
`

interface Money { amount: string }
interface OrderNode {
  name: string
  createdAt: string
  currentTotalPriceSet: { shopMoney: Money }
  customer: {
    id: string
    displayName: string
    defaultEmailAddress: { emailAddress: string } | null
    numberOfOrders: string
    amountSpent: Money
  } | null
  lineItems: { nodes: { currentQuantity: number; variant: { id: string } | null }[] }
}
interface OrdersPage {
  orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: OrderNode[] }
}
interface VariantCosts {
  nodes: ({ id: string; inventoryItem: { unitCost: Money | null } } | null)[]
}

async function fetchMonthOrders(shop: string, since: string) {
  const query = `created_at:>='${since}' (financial_status:paid OR financial_status:partially_refunded)`
  const orders: OrderNode[] = []
  let after: string | null = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: OrdersPage = await shopifyGraphql<OrdersPage>(shop, ORDERS_QUERY, { query, after })
    orders.push(...data.orders.nodes)
    if (!data.orders.pageInfo.hasNextPage) return { orders, truncated: false }
    after = data.orders.pageInfo.endCursor
  }
  return { orders, truncated: true }
}

async function fetchVariantCosts(shop: string, ids: string[]) {
  const costs = new Map<string, number>()
  for (let i = 0; i < ids.length; i += 100) {
    const data = await shopifyGraphql<VariantCosts>(shop, VARIANT_COSTS_QUERY, { ids: ids.slice(i, i + 100) })
    for (const node of data.nodes) {
      if (node) costs.set(node.id, Number(node.inventoryItem.unitCost?.amount ?? 0))
    }
  }
  return costs
}

async function buildDashboard(shop: string): Promise<DashboardData> {
  const feeRate = Number(process.env.FEE_RATE ?? 0.025)
  const { shop: shopInfo } = await shopifyGraphql<{ shop: { ianaTimezone: string; currencyCode: string } }>(
    shop,
    SHOP_QUERY,
  )
  const tz = shopInfo.ianaTimezone

  const dayKey = (d: string | Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
      new Date(d),
    )
  const timeLabel = (iso: string) =>
    new Intl.DateTimeFormat('es-ES', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  const todayKey = dayKey(new Date())
  const monthKey = todayKey.slice(0, 7)
  const relativeLabel = (iso: string) => {
    const diff = Math.round((Date.parse(todayKey) - Date.parse(dayKey(iso))) / 86_400_000)
    if (diff === 0) return `Hoy, ${timeLabel(iso)}`
    if (diff === 1) return `Ayer, ${timeLabel(iso)}`
    return `Hace ${diff} días`
  }

  // Start one day early in UTC so no timezone can cut off the 1st; filtered by monthKey below.
  const since = new Date(Date.parse(`${monthKey}-01T00:00:00Z`) - 86_400_000).toISOString()
  const fetched = await fetchMonthOrders(shop, since)
  const monthOrders = fetched.orders.filter((o) => dayKey(o.createdAt).startsWith(monthKey))

  const variantIds = [
    ...new Set(monthOrders.flatMap((o) => o.lineItems.nodes.map((li) => li.variant?.id).filter((id) => id != null))),
  ]
  const unitCosts = await fetchVariantCosts(shop, variantIds)

  const orders = monthOrders.map((o) => {
    const revenue = Number(o.currentTotalPriceSet.shopMoney.amount)
    const productCost = o.lineItems.nodes.reduce(
      (sum, li) => sum + li.currentQuantity * (li.variant ? (unitCosts.get(li.variant.id) ?? 0) : 0),
      0,
    )
    const shopifyFee = revenue * feeRate
    return {
      o,
      day: dayKey(o.createdAt),
      revenue,
      shopifyFee,
      productCost,
      netProfit: revenue - shopifyFee - productCost,
    }
  })

  const sumTotals = (list: typeof orders): Totals => ({
    revenue: round2(list.reduce((s, x) => s + x.revenue, 0)),
    shopifyFee: round2(list.reduce((s, x) => s + x.shopifyFee, 0)),
    productCost: round2(list.reduce((s, x) => s + x.productCost, 0)),
    netProfit: round2(list.reduce((s, x) => s + x.netProfit, 0)),
    orders: list.length,
  })

  const todayDay = Number(todayKey.slice(8, 10))
  const dailyStats: DailyStat[] = Array.from({ length: todayDay }, (_, i) => {
    const key = `${monthKey}-${String(i + 1).padStart(2, '0')}`
    return { date: String(i + 1), ...sumTotals(orders.filter((x) => x.day === key)) }
  })

  const byCustomer = new Map<string, Customer & { lastAt: string }>()
  for (const x of orders) {
    const c = x.o.customer
    if (!c) continue
    const entry = byCustomer.get(c.id) ?? {
      id: c.id,
      name: c.displayName || 'Sin nombre',
      email: c.defaultEmailAddress?.emailAddress ?? '',
      monthOrders: 0,
      monthSpent: 0,
      totalOrders: Number(c.numberOfOrders),
      totalSpent: Number(c.amountSpent.amount),
      lastOrder: '',
      lastAt: '',
    }
    entry.monthOrders += 1
    entry.monthSpent = round2(entry.monthSpent + x.revenue)
    if (x.o.createdAt > entry.lastAt) entry.lastAt = x.o.createdAt
    byCustomer.set(c.id, entry)
  }
  const customers: Customer[] = [...byCustomer.values()]
    .sort((a, b) => b.monthSpent - a.monthSpent)
    .map(({ lastAt, ...c }) => ({ ...c, lastOrder: relativeLabel(lastAt) }))

  const recentOrders: RecentOrder[] = orders.slice(0, 10).map((x) => ({
    id: x.o.name,
    customer: x.o.customer?.displayName || 'Cliente invitado',
    revenue: round2(x.revenue),
    shopifyFee: round2(x.shopifyFee),
    productCost: round2(x.productCost),
    netProfit: round2(x.netProfit),
    time: relativeLabel(x.o.createdAt),
  }))

  const monthName = new Intl.DateTimeFormat('es-ES', { timeZone: tz, month: 'long' }).format(new Date())

  return {
    currency: shopInfo.currencyCode,
    feeRate,
    monthLabel: monthName.charAt(0).toUpperCase() + monthName.slice(1),
    today: sumTotals(orders.filter((x) => x.day === todayKey)),
    month: sumTotals(orders),
    dailyStats,
    customers,
    recentOrders,
    truncated: fetched.truncated,
    updatedAt: new Date().toISOString(),
  }
}

export async function GET(request: Request): Promise<Response> {
  const password = process.env.DASHBOARD_PASSWORD
  const shop = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  const hasCredentials =
    !!process.env.SHOPIFY_ADMIN_TOKEN || (!!process.env.SHOPIFY_CLIENT_ID && !!process.env.SHOPIFY_CLIENT_SECRET)

  if (!shop || !hasCredentials || !password) {
    return Response.json({ error: 'not_configured' }, { status: 503 })
  }
  if (request.headers.get('x-dashboard-key') !== password) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    if (!cachedResponse || Date.now() - cachedResponse.at > CACHE_MS) {
      cachedResponse = { data: await buildDashboard(shop), at: Date.now() }
    }
    return Response.json(cachedResponse.data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'shopify_error', message: (err as Error).message }, { status: 502 })
  }
}
