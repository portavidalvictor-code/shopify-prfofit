// Shape mirrors what a real pipeline would store in Supabase after
// processing Shopify's `orders/paid` webhook through n8n:
// revenue, shopify_fee (2.5%), product_cost (from variant cost-per-item), net_profit.

export interface DailyStat {
  date: string
  revenue: number
  shopifyFee: number
  productCost: number
  netProfit: number
}

export interface Customer {
  id: string
  name: string
  email: string
  orders: number
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

export const dailyStats: DailyStat[] = [
  { date: 'Lun', revenue: 1240, shopifyFee: 31, productCost: 520, netProfit: 689 },
  { date: 'Mar', revenue: 1890, shopifyFee: 47.25, productCost: 780, netProfit: 1062.75 },
  { date: 'Mié', revenue: 1560, shopifyFee: 39, productCost: 640, netProfit: 881 },
  { date: 'Jue', revenue: 2140, shopifyFee: 53.5, productCost: 890, netProfit: 1196.5 },
  { date: 'Vie', revenue: 2680, shopifyFee: 67, productCost: 1080, netProfit: 1533 },
  { date: 'Sáb', revenue: 3420, shopifyFee: 85.5, productCost: 1380, netProfit: 1954.5 },
  { date: 'Hoy', revenue: 2050, shopifyFee: 51.25, productCost: 820, netProfit: 1178.75 },
]

export const customers: Customer[] = [
  { id: 'c1', name: 'Laura Gómez', email: 'laura.gomez@mail.com', orders: 6, totalSpent: 412.5, lastOrder: 'Hoy, 11:20' },
  { id: 'c2', name: 'Marc Ferrer', email: 'marc.ferrer@mail.com', orders: 3, totalSpent: 198.0, lastOrder: 'Hoy, 09:47' },
  { id: 'c3', name: 'Nuria Vidal', email: 'nuria.vidal@mail.com', orders: 11, totalSpent: 890.2, lastOrder: 'Ayer, 20:03' },
  { id: 'c4', name: 'Pau Soler', email: 'pau.soler@mail.com', orders: 1, totalSpent: 64.9, lastOrder: 'Ayer, 16:12' },
  { id: 'c5', name: 'Anna Ribas', email: 'anna.ribas@mail.com', orders: 8, totalSpent: 623.4, lastOrder: 'Hace 2 días' },
  { id: 'c6', name: 'Jordi Puig', email: 'jordi.puig@mail.com', orders: 2, totalSpent: 141.0, lastOrder: 'Hace 3 días' },
]

export const recentOrders: RecentOrder[] = [
  { id: '#3021', customer: 'Laura Gómez', revenue: 89.9, shopifyFee: 2.25, productCost: 36, netProfit: 51.65, time: '11:20' },
  { id: '#3020', customer: 'Marc Ferrer', revenue: 64.0, shopifyFee: 1.6, productCost: 26, netProfit: 36.4, time: '09:47' },
  { id: '#3019', customer: 'Anna Ribas', revenue: 128.5, shopifyFee: 3.21, productCost: 52, netProfit: 73.29, time: '08:52' },
  { id: '#3018', customer: 'Cliente nuevo', revenue: 45.0, shopifyFee: 1.13, productCost: 18, netProfit: 25.87, time: '08:10' },
]

export const feeRate = 0.025
