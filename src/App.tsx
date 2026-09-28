import { createContext, useContext, useEffect, useMemo, useState, type FormEvent } from 'react'
import { getSavedKey, loadDashboard, saveKey, type LoadResult } from './api'
import { demoData, type Customer, type DailyStat, type DashboardData, type RecentOrder } from './data'

const moneyFormatter = (currency: string) => (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency, maximumFractionDigits: 2 })
const CurrencyContext = createContext(moneyFormatter('EUR'))
const useEuro = () => useContext(CurrencyContext)

const feePercent = (d: DailyStat) =>
  d.revenue > 0 ? `${((d.shopifyFee / d.revenue) * 100).toFixed(1)}%` : '—'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '◧', active: true },
  { label: 'Pedidos', icon: '🧾', active: false },
  { label: 'Clientes', icon: '👥', active: false },
  { label: 'Productos', icon: '📦', active: false },
  { label: 'Ajustes', icon: '⚙', active: false },
]

function Sidebar({ live }: { live: boolean }) {
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
          <p className="truncate text-[13px] font-medium text-white">
            {live ? 'Tienda conectada' : 'Sin tienda conectada'}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]">
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-[var(--green)]' : 'bg-amber-400'}`} />
            {live ? 'En vivo' : 'Datos de demo'}
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

function RevenueChart({ dailyStats }: { dailyStats: DailyStat[] }) {
  const width = 640
  const height = 200
  const padding = 24

  const max = Math.max(1, ...dailyStats.map((d) => d.revenue)) * 1.15

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

function BreakdownCard({ today }: { today: DailyStat }) {
  const euro = useEuro()
  const rows = [
    { label: 'Facturación bruta', value: today.revenue, color: 'text-white' },
    { label: `Comisiones (${feePercent(today)})`, value: -today.shopifyFee, color: 'text-red-400' },
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

function CustomersTable({ customers }: { customers: Customer[] }) {
  const euro = useEuro()
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
                  .slice(0, 2)
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

function RecentOrdersTable({ recentOrders }: { recentOrders: RecentOrder[] }) {
  const euro = useEuro()
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
      <p className="mb-4 text-[11px] font-medium tracking-wide text-[var(--text-dim)] uppercase">
        Últimos pedidos
      </p>
      {recentOrders.length === 0 && (
        <p className="py-6 text-center text-[13px] text-[var(--text-dim)]">Sin pedidos en los últimos 7 días</p>
      )}
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

function PasswordScreen({ wrong, onSubmit }: { wrong: boolean; onSubmit: (key: string) => void }) {
  const [value, setValue] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(value)
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="w-full max-w-[340px] rounded-xl border border-[var(--border)] bg-[var(--panel)] p-6"
      >
        <p className="text-[18px] font-bold text-white">Shopify Profit</p>
        <p className="mt-1 mb-5 text-[13px] text-[var(--text-dim)]">Introduce la contraseña del panel</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-[14px] text-white outline-none focus:border-[var(--green)]"
        />
        {wrong && <p className="mt-2 text-[12px] text-red-400">Contraseña incorrecta</p>}
        <button
          type="submit"
          className="mt-4 w-full rounded-lg bg-[var(--green)] py-2.5 text-[14px] font-semibold text-black"
        >
          Entrar
        </button>
      </form>
    </div>
  )
}

function Dashboard({ data, live }: { data: DashboardData; live: boolean }) {
  const { dailyStats, customers, recentOrders } = data
  const euro = useMemo(() => moneyFormatter(data.currency), [data.currency])
  const today = dailyStats[dailyStats.length - 1]
  const yesterday = dailyStats[dailyStats.length - 2]
  const vsYesterday =
    yesterday && yesterday.revenue > 0
      ? `${today.revenue >= yesterday.revenue ? '+' : ''}${Math.round(((today.revenue - yesterday.revenue) / yesterday.revenue) * 100)}% vs ayer`
      : 'Sin ventas ayer'

  const weekTotals = useMemo(
    () =>
      dailyStats.reduce(
        (acc, d) => ({
          revenue: acc.revenue + d.revenue,
          netProfit: acc.netProfit + d.netProfit,
        }),
        { revenue: 0, netProfit: 0 },
      ),
    [dailyStats],
  )

  return (
    <CurrencyContext.Provider value={euro}>
      <div className="flex min-h-screen">
        <Sidebar live={live} />

        <div className="flex-1">
          <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
            <div>
              <p className="text-[20px] font-bold text-white">Dashboard</p>
              <p className="text-[13px] text-[var(--text-dim)]">
                {live
                  ? 'Datos conectados directamente a tu tienda Shopify'
                  : 'Datos de demostración — conecta una tienda en Vercel'}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1.5 text-[12px] text-[var(--text-dim)]">
              <span className={`h-2 w-2 rounded-full ${live ? 'animate-pulse bg-[var(--green)]' : 'bg-amber-400'}`} />
              {live ? 'Sincronizado en vivo' : 'Demo'}
            </div>
          </header>

          <main className="flex flex-col gap-5 p-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard label="Facturación hoy" value={euro(today.revenue)} sub={vsYesterday} />
              <KpiCard
                label="Comisiones"
                value={`-${euro(today.shopifyFee)}`}
                sub={`${feePercent(today)} sobre ventas`}
              />
              <KpiCard label="Coste de producto" value={`-${euro(today.productCost)}`} sub="Coste neto hoy" />
              <KpiCard label="Profit neto hoy" value={euro(today.netProfit)} sub="Facturación − comisión − coste" accent />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
              <RevenueChart dailyStats={dailyStats} />
              <BreakdownCard today={today} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <CustomersTable customers={customers} />
              <RecentOrdersTable recentOrders={recentOrders} />
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 text-[12px] text-[var(--text-dim)]">
              Semana: {euro(weekTotals.revenue)} facturados · {euro(weekTotals.netProfit)} de profit
              neto acumulado
            </div>
          </main>
        </div>
      </div>
    </CurrencyContext.Provider>
  )
}

function App() {
  const [result, setResult] = useState<LoadResult | null>(null)

  const fetchData = (key: string) =>
    loadDashboard(key).then((r) => {
      if (r.status === 'live') saveKey(key)
      if (r.status === 'locked') saveKey('')
      setResult(r)
    })

  const load = (key: string) => {
    setResult(null)
    fetchData(key)
  }

  useEffect(() => {
    fetchData(getSavedKey())
  }, [])

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-[var(--text-dim)]">
        Cargando datos de la tienda…
      </div>
    )
  }
  if (result.status === 'locked') return <PasswordScreen wrong={result.wrongPassword} onSubmit={load} />
  if (result.status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-[16px] font-bold text-white">No se pudo leer la tienda</p>
        <p className="max-w-[520px] text-[12px] break-words text-[var(--text-dim)]">{result.message}</p>
        <button onClick={() => load(getSavedKey())} className="text-[13px] text-[var(--green)] hover:underline">
          Reintentar
        </button>
      </div>
    )
  }

  return <Dashboard data={result.status === 'live' ? result.data : demoData} live={result.status === 'live'} />
}

export default App
