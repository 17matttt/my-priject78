import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  ClipboardList,
  Download,
  GraduationCap,
  Info,
  Pencil,
  Plus,
  School as SchoolIcon,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  Badge,
  Btn,
  Chip,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHead,
  Panel,
  Progress,
  Select,
  StatCard,
  Textarea,
} from '../components/UI'
import { AreaChart } from '../components/Charts'
import { fmtDateShort, fmtTime, isoDate, daysUntil, todayISO, weekdayShort } from '../lib/date'
import { round, uid } from '../lib/format'
import { nextExam, nextHomework, overallAverage, subjectAverages } from '../lib/insights'
import { downloadText } from '../lib/download'
import type { Announcement, Grade, Homework, ClassSlot } from '../types'

type Tab = 'overview' | 'grades' | 'homework' | 'timetable' | 'news'

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'grades', label: 'Grades' },
  { value: 'homework', label: 'Homework' },
  { value: 'timetable', label: 'Timetable' },
  { value: 'news', label: 'Announcements' },
]

const WEEKDAYS = [1, 2, 3, 4, 5, 6]

export default function School() {
  const { state, upsert, remove } = useApp()
  const [tab, setTab] = useState<Tab>('overview')
  const [gradeForm, setGradeForm] = useState<Grade | 'new' | null>(null)
  const [homeworkForm, setHomeworkForm] = useState<Homework | 'new' | null>(null)
  const [slotForm, setSlotForm] = useState<ClassSlot | 'new' | null>(null)
  const [newsForm, setNewsForm] = useState<Announcement | 'new' | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const averages = useMemo(() => subjectAverages(state), [state.grades])
  const overall = useMemo(() => overallAverage(state), [state.grades])
  const exam = useMemo(() => nextExam(state), [state.events])
  const homeworkNext = useMemo(() => nextHomework(state), [state.homework])
  const openHomework = state.homework.filter((entry) => !entry.done)
  const subjects = useMemo(() => {
    const set = new Set<string>([
      ...state.grades.map((entry) => entry.subject),
      ...state.classes.map((entry) => entry.subject),
      ...state.homework.map((entry) => entry.subject),
    ])
    return [...set].sort()
  }, [state.grades, state.classes, state.homework])

  const chartData = averages.slice(0, 7).map((entry) => ({ label: entry.subject.slice(0, 8), value: entry.average }))

  const exportSchool = () => {
    downloadText(
      `vault-school-${todayISO()}.json`,
      JSON.stringify({ grades: state.grades, homework: state.homework, classes: state.classes }, null, 2),
    )
  }

  return (
    <div className="page">
      <PageHead
        title="School"
        sub={
          overall !== null
            ? `Weighted average ${overall.toFixed(1)}/20 · ${state.grades.length} grades tracked`
            : 'Track grades, homework and your timetable'
        }
        eyebrow="Academics"
      >
        <Btn variant="ghost" size="sm" icon={<Download size={14} />} onClick={exportSchool}>
          Export
        </Btn>
        <Btn variant="soft" size="sm" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>
          Import
        </Btn>
        <Btn variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setGradeForm('new')}>
          Add grade
        </Btn>
      </PageHead>

      <div className="chip-scroll" style={{ marginBottom: 14 }}>
        {TABS.map((entry) => (
          <Chip key={entry.value} active={tab === entry.value} onClick={() => setTab(entry.value)}>
            {entry.label}
          </Chip>
        ))}
      </div>

      <div className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard
          label="Average"
          value={overall !== null ? `${overall.toFixed(1)}` : '—'}
          hint={overall !== null ? 'out of 20, coefficient weighted' : 'Add a grade to begin'}
          icon={<GraduationCap size={16} />}
          badge={overall !== null && <Badge tone={overall >= 14 ? 'good' : overall >= 10 ? 'warn' : 'bad'}>{overall >= 14 ? 'Strong' : overall >= 10 ? 'Steady' : 'At risk'}</Badge>}
        />
        <StatCard
          label="Homework open"
          value={openHomework.length}
          hint={homeworkNext ? `Next: ${homeworkNext.subject} · ${fmtDateShort(homeworkNext.due)}` : 'Nothing pending'}
          icon={<ClipboardList size={16} />}
        />
        <StatCard
          label="Next test"
          value={exam ? fmtDateShort(isoDate(new Date(exam.start))) : '—'}
          hint={exam ? `${exam.title} · ${daysUntil(exam.start)} day(s)` : 'No test scheduled'}
          icon={<AlertTriangle size={16} />}
        />
        <StatCard
          label="Classes / week"
          value={state.classes.length}
          hint={subjects.length > 0 ? `${subjects.length} subjects` : 'Build your timetable'}
          icon={<CalendarClock size={16} />}
        />
      </div>

      {tab === 'overview' && (
        <>
          <div className="split" style={{ marginBottom: 14 }}>
            <Panel title="Subject averages" sub="Out of 20, coefficient weighted" delay={20}>
              {averages.length === 0 ? (
                <EmptyState
                  icon={<GraduationCap />}
                  title="No grades yet"
                  text="Add your first grade, or import a JSON export from your school portal."
                  action={<Btn variant="soft" onClick={() => setGradeForm('new')}>Add a grade</Btn>}
                />
              ) : (
                <>
                  <AreaChart data={chartData} />
                  <div className="stack" style={{ gap: 6, marginTop: 12 }}>
                    {averages.map((entry) => (
                      <div key={entry.subject} className="row" style={{ gap: 10 }}>
                        <span style={{ flex: 1, fontSize: 12.5 }}>{entry.subject}</span>
                        <div style={{ width: 120 }}>
                          <Progress value={(entry.average / 20) * 100} tone={entry.average >= 14 ? 'good' : entry.average >= 10 ? 'accent' : 'bad'} />
                        </div>
                        <span className="mono tiny" style={{ width: 44, textAlign: 'right' }}>
                          {entry.average.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Panel>

            <div className="stack" style={{ gap: 14 }}>
              <Panel title="Next deadline" sub="Homework and tests" delay={60}>
                {homeworkNext || exam ? (
                  <div className="stack" style={{ gap: 8 }}>
                    {homeworkNext && (
                      <div className="list-item">
                        <span className="li-icon"><ClipboardList size={14} /></span>
                        <span className="li-main">
                          <span className="li-title">{homeworkNext.title}</span>
                          <span className="li-sub">{homeworkNext.subject}</span>
                        </span>
                        <Badge tone="warn">{fmtDateShort(homeworkNext.due)}</Badge>
                      </div>
                    )}
                    {exam && (
                      <div className="list-item">
                        <span className="li-icon"><AlertTriangle size={14} /></span>
                        <span className="li-main">
                          <span className="li-title">{exam.title}</span>
                          <span className="li-sub">Test · {fmtTime(exam.start)}</span>
                        </span>
                        <Badge tone="bad">{fmtDateShort(isoDate(new Date(exam.start)))}</Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmptyState icon={<CalendarClock />} title="Nothing due" text="Add homework or a test to see your next deadline here." />
                )}
              </Panel>

              <Panel title="Today's classes" sub={new Date().toLocaleDateString('en-GB', { weekday: 'long' })} delay={90}>
                {state.classes.filter((slot) => slot.weekday === new Date().getDay()).length === 0 ? (
                  <p className="hint">No classes scheduled today.</p>
                ) : (
                  <div className="stack" style={{ gap: 4 }}>
                    {state.classes
                      .filter((slot) => slot.weekday === new Date().getDay())
                      .sort((a, b) => a.start.localeCompare(b.start))
                      .map((slot) => (
                        <div key={slot.id} className="list-item">
                          <span className="li-icon"><BookOpen size={14} /></span>
                          <span className="li-main">
                            <span className="li-title">{slot.subject}</span>
                            <span className="li-sub">
                              {slot.teacher || 'Teacher not set'} · {slot.room || 'Room not set'}
                            </span>
                          </span>
                          <span className="li-meta mono tiny">
                            {slot.start}–{slot.end}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>

          <ConnectionPanel onImport={() => setImportOpen(true)} />
        </>
      )}

      {tab === 'grades' && (
        <Panel
          title="Grade history"
          sub={`${state.grades.length} entries · average ${overall !== null ? overall.toFixed(1) : '—'}/20`}
          action={<Btn size="sm" variant="soft" icon={<Plus size={13} />} onClick={() => setGradeForm('new')}>New grade</Btn>}
          flush
        >
          {state.grades.length === 0 ? (
            <EmptyState
              icon={<GraduationCap />}
              title="No grades recorded"
              text="Grades you add stay on this device. Nothing is shared or uploaded."
              action={<Btn variant="soft" onClick={() => setGradeForm('new')}>Add your first grade</Btn>}
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Coefficient</th>
                    <th>Score</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {[...state.grades]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((grade) => {
                      const normalised = (grade.score / (grade.outOf || 20)) * 20
                      return (
                        <tr key={grade.id}>
                          <td>{grade.subject}</td>
                          <td className="dim">
                            {grade.title}
                            {grade.demo && <span className="badge badge--demo" style={{ marginLeft: 6 }}>Demo</span>}
                          </td>
                          <td className="mono tiny">{fmtDateShort(grade.date)}</td>
                          <td className="mono tiny">×{grade.coefficient}</td>
                          <td>
                            <Badge tone={normalised >= 14 ? 'good' : normalised >= 10 ? 'warn' : 'bad'}>
                              {grade.score}/{grade.outOf} · {normalised.toFixed(1)}
                            </Badge>
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button type="button" className="icon-btn" aria-label={`Edit ${grade.title}`} onClick={() => setGradeForm(grade)}>
                              <Pencil size={14} />
                            </button>
                            <button type="button" className="icon-btn" aria-label={`Delete ${grade.title}`} onClick={() => remove('grades', grade.id)}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === 'homework' && (
        <Panel
          title="Homework"
          sub={`${openHomework.length} open · ${state.homework.filter((entry) => entry.done).length} done`}
          action={<Btn size="sm" variant="soft" icon={<Plus size={13} />} onClick={() => setHomeworkForm('new')}>New homework</Btn>}
          flush
        >
          {state.homework.length === 0 ? (
            <EmptyState
              icon={<ClipboardList />}
              title="No homework tracked"
              text="Add assignments with a due date and they will appear on your Overview and Calendar."
              action={<Btn variant="soft" onClick={() => setHomeworkForm('new')}>Add homework</Btn>}
            />
          ) : (
            <div className="stack" style={{ padding: 14, gap: 6 }}>
              {[...state.homework]
                .sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due))
                .map((entry) => (
                  <div key={entry.id} className="list-item">
                    <button
                      type="button"
                      className={`check ${entry.done ? 'is-on' : ''}`}
                      aria-label={entry.done ? `Mark ${entry.title} not done` : `Mark ${entry.title} done`}
                      onClick={() => upsert('homework', { ...entry, done: !entry.done })}
                    >
                      {entry.done ? '✓' : ''}
                    </button>
                    <span className="li-main">
                      <span className="li-title" style={{ textDecoration: entry.done ? 'line-through' : 'none' }}>
                        {entry.title}
                        {entry.demo && <span className="badge badge--demo" style={{ marginLeft: 6 }}>Demo</span>}
                      </span>
                      <span className="li-sub">
                        {entry.subject}
                        {entry.details ? ` · ${entry.details}` : ''}
                      </span>
                    </span>
                    <Badge tone={entry.done ? 'good' : daysUntil(entry.due) < 0 ? 'bad' : daysUntil(entry.due) <= 2 ? 'warn' : 'neutral'}>
                      {fmtDateShort(entry.due)}
                    </Badge>
                    <button type="button" className="icon-btn" aria-label={`Edit ${entry.title}`} onClick={() => setHomeworkForm(entry)}>
                      <Pencil size={14} />
                    </button>
                    <button type="button" className="icon-btn" aria-label={`Delete ${entry.title}`} onClick={() => remove('homework', entry.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </Panel>
      )}

      {tab === 'timetable' && (
        <Panel
          title="Weekly timetable"
          sub="Classes feed the Overview timeline and the Calendar"
          action={<Btn size="sm" variant="soft" icon={<Plus size={13} />} onClick={() => setSlotForm('new')}>Add class</Btn>}
        >
          {state.classes.length === 0 ? (
            <EmptyState
              icon={<CalendarClock />}
              title="Your timetable is empty"
              text="Add classes with weekday and time; they will appear in your daily agenda automatically."
              action={<Btn variant="soft" onClick={() => setSlotForm('new')}>Add a class</Btn>}
            />
          ) : (
            <div className="timetable">
              {WEEKDAYS.map((weekday) => {
                const slots = state.classes
                  .filter((slot) => slot.weekday === weekday)
                  .sort((a, b) => a.start.localeCompare(b.start))
                return (
                  <div key={weekday} className="tt-col">
                    <div className="tt-day">{weekdayShort(weekday)}</div>
                    {slots.length === 0 && <div className="tt-empty">—</div>}
                    {slots.map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        className="tt-slot"
                        onClick={() => setSlotForm(slot)}
                        title={`${slot.subject} · ${slot.start}–${slot.end}`}
                      >
                        <span className="tt-time">{slot.start}</span>
                        <span className="tt-subject">{slot.subject}</span>
                        <span className="tt-room">{slot.room}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
          {state.classes.length > 0 && (
            <p className="hint" style={{ marginTop: 10 }}>Click a class to edit or delete it.</p>
          )}
        </Panel>
      )}

      {tab === 'news' && (
        <Panel
          title="Announcements"
          sub="School notices you saved"
          action={<Btn size="sm" variant="soft" icon={<Plus size={13} />} onClick={() => setNewsForm('new')}>New note</Btn>}
          flush
        >
          {state.announcements.length === 0 ? (
            <EmptyState
              icon={<SchoolIcon />}
              title="No announcements"
              text="Paste important school notices here so they appear in Vault Intelligence."
              action={<Btn variant="soft" onClick={() => setNewsForm('new')}>Add a note</Btn>}
            />
          ) : (
            <div className="stack" style={{ padding: 14, gap: 8 }}>
              {[...state.announcements]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((entry) => (
                  <div key={entry.id} className="note-card">
                    <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                      <b style={{ fontSize: 13 }}>{entry.title}</b>
                      <span className="row" style={{ gap: 4 }}>
                        <span className="mono tiny dim">{fmtDateShort(entry.date)}</span>
                        <button type="button" className="icon-btn" aria-label={`Edit ${entry.title}`} onClick={() => setNewsForm(entry)}>
                          <Pencil size={13} />
                        </button>
                        <button type="button" className="icon-btn" aria-label={`Delete ${entry.title}`} onClick={() => remove('announcements', entry.id)}>
                          <Trash2 size={13} />
                        </button>
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>{entry.body}</p>
                  </div>
                ))}
            </div>
          )}
        </Panel>
      )}

      <GradeModal
        value={gradeForm}
        subjects={subjects}
        onClose={() => setGradeForm(null)}
        onSave={(grade) => {
          upsert('grades', grade)
          setGradeForm(null)
        }}
      />
      <HomeworkModal
        value={homeworkForm}
        subjects={subjects}
        onClose={() => setHomeworkForm(null)}
        onSave={(entry) => {
          upsert('homework', entry)
          setHomeworkForm(null)
        }}
      />
      <SlotModal
        value={slotForm}
        onClose={() => setSlotForm(null)}
        onDelete={(id) => {
          remove('classes', id)
          setSlotForm(null)
        }}
        onSave={(slot) => {
          upsert('classes', slot)
          setSlotForm(null)
        }}
      />
      <NewsModal
        value={newsForm}
        onClose={() => setNewsForm(null)}
        onSave={(entry) => {
          upsert('announcements', entry)
          setNewsForm(null)
        }}
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}

function ConnectionPanel({ onImport }: { onImport: () => void }) {
  const { state } = useApp()
  const connection = state.connections.ecoledirecte
  return (
    <Panel title="ÉcoleDirecte" sub="School account connection" delay={120}>
      <div className="stack">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Badge tone={connection.status === 'connected' ? 'good' : 'warn'}>
            {connection.status === 'connected' ? 'Connected' : 'Not connected'}
          </Badge>
          <span className="tiny dim">Status recorded in Settings → Connections</span>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
          ÉcoleDirecte does not publish a public API and its web endpoints require a personal login. VAULT therefore
          never asks for your school password: there is no supported automatic sync, and no credentials are stored in
          this browser.
        </p>
        <div className="stack" style={{ gap: 6 }}>
          <div className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <ShieldCheck size={14} color="#69d9ff" /> Grades, homework and timetable are entered manually or imported.
          </div>
          <div className="row" style={{ gap: 6, fontSize: 12.5 }}>
            <Info size={14} color="#8993a8" /> Import accepts the JSON export produced by VAULT or a hand-built file.
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Btn variant="soft" size="sm" icon={<Upload size={13} />} onClick={onImport}>
            Import school data
          </Btn>
        </div>
      </div>
    </Panel>
  )
}

function GradeModal({
  value,
  subjects,
  onClose,
  onSave,
}: {
  value: Grade | 'new' | null
  subjects: string[]
  onClose: () => void
  onSave: (grade: Grade) => void
}) {
  const editing = value && value !== 'new' ? value : null
  const [subject, setSubject] = useState('')
  const [title, setTitle] = useState('')
  const [score, setScore] = useState('')
  const [outOf, setOutOf] = useState('20')
  const [coefficient, setCoefficient] = useState('1')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState<string | null>(null)

  const key = value === null ? null : editing ? editing.id : 'new'
  if (value !== null && loaded !== key) {
    setLoaded(key)
    setSubject(editing?.subject || '')
    setTitle(editing?.title || '')
    setScore(editing ? String(editing.score) : '')
    setOutOf(editing ? String(editing.outOf) : '20')
    setCoefficient(editing ? String(editing.coefficient) : '1')
    setDate(editing?.date || todayISO())
    setError('')
  }
  if (value === null && loaded !== null) setLoaded(null)

  const submit = () => {
    const numericScore = Number(score)
    const numericOutOf = Number(outOf)
    const numericCoefficient = Number(coefficient)
    if (!subject.trim()) return setError('Choose or type a subject.')
    if (!title.trim()) return setError('Add a title for this grade.')
    if (!Number.isFinite(numericScore) || numericScore < 0) return setError('Enter a valid score.')
    if (!Number.isFinite(numericOutOf) || numericOutOf <= 0) return setError('Maximum must be greater than 0.')
    if (numericScore > numericOutOf) return setError('Score cannot exceed the maximum.')
    if (!Number.isFinite(numericCoefficient) || numericCoefficient <= 0) return setError('Coefficient must be positive.')
    onSave({
      id: editing?.id || uid('grade'),
      subject: subject.trim(),
      title: title.trim(),
      score: round(numericScore, 2),
      outOf: round(numericOutOf, 2),
      coefficient: round(numericCoefficient, 2),
      date,
    })
  }

  return (
    <Modal
      open={value !== null}
      onClose={onClose}
      title={editing ? 'Edit grade' : 'Add grade'}
      sub="Stored locally on this device"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>{editing ? 'Save changes' : 'Add grade'}</Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Subject">
          <Input value={subject} list="vault-subjects" onChange={(event) => setSubject(event.target.value)} placeholder="Mathematics" />
          <datalist id="vault-subjects">
            {subjects.map((entry) => (
              <option key={entry} value={entry} />
            ))}
          </datalist>
        </Field>
        <Field label="Title">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Chapter 4 test" />
        </Field>
        <Field label="Score">
          <Input value={score} inputMode="decimal" onChange={(event) => setScore(event.target.value)} placeholder="16" />
        </Field>
        <Field label="Out of">
          <Input value={outOf} inputMode="decimal" onChange={(event) => setOutOf(event.target.value)} />
        </Field>
        <Field label="Coefficient">
          <Input value={coefficient} inputMode="decimal" onChange={(event) => setCoefficient(event.target.value)} />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
      </div>
      {error && <p className="error-text">{error}</p>}
    </Modal>
  )
}

function HomeworkModal({
  value,
  subjects,
  onClose,
  onSave,
}: {
  value: Homework | 'new' | null
  subjects: string[]
  onClose: () => void
  onSave: (entry: Homework) => void
}) {
  const editing = value && value !== 'new' ? value : null
  const [subject, setSubject] = useState('')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [due, setDue] = useState(todayISO())
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState<string | null>(null)

  const key = value === null ? null : editing ? editing.id : 'new'
  if (value !== null && loaded !== key) {
    setLoaded(key)
    setSubject(editing?.subject || '')
    setTitle(editing?.title || '')
    setDetails(editing?.details || '')
    setDue(editing?.due || todayISO())
    setError('')
  }
  if (value === null && loaded !== null) setLoaded(null)

  const submit = () => {
    if (!title.trim()) return setError('Add a title.')
    if (!subject.trim()) return setError('Choose a subject.')
    if (!due) return setError('Pick a due date.')
    onSave({
      id: editing?.id || uid('hw'),
      subject: subject.trim(),
      title: title.trim(),
      details: details.trim(),
      due,
      done: editing?.done ?? false,
    })
  }

  return (
    <Modal
      open={value !== null}
      onClose={onClose}
      title={editing ? 'Edit homework' : 'Add homework'}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>{editing ? 'Save changes' : 'Add homework'}</Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Subject">
          <Input value={subject} list="vault-subjects-hw" onChange={(event) => setSubject(event.target.value)} placeholder="History" />
          <datalist id="vault-subjects-hw">
            {subjects.map((entry) => (
              <option key={entry} value={entry} />
            ))}
          </datalist>
        </Field>
        <Field label="Due date">
          <Input type="date" value={due} onChange={(event) => setDue(event.target.value)} />
        </Field>
        <Field label="Title" className="full">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Essay outline" />
        </Field>
        <Field label="Details" className="full">
          <Textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="What exactly is required?" />
        </Field>
      </div>
      {error && <p className="error-text">{error}</p>}
    </Modal>
  )
}

function SlotModal({
  value,
  onClose,
  onSave,
  onDelete,
}: {
  value: ClassSlot | 'new' | null
  onClose: () => void
  onSave: (slot: ClassSlot) => void
  onDelete: (id: string) => void
}) {
  const editing = value && value !== 'new' ? value : null
  const [subject, setSubject] = useState('')
  const [teacher, setTeacher] = useState('')
  const [room, setRoom] = useState('')
  const [weekday, setWeekday] = useState('1')
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('09:00')
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState<string | null>(null)

  const key = value === null ? null : editing ? editing.id : 'new'
  if (value !== null && loaded !== key) {
    setLoaded(key)
    setSubject(editing?.subject || '')
    setTeacher(editing?.teacher || '')
    setRoom(editing?.room || '')
    setWeekday(String(editing?.weekday ?? 1))
    setStart(editing?.start || '08:00')
    setEnd(editing?.end || '09:00')
    setError('')
  }
  if (value === null && loaded !== null) setLoaded(null)

  const submit = () => {
    if (!subject.trim()) return setError('Add a subject.')
    if (end <= start) return setError('End time must be after the start time.')
    onSave({
      id: editing?.id || uid('slot'),
      subject: subject.trim(),
      teacher: teacher.trim(),
      room: room.trim(),
      weekday: Number(weekday),
      start,
      end,
    })
  }

  return (
    <Modal
      open={value !== null}
      onClose={onClose}
      title={editing ? 'Edit class' : 'Add class'}
      footer={
        <>
          {editing && (
            <Btn variant="danger" icon={<Trash2 size={14} />} onClick={() => onDelete(editing.id)}>
              Delete
            </Btn>
          )}
          <span style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>{editing ? 'Save' : 'Add class'}</Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Subject">
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Physics" />
        </Field>
        <Field label="Weekday">
          <Select value={weekday} onChange={(event) => setWeekday(event.target.value)}>
            {WEEKDAYS.map((entry) => (
              <option key={entry} value={entry}>
                {weekdayShort(Number(entry))}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Start">
          <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
        </Field>
        <Field label="End">
          <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
        </Field>
        <Field label="Teacher">
          <Input value={teacher} onChange={(event) => setTeacher(event.target.value)} placeholder="Mrs. Laurent" />
        </Field>
        <Field label="Room">
          <Input value={room} onChange={(event) => setRoom(event.target.value)} placeholder="B204" />
        </Field>
      </div>
      {error && <p className="error-text">{error}</p>}
    </Modal>
  )
}

function NewsModal({
  value,
  onClose,
  onSave,
}: {
  value: Announcement | 'new' | null
  onClose: () => void
  onSave: (entry: Announcement) => void
}) {
  const editing = value && value !== 'new' ? value : null
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState<string | null>(null)

  const key = value === null ? null : editing ? editing.id : 'new'
  if (value !== null && loaded !== key) {
    setLoaded(key)
    setTitle(editing?.title || '')
    setBody(editing?.body || '')
    setDate(editing?.date || todayISO())
    setError('')
  }
  if (value === null && loaded !== null) setLoaded(null)

  const submit = () => {
    if (!title.trim()) return setError('Add a title.')
    onSave({
      id: editing?.id || uid('news'),
      title: title.trim(),
      body: body.trim(),
      date,
      source: 'school',
    })
  }

  return (
    <Modal
      open={value !== null}
      onClose={onClose}
      title={editing ? 'Edit announcement' : 'New announcement'}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>Save</Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Title" className="full">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label="Message" className="full">
          <Textarea value={body} onChange={(event) => setBody(event.target.value)} />
        </Field>
      </div>
      {error && <p className="error-text">{error}</p>}
    </Modal>
  )
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { upsert } = useApp()
  const [raw, setRaw] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const run = () => {
    try {
      const parsed = JSON.parse(raw) as {
        grades?: Partial<Grade>[]
        homework?: Partial<Homework>[]
        classes?: Partial<ClassSlot>[]
      }
      let count = 0
      for (const entry of parsed.grades || []) {
        if (!entry.subject || entry.score === undefined) continue
        upsert('grades', {
          id: uid('grade'),
          subject: String(entry.subject),
          title: String(entry.title || 'Imported grade'),
          score: Number(entry.score),
          outOf: Number(entry.outOf || 20),
          coefficient: Number(entry.coefficient || 1),
          date: entry.date || todayISO(),
        })
        count++
      }
      for (const entry of parsed.homework || []) {
        if (!entry.title) continue
        upsert('homework', {
          id: uid('hw'),
          subject: String(entry.subject || 'General'),
          title: String(entry.title),
          details: String(entry.details || ''),
          due: entry.due || todayISO(),
          done: Boolean(entry.done),
        })
        count++
      }
      for (const entry of parsed.classes || []) {
        if (!entry.subject) continue
        upsert('classes', {
          id: uid('slot'),
          subject: String(entry.subject),
          teacher: String(entry.teacher || ''),
          room: String(entry.room || ''),
          weekday: Number(entry.weekday ?? 1),
          start: entry.start || '08:00',
          end: entry.end || '09:00',
        })
        count++
      }
      setMessage(
        count > 0
          ? { ok: true, text: `Imported ${count} record(s).` }
          : { ok: false, text: 'No valid records found. Expected grades, homework or classes arrays.' },
      )
      if (count > 0) setRaw('')
    } catch {
      setMessage({ ok: false, text: 'That is not valid JSON. Check the file and try again.' })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import school data"
      sub="JSON only · processed locally, never uploaded"
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={run}>Import records</Btn>
        </>
      }
    >
      <div className="stack">
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
          Paste a JSON object with optional <code>grades</code>, <code>homework</code> and <code>classes</code> arrays.
          Example: <code>{'{"grades":[{"subject":"Maths","score":16,"outOf":20}]}'}</code>
        </p>
        <label className="btn btn--soft btn--sm" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
          <Upload size={13} /> Choose a JSON file
          <input
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              setRaw(await file.text())
              setMessage(null)
              event.target.value = ''
            }}
          />
        </label>
        <Textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder='{"grades":[{"subject":"Mathematics","title":"Test","score":16,"outOf":20,"coefficient":2}]}'
          style={{ minHeight: 180, fontFamily: 'var(--mono)', fontSize: 12 }}
        />
        {message && <p className={message.ok ? 'hint' : 'error-text'}>{message.text}</p>}
      </div>
    </Modal>
  )
}
