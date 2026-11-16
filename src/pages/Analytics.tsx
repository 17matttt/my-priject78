import { useMemo, useState } from 'react'
import { Activity, BarChart3, Brain, Clock, Flame, GraduationCap, ListChecks, TrendingUp } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, EmptyState, PageHead, Panel, Progress, Segmented, StatCard } from '../components/UI'
import { AreaChart, Donut } from '../components/Charts'
import { fmtDateShort, durationLabel, isoDate, addDays, startOfDay, weekdayShort } from '../lib/date'
import { round } from '../lib/format'
import {
  completedLast7,
  focusByLabel,
  focusMinutesOn,
  focusSeries,
  focusStreak,
  sessionMinutes,
  subjectAverages,
  tasksCompletedSeries,
  workloadNext7,
} from '../lib/insights'

const COLORS = ['#69d9ff', '#8b8cff', '#5ee6b5', '#ffc46b', '#ff8a8a', '#b6a4ff', '#4fd1c5']

export default function Analytics() {
  const { state } = useApp()
  const [range, setRange] = useState<'7' | '14' | '30'>('7')
  const days = Number(range)

  const focus = useMemo(() => focusSeries(state, days), [state.focusSessions, days])
  const tasks = useMemo(() => tasksCompletedSeries(state, days), [state.tasks, days])
  const labels = useMemo(() => focusByLabel(state), [state.focusSessions])
  const workload = useMemo(() => workloadNext7(state), [state.tasks, state.homework, state.events])
  const averages = useMemo(() => subjectAverages(state), [state.grades])

  const weekMinutes = focus.reduce((sum, entry) => sum + entry.value, 0)
  const todayMinutes = focusMinutesOn(state)
  const completedWeek = completedLast7(state)
  const streak = focusStreak(state)
  const avgDaily = round(weekMinutes / Math.max(1, days), 0)
  const totalSessions = state.focusSessions.filter((session) => session.mode === 'focus').length
  const totalFocusAll = sessionMinutes(state.focusSessions.filter((session) => session.mode === 'focus'))

  const slices = labels
    .filter((entry) => entry.value > 0)
    .map((entry, index) => ({ label: entry.label, value: entry.value, color: COLORS[index % COLORS.length] }))

  const dailyRows = useMemo(() => {
    const rows: { date: string; focus: number; tasks: number; events: number }[] = []
    for (let index = days - 1; index >= 0; index--) {
      const date = addDays(startOfDay(new Date()), -index)
      const key = isoDate(date)
      rows.push({
        date: key,
        focus: state.focusSessions
          .filter((session) => session.mode === 'focus' && isoDate(new Date(session.startedAt)) === key)
          .reduce((sum, session) => sum + session.minutes, 0),
        tasks: state.tasks.filter((task) => task.completedAt && isoDate(new Date(task.completedAt)) === key).length,
        events: state.events.filter((event) => isoDate(new Date(event.start)) === key).length,
      })
    }
    return rows
  }, [state.focusSessions, state.tasks, state.events, days])

  const maxDaily = Math.max(...dailyRows.map((row) => row.focus), 1)
  const bestDay = [...dailyRows].sort((a, b) => b.focus - a.focus)[0]

  return (
    <div className="page">
      <PageHead title="Analytics" sub="Every number below is computed from your own records" eyebrow="Insight">
        <Segmented
          value={range}
          onChange={setRange}
          label="Range"
          options={[
            { value: '7', label: '7 days' },
            { value: '14', label: '14 days' },
            { value: '30', label: '30 days' },
          ]}
        />
      </PageHead>

      <div className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label="Focus today" value={durationLabel(todayMinutes)} hint={`${streak} day streak`} icon={<Clock size={16} />} badge={streak > 0 ? <Badge tone="accent">{streak}d</Badge> : undefined} />
        <StatCard label={`Focus · ${days}d`} value={durationLabel(weekMinutes)} hint={`${durationLabel(avgDaily)} daily average`} icon={<Flame size={16} />} />
        <StatCard label="Tasks completed" value={completedWeek} hint="Last 7 days" icon={<ListChecks size={16} />} />
        <StatCard label="All-time focus" value={durationLabel(totalFocusAll)} hint={`${totalSessions} sessions logged`} icon={<TrendingUp size={16} />} />
      </div>

      <div className="split" style={{ marginBottom: 14 }}>
        <Panel title="Focus minutes" sub={`Daily total · last ${days} days`} delay={20}>
          {weekMinutes === 0 ? (
            <EmptyState
              icon={<Clock />}
              title="No focus sessions yet"
              text="Run a session in the Focus room and your daily minutes will appear here."
            />
          ) : (
            <AreaChart data={focus} height={190} format={(value) => `${Math.round(value)}m`} />
          )}
        </Panel>

        <Panel title="Time distribution" sub="Where your focus went" delay={60}>
          {slices.length === 0 ? (
            <EmptyState icon={<Brain />} title="No labelled sessions" text="Sessions you label (Study, Reading, Revision) are grouped here." />
          ) : (
            <Donut slices={slices} centerLabel="total" centerValue={durationLabel(totalFocusAll)} />
          )}
        </Panel>
      </div>

      <div className="split" style={{ marginBottom: 14 }}>
        <Panel title="Tasks completed" sub={`Per day · last ${days} days`} delay={90}>
          {tasks.every((entry) => entry.value === 0) ? (
            <EmptyState icon={<ListChecks />} title="Nothing completed yet" text="Tick a task and the daily count appears here." />
          ) : (
            <AreaChart data={tasks} height={180} color="#8b8cff" />
          )}
        </Panel>

        <Panel title="Upcoming workload" sub="Tasks, homework and tests weighted" delay={120}>
          {workload.every((entry) => entry.value === 0) ? (
            <EmptyState icon={<BarChart3 />} title="Your week is clear" text="Add tasks or homework to see the workload curve." />
          ) : (
            <AreaChart data={workload} height={180} color="#5ee6b5" />
          )}
        </Panel>
      </div>

      <div className="split">
        <Panel title="Daily activity" sub={`Last ${days} days`} delay={150} flush>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Focus</th>
                  <th>Tasks</th>
                  <th>Events</th>
                </tr>
              </thead>
              <tbody>
                {[...dailyRows].reverse().map((row) => (
                  <tr key={row.date}>
                    <td>
                      {weekdayShort(new Date(row.date).getDay())} <span className="dim tiny">{fmtDateShort(row.date)}</span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <div style={{ width: 72 }}>
                          <Progress value={(row.focus / maxDaily) * 100} tone={row.focus >= avgDaily ? 'good' : 'accent'} height={5} />
                        </div>
                        <span className="mono tiny">{row.focus}m</span>
                      </div>
                    </td>
                    <td className="mono tiny">{row.tasks}</td>
                    <td className="mono tiny">{row.events}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="stack" style={{ gap: 14 }}>
          <Panel title="School workload" sub="Average per subject" delay={180}>
            {averages.length === 0 ? (
              <EmptyState icon={<GraduationCap />} title="No grades yet" text="Add grades in School to compare subjects." />
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {averages.slice(0, 6).map((entry) => (
                  <div key={entry.subject}>
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5 }}>{entry.subject}</span>
                      <span className="mono tiny dim">
                        {entry.average.toFixed(1)}/20 · {entry.count} grade{entry.count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <Progress value={(entry.average / 20) * 100} tone={entry.average >= 14 ? 'good' : entry.average >= 10 ? 'accent' : 'bad'} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Highlights" sub="Derived from your logs" delay={210}>
            <div className="stack" style={{ gap: 6 }}>
              <div className="metric-row">
                <span className="dim tiny">Best focus day</span>
                <span className="strong tiny">
                  {bestDay && bestDay.focus > 0 ? `${weekdayShort(new Date(bestDay.date).getDay())} · ${durationLabel(bestDay.focus)}` : 'No data'}
                </span>
              </div>
              <div className="metric-row">
                <span className="dim tiny">Daily average</span>
                <span className="strong tiny">{durationLabel(avgDaily)}</span>
              </div>
              <div className="metric-row">
                <span className="dim tiny">Focus streak</span>
                <span className="strong tiny">{streak} day{streak === 1 ? '' : 's'}</span>
              </div>
              <div className="metric-row">
                <span className="dim tiny">Sessions logged</span>
                <span className="strong tiny">{state.focusSessions.length}</span>
              </div>
              <div className="metric-row">
                <span className="dim tiny">Open tasks</span>
                <span className="strong tiny">{state.tasks.filter((task) => !task.done).length}</span>
              </div>
              <div className="metric-row">
                <span className="dim tiny">Documents stored</span>
                <span className="strong tiny">{state.documents.length}</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        Activity icon: <Activity size={11} /> computed locally — VAULT never fabricates statistics.
      </p>
    </div>
  )
}
