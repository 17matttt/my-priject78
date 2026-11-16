import { useMemo, useState } from 'react'
import { Building2, CheckCircle2, Download, Filter, Plus, SlidersHorizontal } from 'lucide-react'
import { Badge, Btn, EmptyState, PageHeader, Panel, SearchInput, Segmented } from '../components/UI'
import { PropertyCard } from '../components/PropertyCard'
import { PropertyFormModal, PropertyReviewModal } from '../components/PropertyModal'
import { ConfirmDialog } from '../components/Confirm'
import { useApp } from '../context/AppContext'
import { propertyStats } from '../lib/analytics'
import { downloadCsv } from '../lib/export'
import { shortDate } from '../lib/format'
import type { Property, PropertyStatus } from '../types'

type FilterKey = 'all' | PropertyStatus
type SortKey = 'newest' | 'oldest' | 'price-desc' | 'price-asc' | 'title'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'title', label: 'Title A–Z' },
]

export function Moderation() {
  const { data, money, deleteProperty } = useApp()
  const [filter, setFilter] = useState<FilterKey>('pending')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Property | null>(null)
  const [reviewing, setReviewing] = useState<Property | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Property | null>(null)

  const stats = propertyStats(data)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = data.properties.filter((property) => {
      if (filter !== 'all' && property.status !== filter) return false
      if (!needle) return true
      return [
        property.title,
        property.location,
        property.country,
        property.kind,
        property.reference,
        property.owner.name,
        property.owner.email,
        property.agent,
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })

    const sorted = [...filtered]
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
        break
      case 'price-desc':
        sorted.sort((a, b) => b.price - a.price)
        break
      case 'price-asc':
        sorted.sort((a, b) => a.price - b.price)
        break
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
      default:
        sorted.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    }
    return sorted
  }, [data.properties, filter, query, sort])

  const exportCsv = () => {
    downloadCsv('vantage-moderation-queue.csv', [
      ['Reference', 'Title', 'Status', 'Type', 'Price', 'Location', 'Owner', 'Owner email', 'Agent', 'Submitted'],
      ...visible.map((p) => [
        p.reference,
        p.title,
        p.status,
        p.kind,
        p.price,
        p.location,
        p.owner.name,
        p.owner.email,
        p.agent,
        shortDate(p.submittedAt),
      ]),
    ])
  }

  return (
    <>
      <PageHeader
        eyebrow="Listing quality"
        title="Moderation"
        subtitle="Review every submitted property before it goes live on the marketplace."
        actions={
          <>
            <Btn variant="ghost" icon={<Download size={16} />} onClick={exportCsv}>
              Export CSV
            </Btn>
            <Btn
              icon={<Plus size={16} />}
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Add listing
            </Btn>
          </>
        }
      />

      <div className="mod-summary">
        <div className="mod-chip">
          <span className="dot dot-warning" />
          <div>
            <strong>{stats.pending}</strong>
            <small>awaiting review</small>
          </div>
        </div>
        <div className="mod-chip">
          <span className="dot dot-success" />
          <div>
            <strong>{stats.approved}</strong>
            <small>approved</small>
          </div>
        </div>
        <div className="mod-chip">
          <span className="dot dot-danger" />
          <div>
            <strong>{stats.rejected}</strong>
            <small>rejected</small>
          </div>
        </div>
        <div className="mod-chip">
          <span className="dot dot-info" />
          <div>
            <strong>{money(stats.pendingValue, true)}</strong>
            <small>value in queue</small>
          </div>
        </div>
      </div>

      <Panel
        tone="glass"
        className="toolbar-panel"
        title="Property submissions"
        subtitle={`${visible.length} of ${stats.total} listings shown`}
        action={
          <Badge tone="accent">
            <SlidersHorizontal size={12} /> {SORTS.find((s) => s.value === sort)?.label}
          </Badge>
        }
      >
        <div className="toolbar">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: stats.total },
              { value: 'pending', label: 'Pending', count: stats.pending },
              { value: 'approved', label: 'Approved', count: stats.approved },
              { value: 'rejected', label: 'Rejected', count: stats.rejected },
            ]}
          />
          <div className="toolbar-right">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search title, owner, city…"
            />
            <div className="select-wrap">
              <Filter size={15} />
              <select
                className="input select"
                value={sort}
                aria-label="Sort listings"
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {visible.length ? (
          <div className="prop-grid">
            {visible.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onReview={setReviewing}
                onEdit={(p) => {
                  setEditing(p)
                  setFormOpen(true)
                }}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={query ? <Filter size={22} /> : <CheckCircle2 size={22} />}
            title={query ? 'No listings match your search' : 'Nothing to review here'}
            text={
              query
                ? 'Try a different owner, city or reference number.'
                : 'Switch the filter or add a new listing to start a moderation queue.'
            }
            action={
              query ? (
                <Btn variant="soft" onClick={() => setQuery('')}>
                  Clear search
                </Btn>
              ) : (
                <Btn
                  icon={<Building2 size={16} />}
                  onClick={() => {
                    setEditing(null)
                    setFormOpen(true)
                  }}
                >
                  Add listing
                </Btn>
              )
            }
          />
        )}
      </Panel>

      <PropertyFormModal
        open={formOpen}
        property={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
      />
      <PropertyReviewModal property={reviewing} onClose={() => setReviewing(null)} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete listing"
        message={pendingDelete ? `“${pendingDelete.title}” will be removed permanently.` : ''}
        onConfirm={() => pendingDelete && deleteProperty(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </>
  )
}
