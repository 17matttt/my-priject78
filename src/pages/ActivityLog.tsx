import { useMemo, useState } from 'react'
import {
  Building2,
  History,
  Landmark,
  ListChecks,
  Megaphone,
  Server,
  Headphones,
  Users,
} from 'lucide-react'
import { Avatar, Badge, EmptyState, PageHeader, Panel, SearchInput, Segmented } from '../components/UI'
import { useApp } from '../context/AppContext'
import { relativeTime } from '../lib/format'
import type { ActivityType } from '../types'

const ICONS: Record<ActivityType, typeof Building2> = {
  property: Building2,
  user: Users,
  finance: Landmark,
  task: ListChecks,
  support: Headphones,
  system: Server,
  announcement: Megaphone,
}

const TONE: Record<ActivityType, 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  property: 'accent',
  user: 'info',
  finance: 'success',
  task: 'warning',
  support: 'danger',
  system: 'neutral',
  announcement: 'info',
}

export function ActivityLog() {
  const { data } = useApp()
  const [filter, setFilter] = useState<'all' | ActivityType>('all')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.activity.filter((entry) => {
      if (filter !== 'all' && entry.type !== filter) return false
      if (!needle) return true
      return `${entry.actor} ${entry.action} ${entry.target}`.toLowerCase().includes(needle)
    })
  }, [data.activity, filter, query])

  return (
    <>
      <PageHeader
        eyebrow="Audit"
        title="Activity log"
        subtitle="Every administrative action, newest first."
      />

      <Panel
        tone="glass"
        title="Timeline"
        subtitle={`${visible.length} of ${data.activity.length} events`}
        actions={
          <div className="toolbar-inline">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'property', label: 'Listings' },
                { value: 'user', label: 'Users' },
                { value: 'finance', label: 'Finance' },
                { value: 'support', label: 'Support' },
                { value: 'system', label: 'System' },
              ]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder="Search actions…" />
          </div>
        }
      >
        {visible.length ? (
          <ul className="timeline">
            {visible.map((entry) => {
              const Icon = ICONS[entry.type] ?? History
              return (
                <li key={entry.id}>
                  <span className={`timeline-dot tone-${TONE[entry.type]}`}>
                    <Icon size={15} />
                  </span>
                  <div className="timeline-body">
                    <div className="timeline-top">
                      <Avatar name={entry.actor} hue={entry.actor.length * 43} size={26} />
                      <strong>{entry.actor}</strong>
                      <span>{entry.action}</span>
                      <em>{entry.target}</em>
                    </div>
                    <div className="timeline-meta">
                      <span>{relativeTime(entry.at)}</span>
                      <Badge tone="neutral">{entry.type}</Badge>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<History size={22} />}
            title="No matching activity"
            text="Actions you take across the platform are recorded here."
          />
        )}
      </Panel>
    </>
  )
}
