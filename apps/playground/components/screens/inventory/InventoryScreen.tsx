'use client'

import { Button, PageHeader, StatTile, TabPanel, Tabs, toast, useModals } from 'endfield-vision'
import { AlertTriangle, ClipboardCheck, Package, Truck, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SHIPMENTS, STOCK, stockState, TRANSFERS, WAREHOUSES, type Shipment, type StockItem, type Transfer } from '@/lib/demo/inventory'
import { formatNum, formatRub, plural } from '@/lib/format'
import { crumbs } from '@/lib/nav'
import { useUrlTab } from '@/lib/use-url-state'
import { ShipmentsTab } from './ShipmentsTab'
import { StockTab } from './StockTab'
import { TransfersTab } from './TransfersTab'
import s from './inventory.module.css'

const TABS = ['stock', 'shipments', 'transfers'] as const
type InventoryTab = (typeof TABS)[number]

const ID_BASE = 'inventory'

export function InventoryScreen() {
  const modals = useModals()
  const [tab, setTab] = useUrlTab<InventoryTab>(TABS, 'stock')
  const [items, setItems] = useState<StockItem[]>(STOCK)
  const [shipments, setShipments] = useState<Shipment[]>(SHIPMENTS)
  const [transfers, setTransfers] = useState<Transfer[]>(TRANSFERS)

  const stats = useMemo(() => {
    const low = items.filter((it) => stockState(it) !== 'ok')
    const pending = shipments.filter((sh) => sh.status !== 'accepted' && sh.status !== 'rejected')
    return {
      low: low.length,
      out: low.filter((it) => it.qty === 0).length,
      value: items.reduce((a, it) => a + it.qty * it.price, 0),
      pending: pending.length,
      pendingValue: pending.reduce((a, sh) => a + sh.value, 0),
      delayed: pending.filter((sh) => sh.status === 'delayed').length,
    }
  }, [items, shipments])

  const scheduleCount = async () => {
    const ok = await modals.confirm({
      title: 'Назначить инвентаризацию?',
      message: 'Все склады: 12.10.2026 с 08:00 до 14:00. На это время движения по складам блокируются, приёмка поставок переносится.',
      okLabel: 'Назначить',
      okIcon: <ClipboardCheck size={15} />,
    })
    if (ok) toast.success('Инвентаризация назначена', { description: '12.10.2026, 08:00-14:00. Ответственные получили уведомление.' })
  }

  return (
    <>
      <PageHeader
        title="Склад"
        subtitle="Остатки по складам, входящие поставки и перемещения."
        breadcrumbs={crumbs('inventory')}
        actions={
          <Button icon={<ClipboardCheck size={15} />} onClick={() => void scheduleCount()}>
            Инвентаризация
          </Button>
        }
      />

      <div className={s.page}>
        <div className="ev-grid" style={{ ['--ev-grid-min' as string]: '220px' }}>
          <StatTile label="Позиций на складах" value={formatNum(items.length)} icon={<Package size={16} />} hint={`${WAREHOUSES.length} склада, 6 категорий`} />
          <StatTile
            label="Мало или нет"
            value={formatNum(stats.low)}
            icon={<AlertTriangle size={16} />}
            tone="warning"
            hint={`Нет в наличии: ${stats.out} ${plural(stats.out, 'позиция', 'позиции', 'позиций')}`}
          />
          <StatTile label="Стоимость запасов" value={formatRub(stats.value)} icon={<Wallet size={16} />} tone="success" hint="По учётной цене" />
          <StatTile
            label="Ожидаются поставки"
            value={formatNum(stats.pending)}
            icon={<Truck size={16} />}
            tone="info"
            hint={`На ${formatRub(stats.pendingValue)}${stats.delayed ? `, задерживается: ${stats.delayed}` : ''}`}
          />
        </div>

        <Tabs
          idBase={ID_BASE}
          aria-label="Разделы склада"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'stock', label: 'Остатки', count: items.length },
            { value: 'shipments', label: 'Поставки', count: stats.pending },
            { value: 'transfers', label: 'Перемещения' },
          ]}
        />

        {tab === 'stock' ? (
          <TabPanel idBase={ID_BASE} value="stock">
            <StockTab
              items={items}
              onChangeQty={(id, qty) => setItems((list) => list.map((it) => (it.id === id ? { ...it, qty, movedAt: '2026-10-08' } : it)))}
              onWriteOff={(ids) => setItems((list) => list.map((it) => (ids.includes(it.id) ? { ...it, qty: 0, movedAt: '2026-10-08' } : it)))}
            />
          </TabPanel>
        ) : null}
        {tab === 'shipments' ? (
          <TabPanel idBase={ID_BASE} value="shipments">
            <ShipmentsTab shipments={shipments} onAccept={(id) => setShipments((list) => list.map((sh) => (sh.id === id ? { ...sh, status: 'accepted' } : sh)))} />
          </TabPanel>
        ) : null}
        {tab === 'transfers' ? (
          <TabPanel idBase={ID_BASE} value="transfers">
            <TransfersTab
              transfers={transfers}
              onChange={(id, patch) => setTransfers((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)))}
              onCreate={(t) => setTransfers((list) => [t, ...list])}
            />
          </TabPanel>
        ) : null}
      </div>
    </>
  )
}
