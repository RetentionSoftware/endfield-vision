'use client'

import { Button, Callout, Card, Checkbox, Field, Switch, TimeInput, toast } from 'endfield-vision'
import { Moon, RotateCcw, Save } from 'lucide-react'
import { useState } from 'react'
import { CHANNELS, LOCKED_RULES, NOTIFICATION_GROUPS, type ChannelId } from '@/lib/demo/settings'
import { useT } from '@/lib/i18n'
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
  const { t, tx, plural } = useT()
  const [saved, setSaved] = useState<NotifyState>(INITIAL)
  const [state, setState] = useState<NotifyState>(INITIAL)
  const [saving, setSaving] = useState(false)

  const dirty = !same(saved, state)
  const noChannels = !Object.values(state.channels).some(Boolean)
  const quietInvalid = state.quiet.on && (!state.quiet.from || !state.quiet.to || state.quiet.from === state.quiet.to)
  const enabledCount = Object.values(state.rules).filter(Boolean).length
  const totalCount = Object.keys(state.rules).length
  const { from, to } = state.quiet
  const overnight = from > to

  const setRule = (id: string, on: boolean) => setState((st) => ({ ...st, rules: { ...st.rules, [id]: on } }))
  const setChannel = (id: ChannelId, on: boolean) => setState((st) => ({ ...st, channels: { ...st.channels, [id]: on } }))
  const setQuiet = (patch: Partial<NotifyState['quiet']>) => setState((st) => ({ ...st, quiet: { ...st.quiet, ...patch } }))

  const save = async () => {
    setSaving(true)
    await wait(700)
    setSaved(state)
    setSaving(false)
    toast.success(t('Настройки уведомлений сохранены', 'Notification settings saved'), {
      description: t(
        `Включено ${enabledCount} ${plural(enabledCount, ['событие', 'события', 'событий'], ['event', 'events'])}`,
        `${enabledCount} ${plural(enabledCount, ['событие', 'события', 'событий'], ['event', 'events'])} enabled`,
      ),
    })
  }

  return (
    <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
      <div className="pg-split">
        <Card title={t('События', 'Events')} description={t(`Включено ${enabledCount} из ${totalCount}`, `${enabledCount} of ${totalCount} enabled`)}>
          <div className={s.groups}>
            {NOTIFICATION_GROUPS.map((g) => (
              <section key={g.id} className={s.group} aria-labelledby={`ng-${g.id}`}>
                <header className={s.groupHead}>
                  <h3 id={`ng-${g.id}`} className={s.groupTitle}>
                    {tx(g.title)}
                  </h3>
                  <p className="ev-muted">{tx(g.description)}</p>
                </header>
                <div className={s.switches}>
                  {g.rules.map((r) => (
                    <Switch
                      key={r.id}
                      checked={state.rules[r.id] ?? false}
                      onChange={(v) => setRule(r.id, v)}
                      label={tx(r.label)}
                      description={tx(r.description)}
                      disabled={LOCKED_RULES.has(r.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Card>

        <div className="ev-stack" style={{ ['--ev-gap' as string]: 'var(--ev-space-6)' }}>
          <Card title={t('Каналы', 'Channels')} description={t('Куда доставлять включённые события.', 'Where to deliver enabled events.')}>
            <div className={s.switches}>
              {CHANNELS.map((c) => (
                <Checkbox
                  key={c.id}
                  checked={state.channels[c.id]}
                  onChange={(v) => setChannel(c.id, v)}
                  label={tx(c.label)}
                  description={tx(c.description)}
                />
              ))}
              {noChannels ? (
                <Callout tone="warning" title={t('Не выбран ни один канал', 'No channel selected')}>
                  {t('Уведомления будут видны только во входящих консоли.', 'Notifications will only appear in the console inbox.')}
                </Callout>
              ) : null}
            </div>
          </Card>

          <Card
            title={t('Тихие часы', 'Quiet hours')}
            icon={<Moon size={16} />}
            description={t('Без звука и push, кроме критических инцидентов.', 'No sound or push, except for critical incidents.')}
          >
            <div className="ev-stack">
              <Switch checked={state.quiet.on} onChange={(v) => setQuiet({ on: v })} label={t('Включить тихие часы', 'Enable quiet hours')} />
              <div className={s.timeRow}>
                <Field label={t('С', 'From')} error={quietInvalid ? t('Интервал не задан', 'Interval not set') : undefined} disabled={!state.quiet.on}>
                  <TimeInput value={state.quiet.from} onChange={(v) => setQuiet({ from: v })} />
                </Field>
                <Field label={t('До', 'To')} disabled={!state.quiet.on}>
                  <TimeInput value={state.quiet.to} onChange={(v) => setQuiet({ to: v })} />
                </Field>
              </div>
              {state.quiet.on && !quietInvalid ? (
                <p className={s.note}>
                  {t(
                    `Ежедневно с ${from} до ${to}${overnight ? ' следующего дня' : ''} по часовому поясу профиля.`,
                    `Every day from ${from} to ${to}${overnight ? ' the next day' : ''}, in your profile time zone.`,
                  )}
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      {dirty ? (
        <div className={s.saveBar} role="region" aria-label={t('Несохранённые изменения', 'Unsaved changes')}>
          <span>{t('Есть несохранённые изменения', 'You have unsaved changes')}</span>
          <div className="ev-row">
            <Button variant="ghost" icon={<RotateCcw size={15} />} disabled={saving} onClick={() => setState(saved)}>
              {t('Отменить', 'Discard')}
            </Button>
            <Button variant="primary" icon={<Save size={15} />} loading={saving} disabled={quietInvalid} onClick={() => void save()}>
              {t('Сохранить', 'Save')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
