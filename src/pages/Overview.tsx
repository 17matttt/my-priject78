import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  GraduationCap,
  Inbox,
  Mail,
  Plus,
  Send,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Badge, Btn, EmptyState, Panel, Progress, Ring, Row, StatCard } from '../components/UI'
import { AreaChart } from '../components/Charts'
import { durationLabel, fmtDateLong, fmtDateShort, fmtTime, parseDate } from '../lib/date'
import {
  CATEGORY_LABELS,
  agendaFor,
  agendaWindow,
  askVault,
  dailyBriefing,
  focusMinutesOn,
  focusSeries,
  intelligence,
  nextClass,
  nextExam,
  nextHomework,
  overallAverage,
  overdueTasks,
  tasksDueOn,
  unreadMail,
} from '../lib/insights'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function plain(html: string): string {
  return html.replace(/<[^>]+>/g, '')
}

export default function Overview() {
  const { state, upsert } = useApp()
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<{ answer: string; sources: string[] } | null>(null)

  const today = new Date()
  const agenda = useMemo(() => agendaFor(state, today), [state, today.toDateString()])
  const upcoming = useMemo(() => agendaWindow(state, 8).filter((item) => item.start.slice(0, 10) !== today.toISOString().slice(0, 10)).slice(0, 6), [state])
  const due = tasksDueOn(state)
  const overdue = overdueTasks(state)
  const unread = unreadMail(state)
  const focusToday = focusMinutesOn(state)
  const focusWeek = useMemo(() => focusSeries(state, 7), [state.focusSessions])
  const classSlot = nextClass(state)
  const exam = nextExam(state)
  const homework = nextHomework(state)
  const average = overallAverage(state)
  const insights = useMemo(() => intelligence(state), [state])
  const openTasks = state.tasks.filter((task) => !task.done)
  const goalPct = Math.min(100, (focusToday / Math.max(1, state.focusGoal)) * 100)

  const submitQuestion = () => {
    if (!question.trim()) return
    setAnswer(askVault(state, question))
  }

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span className="dot-live" /> {fmtDateLong(today)}
          </div>
          <h1 className="hero-title">
            {greeting()}, {state.profile.name.split(' ')[0] || 'there'}
          </h1>
          <p className="hero-sub">{dailyBriefing(state)}</p>
          <div className="hero-actions">
            <Btn variant="primary" icon={<Plus size={15} />} onClick={() => navigate('/tasks')}>
              New task
            </Btn>
            <Btn variant="soft" icon={<Timer size={15} />} onClick={() => navigate('/focus')}>
              Start focus
            </Btn>
          </div>
        </div>
        <div className="hero-meta">
          <div className="hero-chip">
            <span className="hero-chip-label">Today</span>
            <span className="hero-chip-value">{agenda.length} items</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-label">Tasks due</span>
            <span className="hero-chip-value">{due.length + overdue.length}</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-label">Unread</span>
            <span className="hero-chip-value">{unread.length}</span>
          </div>
          <div className="hero-chip">
            <span className="hero-chip-label">Focus</span>
            <span className="hero-chip-value">{durationLabel(focusToday)}</span>
          </div>
        </div>
      </section>

      <div className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard
          label="Focus today"
          value={durationLabel(focusToday)}
          hint={`Goal ${durationLabel(state.focusGoal)}`}
          icon={<Timer size={16} />}
          badge={<Badge tone={goalPct >= 100 ? 'good' : 'accent'}>{Math.round(goalPct)}%</Badge>}
        />
        <StatCard
          label="Open tasks"
          value={openTasks.length}
          hint={overdue.length > 0 ? `${overdue.length} overdue` : 'Nothing overdue'}
          icon={<CheckCircle2 size={16} />}
          badge={overdue.length > 0 ? <Badge tone="bad">{overdue.length}</Badge> : undefined}
        />
        <StatCard label="Unread mail" value={unread.length} hint={`${state.messages.length} messages total`} icon={<Inbox size={16} />} />
        <StatCard
          label="Average"
          value={average === null ? '—' : `${average.toFixed(1)}/20`}
          hint={state.grades.length > 0 ? `${state.grades.length} grades` : 'No grades yet'}
          icon={<GraduationCap size={16} />}
        />
      </div>

      <div className="split" style={{ marginBottom: 14 }}>
        <Panel
          title="Today"
          sub={`${agenda.length} scheduled item${agenda.length === 1 ? '' : 's'}`}
          action={
            <Btn variant="ghost" size="sm" icon={<CalendarDays size={13} />} onClick={() => navigate('/calendar')}>
              Calendar
            </Btn>
          }
          delay={20}
        >
          {agenda.length === 0 ? (
            <EmptyState
              icon={<CalendarDays />}
              title="Your day is clear"
              text="No classes, events or deadlines today. Add an event or plan a focus session."
              action={
                <Btn variant="soft" icon={<Plus size={14} />} onClick={() => navigate('/calendar')}>
                  Add event
                </Btn>
              }
            />
          ) : (
            <div className="timeline">
              {agenda.map((item) => (
                <div key={item.id} className="tl-item">
                  <div className="tl-time">{fmtTime(item.start)}</div>
                  <div className={`tl-dot tone-${item.kind === 'class' ? 'accent' : item.kind === 'task' ? 'good' : item.kind === 'homework' ? 'violet' : 'warn'}`} />
                  <div className="tl-body">
                    <div className="tl-title">
                      {item.title}
                      {item.demo && <span className="badge badge--demo">Demo</span>}
                    </div>
                    <div className="tl-sub">
                      {item.subtitle}
                      {item.location ? ` · ${item.location}` : ''}
                    </div>
                  </div>
                  {item.kind === 'task' && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Complete ${item.title}`}
                      onClick={() => {
                        const task = state.tasks.find((entry) => entry.id === item.id)
                        if (task) upsert('tasks', { ...task, done: !task.done, completedAt: task.done ? null : new Date().toISOString() })
                      }}
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="stack" style={{ gap: 14 }}>
          <Panel
            title="Focus"
            sub={`Goal ${durationLabel(state.focusGoal)} today`}
            delay={60}
            action={
              <Btn variant="ghost" size="sm" icon={<Timer size={13} />} onClick={() => navigate('/focus')}>
                Open room
              </Btn>
            }
          >
            <div className="focus-mini">
              <Ring value={goalPct} size={132} stroke={9}>
                <div className="ring-center">
                  <span className="ring-value">{Math.round(goalPct)}%</span>
                  <span className="ring-label">{durationLabel(focusToday)}</span>
                </div>
              </Ring>
              <div className="focus-mini-side">
                <div className="metric-row">
                  <span className="dim tiny">This week</span>
                  <span className="strong tiny">{durationLabel(focusWeek.reduce((sum, entry) => sum + entry.value, 0))}</span>
                </div>
                <div className="metric-row">
                  <span className="dim tiny">Sessions</span>
                  <span className="strong tiny">{state.focusSessions.filter((session) => session.mode === 'focus').length}</span>
                </div>
                <div className="metric-row">
                  <span className="dim tiny">Target</span>
                  <span className="strong tiny">{durationLabel(state.focusGoal)}</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Upcoming" sub="Next 7 days" delay={90}>
            {upcoming.length === 0 ? (
              <p className="empty-text">Nothing scheduled in the coming week.</p>
            ) : (
              <div className="stack" style={{ gap: 2 }}>
                {upcoming.map((item) => (
                  <Row
                    key={item.id}
                    icon={<Clock size={14} />}
                    title={item.title}
                    sub={`${fmtDateShort(item.start.slice(0, 10))} · ${fmtTime(item.start)}`}
                    meta={CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] || 'Task'}
                    demo={item.demo}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <div className="split-3" style={{ marginBottom: 14 }}>
        <Panel title="School" sub="Latest signals" delay={120} action={<Btn variant="ghost" size="sm" onClick={() => navigate('/school')}>Open</Btn>}>
          <div className="stack" style={{ gap: 6 }}>
            <div className="mini-card">
              <span className="mini-label"><BookOpen size={12} /> Next class</span>
              <span className="mini-value">{classSlot ? `${classSlot.subject} · ${classSlot.start}` : 'None scheduled'}</span>
              {classSlot && <span className="mini-sub">{classSlot.room || 'Room TBC'}</span>}
            </div>
            <div className="mini-card">
              <span className="mini-label"><GraduationCap size={12} /> Next test</span>
              <span className="mini-value">{exam ? exam.title : 'No test scheduled'}</span>
              {exam && <span className="mini-sub">{fmtDateShort(exam.start.slice(0, 10))}</span>}
            </div>
            <div className="mini-card">
              <span className="mini-label"><Target size={12} /> Homework due</span>
              <span className="mini-value">{homework ? homework.title : 'All clear'}</span>
              {homework && <span className="mini-sub">{homework.subject} · {fmtDateShort(homework.due)}</span>}
            </div>
          </div>
        </Panel>

        <Panel
          title="Inbox"
          sub={`${unread.length} unread`}
          delay={150}
          action={<Btn variant="ghost" size="sm" icon={<Mail size={13} />} onClick={() => navigate('/mail')}>Mail</Btn>}
        >
          {unread.length === 0 ? (
            <p className="empty-text">No unread messages.</p>
          ) : (
            <div className="stack" style={{ gap: 2 }}>
              {unread.slice(0, 4).map((message) => (
                <Row
                  key={message.id}
                  icon={<Mail size={14} />}
                  title={message.subject}
                  sub={message.fromName}
                  meta={fmtDateShort(message.date.slice(0, 10))}
                  demo={message.demo}
                  onClick={() => navigate('/mail')}
                />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Tasks"
          sub={`${openTasks.length} open`}
          delay={180}
          action={<Btn variant="ghost" size="sm" onClick={() => navigate('/tasks')}>All</Btn>}
        >
          {openTasks.length === 0 ? (
            <p className="empty-text">Everything is done.</p>
          ) : (
            <div className="stack" style={{ gap: 2 }}>
              {openTasks.slice(0, 4).map((task) => (
                <div key={task.id} className="task-mini">
                  <button
                    type="button"
                    className="tick"
                    aria-label={`Complete ${task.title}`}
                    onClick={() => upsert('tasks', { ...task, done: true, completedAt: new Date().toISOString() })}
                  >
                    <Check size={11} />
                  </button>
                  <div className="task-mini-body">
                    <span className="task-mini-title">{task.title}</span>
                    <span className="task-mini-sub">
                      {task.due ? fmtDateShort(task.due) : 'No due date'}
                      {task.demo ? ' · Demo' : ''}
                    </span>
                  </div>
                  <Badge tone={task.priority === 'high' ? 'bad' : task.priority === 'medium' ? 'warn' : 'neutral'}>
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="split">
        <Panel title="VAULT Intelligence" sub="Derived from your own data" accent delay={210}>
          {insights.length === 0 ? (
            <EmptyState
              icon={<Sparkles />}
              title="Nothing to flag"
              text="Add classes, deadlines and tasks — VAULT will surface what matters."
            />
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {insights.slice(0, 4).map((insight) => (
                <div key={insight.id} className="ai-line">
                  <span className={`ai-kind ${insight.kind}`}>{insight.kind === 'fact' ? 'Confirmed' : 'Suggestion'}</span>
                  <div className="ai-text">{plain(insight.text)}</div>
                  <button type="button" className="ai-go" aria-label="Open related page" onClick={() => navigate(`/${insight.page}`)}>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="ask-box">
            <input
              className="input ask-input"
              value={question}
              placeholder="Ask about your day, deadlines or focus time…"
              aria-label="Ask VAULT"
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitQuestion()
              }}
            />
            <Btn variant="primary" size="sm" icon={<Send size={13} />} onClick={submitQuestion}>
              Ask
            </Btn>
          </div>
          {answer && (
            <div className="ask-answer">
              <p>{answer.answer}</p>
              {answer.sources.length > 0 && (
                <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                  {answer.sources.map((source) => (
                    <span key={source} className="badge badge--neutral">
                      {source}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Focus trend" sub="Last 7 days" delay={240}>
          <AreaChart data={focusWeek} height={150} format={(value) => `${Math.round(value)}m`} />
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
            <span className="dim tiny">Avg {durationLabel(focusWeek.reduce((sum, entry) => sum + entry.value, 0) / 7)}</span>
            <span className="dim tiny">
              Best {durationLabel(Math.max(...focusWeek.map((entry) => entry.value), 0))}
            </span>
            <span className="dim tiny">
              <TrendingUp size={11} /> {state.focusSessions.length} sessions
            </span>
          </div>
        </Panel>
      </div>

      <Panel title="Quick access" sub="Jump straight in" delay={270}>
        <div className="quick-grid">
          {[
            { page: '/tasks', label: 'Tasks', icon: <CheckCircle2 size={15} /> },
            { page: '/calendar', label: 'Calendar', icon: <CalendarDays size={15} /> },
            { page: '/mail', label: 'Mail', icon: <Mail size={15} /> },
            { page: '/school', label: 'School', icon: <GraduationCap size={15} /> },
            { page: '/focus', label: 'Focus', icon: <Timer size={15} /> },
            { page: '/documents', label: 'Documents', icon: <BookOpen size={15} /> },
          ].map((entry) => (
            <button key={entry.page} type="button" className="quick-tile" onClick={() => navigate(entry.page)}>
              <span className="quick-icon">{entry.icon}</span>
              <span>{entry.label}</span>
              <ArrowRight size={12} className="quick-arrow" />
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 12 }}>
          Timeline built from {state.events.length} events, {state.classes.length} weekly classes and {state.tasks.length} tasks stored on this device.
          {parseDate(today.toISOString()).getTime() > 0 ? '' : ''}
        </p>
      </Panel>
    </div>
  )
}
