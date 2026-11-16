import { useState } from 'react'
import { Bath, BedDouble, Building2, Check, Eye, MapPin, Pencil, Ruler, Star, Trash2, X } from 'lucide-react'
import type { Property } from '../types'
import { Badge, Btn } from './UI'
import { Avatar } from './UI'
import { shortDate } from '../lib/format'
import { useApp } from '../context/AppContext'

export function statusTone(status: Property['status']) {
  if (status === 'approved') return 'success' as const
  if (status === 'rejected') return 'danger' as const
  return 'warning' as const
}

export function statusLabel(status: Property['status']) {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return 'Pending'
}

export function PropertyCard({
  property,
  index = 0,
  onReview,
  onEdit,
  onDelete,
  compact = false,
}: {
  property: Property
  index?: number
  onReview: (property: Property) => void
  onEdit: (property: Property) => void
  onDelete: (property: Property) => void
  compact?: boolean
}) {
  const { money, moderateProperty, toggleFeatured } = useApp()
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <article className="prop-card" style={{ animationDelay: `${Math.min(index, 9) * 45}ms` }}>
      <div className="prop-media">
        {imageFailed ? (
          <div className="prop-media-fallback">
            <Building2 size={34} strokeWidth={1.4} />
            <span>{property.kind}</span>
          </div>
        ) : (
          <img
            src={property.image}
            alt={property.title}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="prop-media-top">
          <Badge tone={statusTone(property.status)}>{statusLabel(property.status)}</Badge>
          <button
            className={`fav-btn ${property.featured ? 'is-on' : ''}`}
            onClick={() => toggleFeatured(property.id)}
            aria-label={property.featured ? 'Remove from featured' : 'Mark as featured'}
            aria-pressed={property.featured}
          >
            <Star size={15} fill={property.featured ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="prop-price">
          <strong>{money(property.price, true)}</strong>
          <span>{property.listingType === 'rent' ? '/ month' : 'sale price'}</span>
        </div>
      </div>

      <div className="prop-body">
        <div className="prop-kicker">
          <span className="chip">{property.kind}</span>
          <span className="prop-ref">{property.reference}</span>
        </div>
        <h3 className="prop-title">{property.title}</h3>
        <p className="prop-loc">
          <MapPin size={13} />
          {property.location}
        </p>

        {!compact ? (
          <div className="prop-meta">
            {property.beds > 0 ? (
              <span>
                <BedDouble size={14} /> {property.beds} bd
              </span>
            ) : null}
            {property.baths > 0 ? (
              <span>
                <Bath size={14} /> {property.baths} ba
              </span>
            ) : null}
            <span>
              <Ruler size={14} /> {property.area} m²
            </span>
            <span>
              <Eye size={14} /> {property.views}
            </span>
          </div>
        ) : null}

        <div className="prop-owner">
          <Avatar name={property.owner.name} hue={property.owner.name.length * 37} size={32} />
          <div className="prop-owner-text">
            <strong>{property.owner.name}</strong>
            <small>Submitted {shortDate(property.submittedAt)}</small>
          </div>
        </div>

        {property.status === 'rejected' && property.rejectionReason ? (
          <p className="prop-reason">{property.rejectionReason}</p>
        ) : null}
      </div>

      <div className="prop-actions">
        <Btn variant="soft" size="sm" icon={<Eye size={15} />} onClick={() => onReview(property)}>
          Review
        </Btn>
        {property.status !== 'approved' ? (
          <Btn
            variant="primary"
            size="sm"
            icon={<Check size={15} />}
            onClick={() => moderateProperty(property.id, 'approved')}
          >
            Approve
          </Btn>
        ) : (
          <Btn
            variant="ghost"
            size="sm"
            icon={<X size={15} />}
            onClick={() => moderateProperty(property.id, 'pending')}
          >
            Reopen
          </Btn>
        )}
        {property.status !== 'rejected' ? (
          <Btn
            variant="ghost"
            size="sm"
            icon={<X size={15} />}
            onClick={() =>
              moderateProperty(
                property.id,
                'rejected',
                'Listing did not meet the publishing guidelines.',
              )
            }
          >
            Reject
          </Btn>
        ) : null}
        <div className="prop-actions-icons">
          <button className="icon-btn sm" onClick={() => onEdit(property)} aria-label={`Edit ${property.title}`}>
            <Pencil size={15} />
          </button>
          <button className="icon-btn sm danger" onClick={() => onDelete(property)} aria-label={`Delete ${property.title}`}>
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  )
}
