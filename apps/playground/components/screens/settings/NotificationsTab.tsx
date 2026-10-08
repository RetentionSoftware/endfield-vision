'use client'

import { Button, Callout, Card, Checkbox, Field, Input, Switch, toast } from 'endfield-vision'
import { Moon, RotateCcw, Save } from 'lucide-react'
import { useState } from 'react'
import { CHANNELS, LOCKED_RULES, NOTIFICATION_GROUPS, type ChannelId } from '@/lib/demo/settings'
import { plural } from '@/lib/format'
import s from './settings.module.css'

interface NotifyState {
  rules: Record<string, boolean>
  channels: Record<ChannelId, boolean>
  quiet: { on: boolean; from: string; to: string }
}

const INITIAL: NotifyState = {
  rules: Object.fromEntries(NOTIFICATION_GROUPS.flatMap((g) => g.rules.map((r) => [r.id, r.on]))),
  channels: { email: true, push: true, sms: false, messenger: false },
  quiet: { on: true, from: '22:00', to: '07:00' },
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

function same(a: NotifyState, b: NotifyState): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function NotificationsTab() {
  const [saved, setSaved] = useState<NotifyState>(INITIAL)
  const [state, setState] = useState<NotifyState>(INITIAL)
  const [saving, setSaving] = useState(false)

  const dirty = !same(saved, state)
  const noChannels = !Object.values(state.channels).some(Boolean)
  const quietInvalid = state.quiet.on && (!state.quiet.from || !state.quiet.to || state.quiet.from === state.quiet.to)
  const enabledCount = Object.values(state.rules).filter(Boolean).length

  const setRule = (id: string, on: boolean) => setState((st) => ({ ...st, rules: { ...st.rules, [id]: on } }))
  const setChannel = (id: ChannelId, on: boolean) => setState((st) => ({ ...st, channels: { ...st.channels, [id]: on } }))
  const setQuiet = (patch: Partial<NotifyState['quiet']>) => setState((st) => ({ ...st, quiet: { ...st.quiet, ...patch } }))

  const save = async () => {
    setSaving(true)
    await wait(700)
    setSaved(state)
    setSaving(false)
    toast.success('Настройки уведомлений сохранены', {
      description: `Включено ${enabledCount} ${plural(enabledCount, 'событие', 'события', 'событий')}`,
    })
  }

  return (
    <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
      <div className="pg-split">
        <Card title="События" description={`Включено ${enabledCount} из ${Object.keys(state.rules).length}`}>
          <div className={s.groups}>
            {NOTIFICATION_GROUPS.map((g) => (
              <section key={g.id} className={s.group} aria-labelledby={`ng-${g.id}`}>
                <header className={s.groupHead}>
                  <h3 id={`ng-${g.id}`} className={s.groupTitle}>
                    {g.title}
                  </h3>
                  <p className="ev-muted">{g.description}</p>
                </header>
                <div className={s.switches}>
                  {g.rules.map((r) => (
                    <Switch
                      key={r.id}
                      checked={state.rules[r.id] ?? false}
                      onChange={(v) => setRule(r.id, v)}
                      label={r.label}
                      description={r.description}
                      disabled={LOCKED_RULES.has(r.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Card>

        <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
          <Card title="Каналы" description="Куда доставлять включённые события.">
            <div className={s.switches}>
              {CHANNELS.map((c) => (
                <Checkbox key={c.id} checked={state.channels[c.id]} onChange={(v) => setChannel(c.id, v)} label={c.label} description={c.description} />
              ))}
              {noChannels ? (
                <Callout tone="warning" title="Не выбран ни один канал">
                  Уведомления будут видны только во входящих консоли.
                </Callout>
              ) : null}
            </div>
          </Card>

          <Card title="Тихие часы" icon={<Moon size={16} />} description="Без звука и push, кроме критических инцидентов.">
            <div className="ev-stack">
              <Switch checked={state.quiet.on} onChange={(v) => setQuiet({ on: v })} label="Включить тихие часы" />
              <div className={s.timeRow}>
                <Field label="С" error={quietInvalid ? 'Интервал не задан' : undefined} disabled={!state.quiet.on}>
                  <Input type="time" step={300} value={state.quiet.from} onChange={(e) => setQuiet({ from: e.target.value })} />
                </Field>
                <Field label="До" disabled={!state.quiet.on}>
                  <Input type="time" step={300} value={state.quiet.to} onChange={(e) => setQuiet({ to: e.target.value })} />
                </Field>
              </div>
              {state.quiet.on && !quietInvalid ? (
                <p className={s.note}>
                  Ежедневно с {state.quiet.from} до {state.quiet.to}
                  {state.quiet.from > state.quiet.to ? ' следующего дня' : ''} по часовому поясу профиля.
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      {dirty ? (
        <div className={s.saveBar} role="region" aria-label="Несохранённые изменения">
          <span>Есть несохранённые изменения</span>
          <div className="ev-row">
            <Button variant="ghost" icon={<RotateCcw size={15} />} disabled={saving} onClick={() => setState(saved)}>
              Отменить
            </Button>
            <Button variant="primary" icon={<Save size={15} />} loading={saving} disabled={quietInvalid} onClick={() => void save()}>
              Сохранить
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
