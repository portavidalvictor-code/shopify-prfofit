// Shapes returned by /api/dashboard (see api/dashboard.ts).
// demoData below is shown until a real store is connected.

export interface Totals {
  revenue: number
  shopifyFee: number
  productCost: number
  netProfit: number
  orders: number
}

export interface DailyStat extends Totals {
  date: string // day of month label, e.g. "14"
}

export interface Customer {
  id: string
  name: string
  email: string
  monthOrders: number
  monthSpent: number
  totalOrders: number
  totalSpent: number
  lastOrder: string
}

export interface RecentOrder {
  id: string
  customer: string
  revenue: number
  shopifyFee: number
  productCost: number
  netProfit: number
  time: string
}

export interface DashboardData {
  currency: string
  feeRate: number
  monthLabel: string
  today: Totals
  month: Totals
  dailyStats: DailyStat[] // every day of the current month up to today
  customers: Customer[] // everyone who bought this month, highest spend first
  recentOrders: RecentOrder[]
  truncated: boolean // true if the month had more orders than the API reads in one go
  updatedAt: string
}

const FEE = 0.025
const round2 = (n: number) => Math.round(n * 100) / 100

function totals(revenue: number, productCost: number, orders: number): Totals {
  const shopifyFee = round2(revenue * FEE)
  return { revenue, shopifyFee, productCost, netProfit: round2(revenue - shopifyFee - productCost), orders }
}

const demoRevenue = [1240, 1890, 1560, 2140, 2680, 3420, 2050, 1320, 1980, 1710, 2260, 2890, 3150, 2050]
const dailyStats: DailyStat[] = demoRevenue.map((revenue, i) => ({
  date: String(i + 1),
  ...totals(revenue, round2(revenue * 0.41), Math.round(revenue / 68)),
}))

const sum = (key: keyof Totals) => round2(dailyStats.reduce((s, d) => s + d[key], 0))

export const demoData: DashboardData = {
  currency: 'EUR',
  feeRate: FEE,
  monthLabel: 'Este mes',
  today: dailyStats[dailyStats.length - 1],
  month: {
    revenue: sum('revenue'),
    shopifyFee: sum('shopifyFee'),
    productCost: sum('productCost'),
    netProfit: sum('netProfit'),
    orders: sum('orders'),
  },
  dailyStats,
  customers: [
    { id: 'c3', name: 'Nuria Vidal', email: 'nuria.vidal@mail.com', monthOrders: 4, monthSpent: 312.4, totalOrders: 11, totalSpent: 890.2, lastOrder: 'Ayer, 20:03' },
    { id: 'c5', name: 'Anna Ribas', email: 'anna.ribas@mail.com', monthOrders: 3, monthSpent: 248.5, totalOrders: 8, totalSpent: 623.4, lastOrder: 'Hoy, 08:52' },
    { id: 'c1', name: 'Laura Gómez', email: 'laura.gomez@mail.com', monthOrders: 2, monthSpent: 179.8, totalOrders: 6, totalSpent: 412.5, lastOrder: 'Hoy, 11:20' },
    { id: 'c6', name: 'Jordi Puig', email: 'jordi.puig@mail.com', monthOrders: 2, monthSpent: 141.0, totalOrders: 2, totalSpent: 141.0, lastOrder: 'Hace 3 días' },
    { id: 'c2', name: 'Marc Ferrer', email: 'marc.ferrer@mail.com', monthOrders: 1, monthSpent: 64.0, totalOrders: 3, totalSpent: 198.0, lastOrder: 'Hoy, 09:47' },
    { id: 'c4', name: 'Pau Soler', email: 'pau.soler@mail.com', monthOrders: 1, monthSpent: 64.9, totalOrders: 1, totalSpent: 64.9, lastOrder: 'Ayer, 16:12' },
  ],
  recentOrders: [
    { id: '#3021', customer: 'Laura Gómez', revenue: 89.9, shopifyFee: 2.25, productCost: 36, netProfit: 51.65, time: 'Hoy, 11:20' },
    { id: '#3020', customer: 'Marc Ferrer', revenue: 64.0, shopifyFee: 1.6, productCost: 26, netProfit: 36.4, time: 'Hoy, 09:47' },
    { id: '#3019', customer: 'Anna Ribas', revenue: 128.5, shopifyFee: 3.21, productCost: 52, netProfit: 73.29, time: 'Hoy, 08:52' },
    { id: '#3018', customer: 'Cliente invitado', revenue: 45.0, shopifyFee: 1.13, productCost: 18, netProfit: 25.87, time: 'Hoy, 08:10' },
  ],
  truncated: false,
  updatedAt: new Date().toISOString(),
}
