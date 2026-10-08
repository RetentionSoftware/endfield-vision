'use client'

import { EmptyState, Kbd, Modal, normalizeSearch, SearchInput, useAppShell } from 'endfield-vision'
import { CornerDownLeft, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { NAV } from '@/lib/nav'

const ITEMS = NAV.flatMap((g) => g.items.map((s) => ({ ...s, group: g.title ?? 'Консоль' })))

/** Быстрый переход по разделам: кнопка в шапке и Ctrl+K. */
export function CommandSearch() {
  const router = useRouter()
  const { mobile } = useAppShell()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const n = normalizeSearch(q)
    return n ? ITEMS.filter((s) => normalizeSearch(`${s.label} ${s.group}`).includes(n)) : ITEMS
  }, [q])

  const close = () => {
    setOpen(false)
    setQ('')
    setCursor(0)
  }

  const go = (href: string) => {
    close()
    router.push(href)
  }

  return (
    <>
      <button type="button" className="pg-search-trigger" onClick={() => setOpen(true)} aria-label="Поиск по разделам">
        <Search size={16} aria-hidden="true" />
        {!mobile ? (
          <>
            <span className="pg-search-trigger-text">Поиск по разделам</span>
            <span className="pg-search-trigger-kbd">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </>
        ) : null}
      </button>
      <Modal open={open} onClose={close} title="Переход к разделу" size="md">
        <div className="ev-stack">
          <SearchInput
            value={q}
            autoFocus
            onChange={(v) => {
              setQ(v)
              setCursor(0)
            }}
            placeholder="Название раздела"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setCursor((c) => Math.min(c + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setCursor((c) => Math.max(c - 1, 0))
              } else if (e.key === 'Enter' && results[cursor]) {
                e.preventDefault()
                go(results[cursor].href)
              }
            }}
          />
          {results.length === 0 ? (
            <EmptyState compact title="Ничего не найдено" description="Проверьте название раздела." />
          ) : (
            <ul role="list" className="pg-command-list">
              {results.map((s, i) => {
                const Icon = s.icon
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      className="pg-command-item"
                      data-active={i === cursor || undefined}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(s.href)}
                    >
                      <Icon size={17} aria-hidden="true" />
                      <span className="pg-command-label">{s.label}</span>
                      <span className="pg-command-group">{s.group}</span>
                      {i === cursor ? <CornerDownLeft size={14} aria-hidden="true" className="pg-command-enter" /> : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Modal>
    </>
  )
}
