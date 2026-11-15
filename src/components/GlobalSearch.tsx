import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { categoryById } from '../lib/constants'
import { formatDate, formatMonth } from '../lib/format'
import { Icon } from './Icon'
import { Modal } from './UI'

interface Hit {
  id: string
  group: string
  title: string
  meta: string
  icon: string
  to: string
}

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, money } = useData()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  useEffect(() => {
    if (open) setQ('')
  }, [open])

  const hits = useMemo<Hit[]>(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 2) return []
    const out: Hit[] = []

    for (const t of data.transactions) {
      const cat = categoryById(t.category)
      const hay = `${t.name} ${cat.label} ${t.notes ?? ''}`.toLowerCase()
      if (hay.includes(term)) {
        out.push({
          id: `t_${t.id}`,
          group: 'Transactions',
          title: t.name,
          meta: `${cat.label} · ${formatDate(t.date)} · ${money(t.amount)}`,
          icon: cat.icon,
          to: `/transactions?q=${encodeURIComponent(t.name)}`,
        })
      }
    }

    for (const s of data.subscriptions) {
      const cat = categoryById(s.category)
      if (`${s.name} ${cat.label} ${s.description ?? ''}`.toLowerCase().includes(term)) {
        out.push({
          id: `s_${s.id}`,
          group: 'Abonnements',
          title: s.name,
          meta: `${money(s.amount)} · ${cat.label}`,
          icon: 'repeat',
          to: '/abonnements',
        })
      }
    }

    for (const g of data.goals) {
      if (`${g.name} ${g.description ?? ''}`.toLowerCase().includes(term)) {
        out.push({
          id: `g_${g.id}`,
          group: 'Objectifs',
          title: g.name,
          meta: `${money(g.saved)} sur ${money(g.target)}`,
          icon: g.icon,
          to: '/epargne',
        })
      }
    }

    for (const b of data.budgets) {
      for (const [catId, amount] of Object.entries(b.categories)) {
        const def = categoryById(catId)
        if (def.label.toLowerCase().includes(term)) {
          out.push({
            id: `b_${b.month}_${catId}`,
            group: 'Budgets',
            title: def.label,
            meta: `${money(amount)} · ${formatMonth(b.month)}`,
            icon: def.icon,
            to: '/budgets',
          })
        }
      }
    }

    for (const e of data.events) {
      if (e.title.toLowerCase().includes(term)) {
        out.push({
          id: `e_${e.id}`,
          group: 'Calendrier',
          title: e.title,
          meta: formatDate(e.date, 'long'),
          icon: 'calendar',
          to: '/calendrier',
        })
      }
    }

    return out.slice(0, 24)
  }, [q, data, money])

  const groups = useMemo(() => {
    const map = new Map<string, Hit[]>()
    for (const h of hits) {
      const list = map.get(h.group) ?? []
      list.push(h)
      map.set(h.group, list)
    }
    return [...map.entries()]
  }, [hits])

  const go = (hit: Hit) => {
    navigate(hit.to)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Recherche globale" subtitle="Transactions, abonnements, objectifs, budgets et calendrier." width="lg">
      <div className="search-field">
        <Icon name="search" size={17} />
        <input
          className="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hits[0]) go(hits[0])
          }}
          placeholder="Rechercher dans VAULT…"
          autoFocus
        />
      </div>

      {q.trim().length < 2 ? (
        <p className="search-hint">Saisissez au moins deux caractères pour lancer la recherche.</p>
      ) : hits.length === 0 ? (
        <p className="search-hint">Aucun résultat pour « {q.trim()} ».</p>
      ) : (
        <div className="search-results">
          {groups.map(([group, list]) => (
            <div key={group} className="search-group">
              <div className="search-group-label">{group}</div>
              {list.map((hit) => (
                <button key={hit.id} type="button" className="search-hit" onClick={() => go(hit)}>
                  <span className="search-hit-icon">
                    <Icon name={hit.icon} size={15} />
                  </span>
                  <span className="search-hit-main">
                    <span className="search-hit-title">{hit.title}</span>
                    <span className="search-hit-meta">{hit.meta}</span>
                  </span>
                  <Icon name="arrow-right" size={14} className="search-hit-arrow" />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
