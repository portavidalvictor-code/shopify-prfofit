import { useEffect, useState } from 'react'

const euro = (n: number) => n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

type Row = {
  id: number
  name: string
  supplierCost: number // what the supplier charges per unit
  supplierShipping: number // what the supplier charges to ship it
  price: number // sale price, VAT included
}

type Settings = {
  feeRate: number // Shopify Payments %, as a decimal
  feeFixed: number // Shopify Payments fixed fee per order
  vatRate: number
  freeShippingFrom: number
  customerShipping: number // what the customer pays below the free-shipping threshold
}

const DEFAULT_SETTINGS: Settings = {
  feeRate: 0.025,
  feeFixed: 0.25,
  vatRate: 0.21,
  freeShippingFrom: 40,
  customerShipping: 4.95,
}

// Candidates already reviewed; supplier shipping is an estimate until confirmed
const DEFAULT_ROWS: Row[] = [
  { id: 1, name: 'Cama PAW 70 cm (AW Dropship)', supplierCost: 22.63, supplierShipping: 8, price: 59.9 },
  { id: 2, name: 'Arnés PAW cuarzo rosa (AW Dropship)', supplierCost: 18.63, supplierShipping: 5, price: 49.9 },
  { id: 3, name: 'Smartwatch Arona Pro (Dropea)', supplierCost: 9.99, supplierShipping: 5, price: 44.99 },
]

const STORAGE_KEY = 'profit-calculator-v1'

function loadState(): { rows: Row[]; settings: Settings } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (saved?.rows && saved?.settings) return { rows: saved.rows, settings: { ...DEFAULT_SETTINGS, ...saved.settings } }
  } catch {
    // Storage unavailable: start from defaults
  }
  return { rows: DEFAULT_ROWS, settings: DEFAULT_SETTINGS }
}

function calculate(row: Row, s: Settings) {
  const shippingCharged = row.price >= s.freeShippingFrom ? 0 : s.customerShipping
  const gross = row.price + shippingCharged
  const vat = gross - gross / (1 + s.vatRate)
  const fee = gross * s.feeRate + s.feeFixed
  const profit = gross - vat - fee - row.supplierCost - row.supplierShipping
  const totalCost = row.supplierCost + row.supplierShipping
  return {
    shippingCharged,
    vat,
    fee,
    profit,
    margin: gross > 0 ? profit / (gross - vat) : 0,
    multiplier: totalCost > 0 ? row.price / totalCost : 0,
  }
}

function verdict(profit: number) {
  if (profit >= 15) return { label: 'Buena', className: 'bg-[var(--green)]/15 text-[var(--green)]' }
  if (profit >= 8) return { label: 'Justa', className: 'bg-amber-400/15 text-amber-300' }
  return { label: 'No compensa', className: 'bg-red-400/15 text-red-300' }
}

function NumberInput({ value, onChange, step = 0.01, suffix }: { value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <label className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 focus-within:border-[var(--green)]">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className="w-full min-w-0 bg-transparent text-right text-[13px] text-white outline-none"
      />
      {suffix && <span className="text-[12px] text-[var(--text-dim)]">{suffix}</span>}
    </label>
  )
}

export function Calculator() {
  const [{ rows, settings }, setState] = useState(loadState)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows, settings }))
    } catch {
      // Not persisted; the calculator still works for this visit
    }
  }, [rows, settings])

  const setRows = (next: Row[]) => setState((s) => ({ ...s, rows: next }))
  const updateRow = (id: number, patch: Partial<Row>) => setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const updateSettings = (patch: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
  const addRow = () =>
    setRows([...rows, { id: Math.max(0, ...rows.map((r) => r.id)) + 1, name: '', supplierCost: 0, supplierShipping: 0, price: 0 }])

  return (
    <main className="flex flex-col gap-5 p-6">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5">
        <p className="text-[11px] font-medium tracking-wide text-[var(--text-dim)] uppercase">Ajustes de la tienda</p>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-5">
          {[
            { label: 'Comisión Shopify', value: settings.feeRate * 100, suffix: '%', set: (n: number) => updateSettings({ feeRate: n / 100 }) },
            { label: 'Comisión fija por pedido', value: settings.feeFixed, suffix: '€', set: (n: number) => updateSettings({ feeFixed: n }) },
            { label: 'IVA', value: settings.vatRate * 100, suffix: '%', set: (n: number) => updateSettings({ vatRate: n / 100 }) },
            { label: 'Envío gratis desde', value: settings.freeShippingFrom, suffix: '€', set: (n: number) => updateSettings({ freeShippingFrom: n }) },
            { label: 'Envío que paga el cliente', value: settings.customerShipping, suffix: '€', set: (n: number) => updateSettings({ customerShipping: n }) },
          ].map((f) => (
            <div key={f.label}>
              <p className="mb-1 text-[12px] text-[var(--text-dim)]">{f.label}</p>
              <NumberInput value={Math.round(f.value * 100) / 100} onChange={f.set} suffix={f.suffix} />
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--panel)]">
        <table className="w-full min-w-[980px] text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[11px] tracking-wide text-[var(--text-dim)] uppercase">
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-2 py-3 font-medium">Coste proveedor</th>
              <th className="px-2 py-3 font-medium">Envío proveedor</th>
              <th className="px-2 py-3 font-medium">Precio de venta</th>
              <th className="px-2 py-3 text-right font-medium">IVA</th>
              <th className="px-2 py-3 text-right font-medium">Comisión</th>
              <th className="px-2 py-3 text-right font-medium">Beneficio</th>
              <th className="px-2 py-3 text-right font-medium">Margen</th>
              <th className="px-2 py-3 text-right font-medium">x Coste</th>
              <th className="px-4 py-3 font-medium">Veredicto</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const r = calculate(row, settings)
              const v = verdict(r.profit)
              return (
                <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-2">
                    <input
                      value={row.name}
                      placeholder="Nombre del producto"
                      onChange={(e) => updateRow(row.id, { name: e.target.value })}
                      className="w-full min-w-[200px] rounded-md border border-transparent bg-transparent px-2 py-1.5 text-white outline-none focus:border-[var(--green)]"
                    />
                  </td>
                  <td className="w-[110px] px-2 py-2">
                    <NumberInput value={row.supplierCost} onChange={(n) => updateRow(row.id, { supplierCost: n })} suffix="€" />
                  </td>
                  <td className="w-[110px] px-2 py-2">
                    <NumberInput value={row.supplierShipping} onChange={(n) => updateRow(row.id, { supplierShipping: n })} suffix="€" />
                  </td>
                  <td className="w-[110px] px-2 py-2">
                    <NumberInput value={row.price} onChange={(n) => updateRow(row.id, { price: n })} suffix="€" />
                  </td>
                  <td className="px-2 py-2 text-right text-red-300">-{euro(r.vat)}</td>
                  <td className="px-2 py-2 text-right text-red-300">-{euro(r.fee)}</td>
                  <td className={`px-2 py-2 text-right font-bold ${r.profit >= 0 ? 'text-[var(--green)]' : 'text-red-400'}`}>
                    {euro(r.profit)}
                  </td>
                  <td className="px-2 py-2 text-right text-[var(--text-dim)]">{Math.round(r.margin * 100)}%</td>
                  <td className="px-2 py-2 text-right text-[var(--text-dim)]">{r.multiplier.toFixed(1)}x</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${v.className}`}>{v.label}</span>
                  </td>
                  <td className="pr-3">
                    <button
                      onClick={() => setRows(rows.filter((x) => x.id !== row.id))}
                      aria-label={`Quitar ${row.name || 'producto'}`}
                      className="rounded-md px-2 py-1 text-[var(--text-dim)] hover:bg-white/5 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-3">
          <button onClick={addRow} className="rounded-lg bg-[var(--green)] px-4 py-2 text-[13px] font-semibold text-black">
            + Añadir producto
          </button>
          <button
            onClick={() => setState({ rows: DEFAULT_ROWS, settings: DEFAULT_SETTINGS })}
            className="text-[12px] text-[var(--text-dim)] hover:text-white"
          >
            Restablecer ejemplos
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 text-[12px] leading-relaxed text-[var(--text-dim)] md:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <p className="mb-1 font-semibold text-white">Beneficio</p>
          Lo que te queda por venta <strong>antes de anuncios</strong>: precio + envío cobrado − IVA − comisión − coste −
          envío del proveedor. Es también lo <strong>máximo que puedes gastar en anuncios</strong> por venta sin perder
          dinero.
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <p className="mb-1 font-semibold text-white">Veredicto</p>
          <strong className="text-[var(--green)]">Buena</strong>: 15 € o más por venta. <strong className="text-amber-300">Justa</strong>:
          8-15 €, solo con anuncios muy baratos. <strong className="text-red-300">No compensa</strong>: menos de 8 €.
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <p className="mb-1 font-semibold text-white">x Coste</p>
          Precio de venta dividido entre lo que te cuesta el producto con su envío. En dropshipping se busca{' '}
          <strong>3x o más</strong>.
        </div>
      </section>
    </main>
  )
}
