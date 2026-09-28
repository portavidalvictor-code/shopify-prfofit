import { useMemo } from 'react'
import { customers, dailyStats, feeRate, recentOrders } from './data'

const euro = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '◧', active: true },
  { label: 'Pedidos', icon: '🧾', active: false },
  { label: 'Clientes', icon: '👥', active: false },
  { label: 'Productos', icon: '📦', active: false },
  { label: 'Ajustes', icon: '⚙', active: false },
]

function Sidebar() {
  return (
    <aside className="hidden w-[240px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)] px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--green)] text-[18px] font-bold text-black">
          S
        </div>
        <div>
          <p className="text-[15px] font-bold leading-tight text-white">Shopify Profit</p>
          <p className="text-[11px] tracking-wide text-[var(--text-dim)]">by Nexus</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href="#"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
              item.active
                ? 'bg-[var(--green)]/10 text-[var(--green)]'
                : 'text-[var(--text-dim)] hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-[15px]">{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-lg border border-[var(--border)] px-3 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--green)]/20 text-[13px] font-bold text-[var(--green)]">
          V
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-white">Tienda conectada</p>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />
            En vivo
          </p>
        </div>
      </div>
    </aside>
  )
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <p className="text-[11px] font-medium tracking-wide text-[var(--text-dim)] uppercase">
        {label}
      </p>
      <p
        className={`mt-2 text-[26px] font-bold ${accent ? 'text-[var(--green)]' : 'text-white'}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[12px] text-[var(--text-dim)]">{sub}</p>
    </div>
  )
}

function RevenueChart() {
  const width = 640
  const height = 200
  const padding = 24

  const max = Math.max(...dailyStats.map((d) => d.revenue)) * 1.15

  const points = dailyStats.map((d, i) => {
    const x = padding + (i / (dailyStats.length - 1)) * (width - padding * 2)
    const y = height - padding - (d.revenue / max) * (height - padding * 2)
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`

  const profitMax = max
  const profitPoints = dailyStats.map((d, i) => {
    const x = padding + (i / (dailyStats.length - 1)) * (width - padding * 2)
    const y = height - padding - (d.netProfit / profitMax) * (height - padding * 2)
    return { x, y }
  })
  const profitPath = profitPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-wide text-[var(--text-dim)] uppercase">
            Facturación vs Profit neto
          </p>
          <p className="mt-1 text-[20px] font-bold text-white">Últimos 7 días</p>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-[var(--text-dim)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--green)]" /> Facturación
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#6ea8fe]" /> Profit neto
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3a0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#22d3a0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#revFill)" />
        <path d={linePath} fill="none" stroke="#22d3a0" strokeWidth="2" />
        <path d={profitPath} fill="none" stroke="#6ea8fe" strokeWidth="2" strokeDasharray="4 3" />
        {points.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r="3" fill="#22d3a0" />
        ))}
      </svg>

      <div className="mt-1 flex justify-between text-[11px] text-[var(--text-dim)]">
        {dailyStats.map((d) => (
          <span key={d.date}>{d.date}</span>
        ))}
      </div>
    </div>
  )
}

function BreakdownCard() {
  const today = dailyStats[dailyStats.length - 1]
  const rows = [
    { label: 'Facturación bruta', value: today.revenue, color: 'text-white' },
    { label: `Comisión Shopify (${(feeRate * 100).toFixed(1)}%)`, value: -today.shopifyFee, color: 'text-red-400' },
    { label: 'Coste de producto', value: -today.productCost, color: 'text-red-400' },
  ]

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <p className="mb-4 text-[11px] font-medium tracking-wide text-[var(--text-dim)] uppercase">
        Desglose de hoy
      </p>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-[13px]">
            <span className="text-[var(--text-dim)]">{row.label}</span>
            <span className={row.color}>
              {row.value < 0 ? '-' : ''}
              {euro(Math.abs(row.value))}
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[15px] font-bold">
          <span className="text-white">Profit neto</span>
          <span className="text-[var(--green)]">{euro(today.netProfit)}</span>
        </div>
      </div>
    </div>
  )
}

function CustomersTable() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[11px] font-medium tracking-wide text-[var(--text-dim)] uppercase">
          Clientes ({customers.length})
        </p>
        <a href="#" className="text-[12px] text-[var(--green)] hover:underline">
          Ver todos
        </a>
      </div>
      <div className="flex flex-col">
        {customers.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between border-b border-[var(--border)] py-3 last:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[12px] font-semibold text-white">
                {c.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </div>
              <div>
                <p className="text-[13px] font-medium text-white">{c.name}</p>
                <p className="text-[11px] text-[var(--text-dim)]">{c.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-semibold text-white">{euro(c.totalSpent)}</p>
              <p className="text-[11px] text-[var(--text-dim)]">
                {c.orders} pedidos · {c.lastOrder}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RecentOrdersTable() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <p className="mb-4 text-[11px] font-medium tracking-wide text-[var(--text-dim)] uppercase">
        Últimos pedidos (en vivo)
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-[11px] tracking-wide text-[var(--text-dim)] uppercase">
              <th className="pb-2 font-medium">Pedido</th>
              <th className="pb-2 font-medium">Cliente</th>
              <th className="pb-2 font-medium text-right">Ingreso</th>
              <th className="pb-2 font-medium text-right">Comisión</th>
              <th className="pb-2 font-medium text-right">Coste</th>
              <th className="pb-2 font-medium text-right">Profit</th>
              <th className="pb-2 font-medium text-right">Hora</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.id} className="border-t border-[var(--border)]">
                <td className="py-2.5 text-[var(--green)]">{o.id}</td>
                <td className="py-2.5 text-white">{o.customer}</td>
                <td className="py-2.5 text-right text-white">{euro(o.revenue)}</td>
                <td className="py-2.5 text-right text-red-400">-{euro(o.shopifyFee)}</td>
                <td className="py-2.5 text-right text-red-400">-{euro(o.productCost)}</td>
                <td className="py-2.5 text-right font-semibold text-[var(--green)]">
                  {euro(o.netProfit)}
                </td>
                <td className="py-2.5 text-right text-[var(--text-dim)]">{o.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function App() {
  const today = dailyStats[dailyStats.length - 1]

  const weekTotals = useMemo(
    () =>
      dailyStats.reduce(
        (acc, d) => ({
          revenue: acc.revenue + d.revenue,
          netProfit: acc.netProfit + d.netProfit,
        }),
        { revenue: 0, netProfit: 0 },
      ),
    [],
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <p className="text-[20px] font-bold text-white">Dashboard</p>
            <p className="text-[13px] text-[var(--text-dim)]">
              Datos conectados directamente a tu tienda Shopify
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-dim)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--green)]" />
            Sincronizado en vivo
          </div>
        </header>

        <main className="flex flex-col gap-5 p-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard label="Facturación hoy" value={euro(today.revenue)} sub="+18% vs ayer" />
            <KpiCard
              label="Comisión Shopify"
              value={`-${euro(today.shopifyFee)}`}
              sub={`${(feeRate * 100).toFixed(1)}% sobre ventas`}
            />
            <KpiCard label="Coste de producto" value={`-${euro(today.productCost)}`} sub="Coste neto hoy" />
            <KpiCard label="Profit neto hoy" value={euro(today.netProfit)} sub="Facturación − comisión − coste" accent />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
            <RevenueChart />
            <BreakdownCard />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CustomersTable />
            <RecentOrdersTable />
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-[12px] text-[var(--text-dim)]">
            Semana: {euro(weekTotals.revenue)} facturados · {euro(weekTotals.netProfit)} de profit
            neto acumulado
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
