import { useMemo, useState } from 'react'
import { Check, Plug, RefreshCw, Zap } from 'lucide-react'
import { Badge, Btn, PageHeader, Panel, SearchInput, Segmented } from '../components/UI'
import { useApp } from '../context/AppContext'
import { shortDate } from '../lib/format'

export function Integrations() {
  const { data, toggleIntegration } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'connected' | 'available'>('all')

  const connected = data.integrations.filter((i) => i.connected).length

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return data.integrations.filter((item) => {
      if (filter === 'connected' && !item.connected) return false
      if (filter === 'available' && item.connected) return false
      if (!needle) return true
      return `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(needle)
    })
  }, [data.integrations, filter, query])

  return (
    <>
      <PageHeader
        eyebrow="Ecosystem"
        title="Integrations"
        subtitle="Connect the tools the agency already runs on."
        actions={
          <Badge tone="accent">
            <Zap size={13} /> {connected} active
          </Badge>
        }
      />

      <Panel
        tone="glass"
        title="Directory"
        subtitle={`${visible.length} integrations`}
        actions={
          <div className="toolbar-inline">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All', count: data.integrations.length },
                { value: 'connected', label: 'Connected', count: connected },
                { value: 'available', label: 'Available' },
              ]}
            />
            <SearchInput value={query} onChange={setQuery} placeholder="Search integrations…" />
          </div>
        }
      >
        <div className="integration-grid">
          {visible.map((item) => (
            <article key={item.id} className={`integration-card ${item.connected ? 'is-connected' : ''}`}>
              <header>
                <span className="integration-mark" style={{ background: item.accent }}>
                  {item.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <h4>{item.name}</h4>
                  <span className="integration-cat">{item.category}</span>
                </div>
                {item.connected ? (
                  <span className="integration-check">
                    <Check size={14} />
                  </span>
                ) : null}
              </header>
              <p>{item.description}</p>
              <footer>
                <span className="integration-sync">
                  <RefreshCw size={13} />
                  {item.lastSync ? `Synced ${shortDate(item.lastSync)}` : 'Never synced'}
                </span>
                <Btn
                  size="sm"
                  variant={item.connected ? 'ghost' : 'soft'}
                  icon={item.connected ? undefined : <Plug size={14} />}
                  onClick={() => toggleIntegration(item.id)}
                >
                  {item.connected ? 'Disconnect' : 'Connect'}
                </Btn>
              </footer>
            </article>
          ))}
        </div>
        {!visible.length ? (
          <p className="muted-note">No integrations match this filter.</p>
        ) : null}
      </Panel>
    </>
  )
}
