'use client'

import { Button, PageHeader, StatTile, TabPanel, Tabs, toast, useModals } from 'endfield-vision'
import { AlertTriangle, ClipboardCheck, Package, Truck, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SHIPMENTS, STOCK, stockState, TRANSFERS, WAREHOUSES, type Shipment, type StockItem, type Transfer } from '@/lib/demo/inventory'
import { useCrumbs, useT } from '@/lib/i18n'
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
  const { t, plural, formatNum, formatRub } = useT()
  const breadcrumbs = useCrumbs('inventory')
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
      title: t('Назначить инвентаризацию?', 'Schedule a stock count?'),
      message: t(
        'Все склады: 12.10.2026 с 08:00 до 14:00. На это время движения по складам блокируются, приёмка поставок переносится.',
        'All warehouses: 12.10.2026 from 08:00 to 14:00. Stock movements are blocked for that time, and receiving of deliveries is postponed.',
      ),
      okLabel: t('Назначить', 'Schedule'),
      okIcon: <ClipboardCheck size={15} />,
    })
    if (ok)
      toast.success(t('Инвентаризация назначена', 'Stock count scheduled'), {
        description: t('12.10.2026, 08:00-14:00. Ответственные получили уведомление.', '12.10.2026, 08:00-14:00. The people in charge have been notified.'),
      })
  }

  return (
    <>
      <PageHeader
        title={t('Склад', 'Inventory')}
        subtitle={t('Остатки по складам, входящие поставки и перемещения.', 'Stock by warehouse, incoming deliveries and transfers.')}
        breadcrumbs={breadcrumbs}
        actions={
          <Button icon={<ClipboardCheck size={15} />} onClick={() => void scheduleCount()}>
            {t('Инвентаризация', 'Stock count')}
          </Button>
        }
      />

      <div className={s.page}>
        <div className="ev-grid" style={{ ['--ev-grid-min' as string]: '220px' }}>
          <StatTile
            label={t('Позиций на складах', 'Items in stock')}
            value={formatNum(items.length)}
            icon={<Package size={16} />}
            hint={t(`${WAREHOUSES.length} склада, 6 категорий`, `${WAREHOUSES.length} warehouses, 6 categories`)}
          />
          <StatTile
            label={t('Мало или нет', 'Low or out')}
            value={formatNum(stats.low)}
            icon={<AlertTriangle size={16} />}
            tone="warning"
            hint={`${t('Нет в наличии', 'Out of stock')}: ${stats.out} ${plural(stats.out, ['позиция', 'позиции', 'позиций'], ['item', 'items'])}`}
          />
          <StatTile
            label={t('Стоимость запасов', 'Stock value')}
            value={formatRub(stats.value)}
            icon={<Wallet size={16} />}
            tone="success"
            hint={t('По учётной цене', 'At book price')}
          />
          <StatTile
            label={t('Ожидаются поставки', 'Expected deliveries')}
            value={formatNum(stats.pending)}
            icon={<Truck size={16} />}
            tone="info"
            hint={
              t(`На ${formatRub(stats.pendingValue)}`, `Worth ${formatRub(stats.pendingValue)}`) +
              (stats.delayed ? t(`, задерживается: ${stats.delayed}`, `, delayed: ${stats.delayed}`) : '')
            }
          />
        </div>

        <Tabs
          idBase={ID_BASE}
          aria-label={t('Разделы склада', 'Inventory sections')}
          value={tab}
          onChange={setTab}
          items={[
            { value: 'stock', label: t('Остатки', 'Stock'), count: items.length },
            { value: 'shipments', label: t('Поставки', 'Deliveries'), count: stats.pending },
            { value: 'transfers', label: t('Перемещения', 'Transfers') },
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
              onChange={(id, patch) => setTransfers((list) => list.map((tr) => (tr.id === id ? { ...tr, ...patch } : tr)))}
              onCreate={(tr) => setTransfers((list) => [tr, ...list])}
            />
          </TabPanel>
        ) : null}
      </div>
    </>
  )
}
