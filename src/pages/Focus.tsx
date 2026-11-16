import { useEffect, useRef, useState } from 'react'
import { Coffee, Flame, Pause, Play, RotateCcw, Target, Timer, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, Btn, EmptyState, Field, Input, PageHead, Panel, Progress, Ring, Select } from '../components/UI'
import { AreaChart } from '../components/Charts'
import {
  focusByLabel,
  focusMinutesOn,
  focusSeries,
  focusStreak,
  sessionMinutes,
} from '../lib/insights'
import { durationLabel, fmtDateShort, fmtTime } from '../lib/date'
import { uid } from '../lib/format'
import type { FocusSession } from '../types'

const LABELS = ['Study', 'Revision', 'Reading', 'Writing', 'Project', 'Admin']
const PRESETS = [15, 25, 50, 90]

export default function Focus() {
  const { state, set, upsert, remove } = useApp()
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [minutes, setMinutes] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [label, setLabel] = useState('Study')
  const [goalDraft, setGoalDraft] = useState(String(state.focusGoal))
  const startedAt = useRef<string | null>(null)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0))
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  const logSession = () => {
    const session: FocusSession = {
      id: uid('focus'),
      startedAt: startedAt.current || new Date().toISOString(),
      minutes,
      mode,
      label: mode === 'break' ? 'Break' : label,
    }
    upsert('focusSessions', session)
    startedAt.current = null
  }

  useEffect(() => {
    if (remaining !== 0 || !running) return
    setRunning(false)
    logSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running])

  const start = () => {
    if (remaining === 0) setRemaining(minutes * 60)
    if (!startedAt.current) startedAt.current = new Date().toISOString()
    setRunning(true)
  }

  const reset = () => {
    setRunning(false)
    startedAt.current = null
    setRemaining(minutes * 60)
  }

  const choosePreset = (value: number) => {
    setRunning(false)
    startedAt.current = null
    setMinutes(value)
    setRemaining(value * 60)
  }

  const chooseMode = (next: 'focus' | 'break') => {
    setMode(next)
    setRunning(false)
    startedAt.current = null
    const nextMinutes = next === 'break' ? 5 : minutes
    if (next === 'break') setMinutes(nextMinutes)
    setRemaining(nextMinutes * 60)
  }

  const todayMinutes = focusMinutesOn(state)
  const streak = focusStreak(state)
  const series = focusSeries(state, 7)
  const distribution = focusByLabel(state)
  const totalFocus = sessionMinutes(state.focusSessions.filter((session) => session.mode === 'focus'))
  const goalProgress = state.focusGoal > 0 ? Math.min(100, (todayMinutes / state.focusGoal) * 100) : 0
  const ringValue = minutes > 0 ? ((minutes * 60 - remaining) / (minutes * 60)) * 100 : 0
  const clock = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
  const history = [...state.focusSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 12)

  return (
    <div className="page">
      <PageHead title="Focus" sub="A distraction-free room with real session tracking" eyebrow="Execute">
        <Badge tone={streak > 0 ? 'good' : 'neutral'} dot>
          {streak > 0 ? `${streak}-day streak` : 'Start a streak'}
        </Badge>
      </PageHead>

      <div className="split" style={{ alignItems: 'stretch' }}>
        <Panel accent className="focus-stage" flush>
          <div className="focus-inner">
            <div className="row" style={{ gap: 6, justifyContent: 'center' }}>
              <button
                type="button"
                className={`chip ${mode === 'focus' ? 'is-on' : ''}`}
                onClick={() => chooseMode('focus')}
              >
                <Timer size={13} /> Deep work
              </button>
              <button
                type="button"
                className={`chip ${mode === 'break' ? 'is-on' : ''}`}
                onClick={() => chooseMode('break')}
              >
                <Coffee size={13} /> Break
              </button>
            </div>

            <Ring value={ringValue} size={252} stroke={9}>
              <div className="focus-clock">
                <div className="focus-time">{clock}</div>
                <div className="focus-mode">{mode === 'focus' ? label : 'Recovery'}</div>
              </div>
            </Ring>

            <div className="row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Btn variant="primary" icon={running ? <Pause size={15} /> : <Play size={15} />} onClick={running ? () => setRunning(false) : start}>
                {running ? 'Pause' : remaining === 0 ? 'Start again' : 'Start session'}
              </Btn>
              <Btn variant="ghost" icon={<RotateCcw size={14} />} onClick={reset}>
                Reset
              </Btn>
            </div>

            {mode === 'focus' && (
              <div className="row" style={{ gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`chip ${minutes === preset ? 'is-on' : ''}`}
                    onClick={() => choosePreset(preset)}
                  >
                    {preset} min
                  </button>
                ))}
              </div>
            )}

            <div className="row" style={{ gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {mode === 'focus' && (
                <Select value={label} onChange={(event) => setLabel(event.target.value)} style={{ width: 160 }} aria-label="Session label">
                  {LABELS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              )}
              <Field label="Custom length">
                <Input
                  type="number"
                  min={1}
                  max={180}
                  value={minutes}
                  onChange={(event) => {
                    const value = Math.max(1, Math.min(180, Number(event.target.value) || 1))
                    setMinutes(value)
                    if (!running) setRemaining(value * 60)
                  }}
                  style={{ width: 96 }}
                />
              </Field>
            </div>
            <p className="hint" style={{ textAlign: 'center', maxWidth: 380 }}>
              Sessions are written to your local history when the timer completes. Nothing is uploaded anywhere.
            </p>
          </div>
        </Panel>

        <div className="stack">
          <Panel title="Today" sub={`Goal ${state.focusGoal} minutes`}>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div className="mini-num">{durationLabel(todayMinutes)}</div>
              <span className="tiny dim">{Math.round(goalProgress)}% of goal</span>
            </div>
            <Progress value={goalProgress} tone={goalProgress >= 100 ? 'good' : 'accent'} height={8} />
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <Input
                type="number"
                min={15}
                max={600}
                step={15}
                value={goalDraft}
                onChange={(event) => setGoalDraft(event.target.value)}
                aria-label="Daily focus goal"
                style={{ width: 90 }}
              />
              <Btn
                size="sm"
                variant="soft"
                icon={<Target size={13} />}
                onClick={() => {
                  const value = Math.max(15, Math.min(600, Number(goalDraft) || 60))
                  set((current) => ({ ...current, focusGoal: value }))
                  setGoalDraft(String(value))
                }}
              >
                Save goal
              </Btn>
            </div>
            <div className="stat-inline" style={{ marginTop: 14 }}>
              <div>
                <span className="k">All-time</span>
                <span className="v">{durationLabel(totalFocus)}</span>
              </div>
              <div>
                <span className="k">Sessions</span>
                <span className="v">{state.focusSessions.filter((session) => session.mode === 'focus').length}</span>
              </div>
              <div>
                <span className="k">Streak</span>
                <span className="v row" style={{ gap: 4 }}>
                  <Flame size={13} color="#ffb454" /> {streak}d
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Last 7 days" sub="Minutes of logged focus">
            <AreaChart data={series} height={140} format={(value) => `${Math.round(value)}m`} />
          </Panel>

          <Panel title="Where time goes" sub="Distribution by session label">
            {distribution.length === 0 ? (
              <p className="empty-text">Complete a session to build this breakdown.</p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {distribution.map((entry) => {
                  const max = Math.max(...distribution.map((item) => item.value), 1)
                  return (
                    <div key={entry.label}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="tiny">{entry.label}</span>
                        <span className="tiny dim">{durationLabel(entry.value)}</span>
                      </div>
                      <Progress value={(entry.value / max) * 100} />
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Session history" sub="Stored locally · delete anything you do not want">
        {history.length === 0 ? (
          <EmptyState
            icon={<Timer />}
            title="No sessions yet"
            text="Start a 25-minute session above. When it completes, VAULT records it here and in your analytics."
            action={
              <Btn variant="primary" icon={<Play size={14} />} onClick={() => choosePreset(25)}>
                Set up 25 minutes
              </Btn>
            }
          />
        ) : (
          <div className="stack" style={{ gap: 4 }}>
            {history.map((session) => (
              <div key={session.id} className="list-item">
                <span className="li-icon">
                  {session.mode === 'break' ? <Coffee size={14} /> : <Timer size={14} />}
                </span>
                <span className="li-main">
                  <span className="li-title" style={{ display: 'flex', gap: 6 }}>
                    {session.label}
                    {session.demo && <span className="badge badge--demo">Demo</span>}
                  </span>
                  <span className="li-sub">
                    {fmtDateShort(session.startedAt.slice(0, 10))} · {fmtTime(session.startedAt)}
                  </span>
                </span>
                <Badge tone={session.mode === 'break' ? 'neutral' : 'accent'}>{session.minutes} min</Badge>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Delete session"
                  onClick={() => remove('focusSessions', session.id)}
                >
                  <Trash2 />
                </button>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
