import { useEffect, useState } from 'react'
import { Building2, CalendarDays, Check, Mail, MapPin, Phone, Ruler, User, X } from 'lucide-react'
import type { Property, PropertyKind, ListingType, PropertyStatus } from '../types'
import { Badge, Btn, Field, Modal } from './UI'
import { useApp } from '../context/AppContext'
import { shortDate } from '../lib/format'
import { statusLabel, statusTone } from './PropertyCard'

const KINDS: PropertyKind[] = ['Apartment', 'House', 'Villa', 'Penthouse', 'Office', 'Land']
const STATUSES: PropertyStatus[] = ['pending', 'approved', 'rejected']

interface FormState {
  title: string
  price: string
  location: string
  country: string
  kind: PropertyKind
  listingType: ListingType
  image: string
  beds: string
  baths: string
  area: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  agent: string
  description: string
  status: PropertyStatus
}

const blank: FormState = {
  title: '',
  price: '',
  location: '',
  country: '',
  kind: 'Apartment',
  listingType: 'sale',
  image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1100&q=70',
  beds: '2',
  baths: '1',
  area: '80',
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  agent: 'Sofia Marchetti',
  description: '',
  status: 'pending',
}

function toForm(property: Property): FormState {
  return {
    title: property.title,
    price: String(property.price),
    location: property.location,
    country: property.country,
    kind: property.kind,
    listingType: property.listingType,
    image: property.image,
    beds: String(property.beds),
    baths: String(property.baths),
    area: String(property.area),
    ownerName: property.owner.name,
    ownerEmail: property.owner.email,
    ownerPhone: property.owner.phone,
    agent: property.agent,
    description: property.description,
    status: property.status,
  }
}

export function PropertyFormModal({
  open,
  property,
  onClose,
}: {
  open: boolean
  property: Property | null
  onClose: () => void
}) {
  const { addProperty, updateProperty } = useApp()
  const [form, setForm] = useState<FormState>(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setForm(property ? toForm(property) : blank)
    setErrors({})
  }, [open, property])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const submit = () => {
    const next: Record<string, string> = {}
    if (form.title.trim().length < 3) next.title = 'Enter a listing title of at least 3 characters.'
    const price = Number(form.price)
    if (!Number.isFinite(price) || price <= 0) next.price = 'Price must be a number greater than 0.'
    if (form.location.trim().length < 2) next.location = 'Add a city or neighbourhood.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.ownerEmail)) next.ownerEmail = 'Enter a valid owner email.'
    if (form.ownerName.trim().length < 2) next.ownerName = 'Owner name is required.'
    const area = Number(form.area)
    if (!Number.isFinite(area) || area <= 0) next.area = 'Surface area must be greater than 0.'

    if (Object.keys(next).length) {
      setErrors(next)
      return
    }

    const payload = {
      title: form.title.trim(),
      price,
      location: form.location.trim(),
      country: form.country.trim() || 'United States',
      kind: form.kind,
      listingType: form.listingType,
      image: form.image.trim(),
      beds: Number(form.beds) || 0,
      baths: Number(form.baths) || 0,
      area,
      owner: {
        name: form.ownerName.trim(),
        email: form.ownerEmail.trim(),
        phone: form.ownerPhone.trim(),
      },
      agent: form.agent.trim() || 'Unassigned',
      description: form.description.trim(),
      status: form.status,
      rejectionReason: null,
      featured: property?.featured ?? false,
    }

    if (property) updateProperty(property.id, payload)
    else addProperty(payload)
    onClose()
  }

  return (
    <Modal
      open={open}
      title={property ? 'Edit listing' : 'New listing'}
      subtitle={property ? property.reference : 'Listings are created as pending until you approve them.'}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" icon={<Check size={16} />} onClick={submit}>
            {property ? 'Save changes' : 'Create listing'}
          </Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Listing title" wide>
          <input
            className={`input ${errors.title ? 'has-error' : ''}`}
            value={form.title}
            placeholder="Marina Loft with Skyline Terrace"
            onChange={(e) => set('title', e.target.value)}
          />
          {errors.title ? <span className="field-error">{errors.title}</span> : null}
        </Field>

        <Field label="Price (USD)">
          <input
            className={`input ${errors.price ? 'has-error' : ''}`}
            value={form.price}
            inputMode="decimal"
            placeholder="850000"
            onChange={(e) => set('price', e.target.value)}
          />
          {errors.price ? <span className="field-error">{errors.price}</span> : null}
        </Field>

        <Field label="Listing type">
          <select className="input" value={form.listingType} onChange={(e) => set('listingType', e.target.value as ListingType)}>
            <option value="sale">For sale</option>
            <option value="rent">For rent</option>
          </select>
        </Field>

        <Field label="Location">
          <input
            className={`input ${errors.location ? 'has-error' : ''}`}
            value={form.location}
            placeholder="Harbour District, Miami"
            onChange={(e) => set('location', e.target.value)}
          />
          {errors.location ? <span className="field-error">{errors.location}</span> : null}
        </Field>

        <Field label="Country">
          <input className="input" value={form.country} placeholder="United States" onChange={(e) => set('country', e.target.value)} />
        </Field>

        <Field label="Property type">
          <select className="input" value={form.kind} onChange={(e) => set('kind', e.target.value as PropertyKind)}>
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value as PropertyStatus)}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Bedrooms">
          <input className="input" value={form.beds} inputMode="numeric" onChange={(e) => set('beds', e.target.value)} />
        </Field>

        <Field label="Bathrooms">
          <input className="input" value={form.baths} inputMode="numeric" onChange={(e) => set('baths', e.target.value)} />
        </Field>

        <Field label="Surface (m²)">
          <input
            className={`input ${errors.area ? 'has-error' : ''}`}
            value={form.area}
            inputMode="numeric"
            onChange={(e) => set('area', e.target.value)}
          />
          {errors.area ? <span className="field-error">{errors.area}</span> : null}
        </Field>

        <Field label="Assigned agent">
          <input className="input" value={form.agent} onChange={(e) => set('agent', e.target.value)} />
        </Field>

        <Field label="Photo URL" wide hint="Any public image URL. A gradient placeholder is shown if it cannot load.">
          <input className="input" value={form.image} onChange={(e) => set('image', e.target.value)} />
        </Field>

        <Field label="Owner name">
          <input
            className={`input ${errors.ownerName ? 'has-error' : ''}`}
            value={form.ownerName}
            placeholder="Helena Duarte"
            onChange={(e) => set('ownerName', e.target.value)}
          />
          {errors.ownerName ? <span className="field-error">{errors.ownerName}</span> : null}
        </Field>

        <Field label="Owner email">
          <input
            className={`input ${errors.ownerEmail ? 'has-error' : ''}`}
            value={form.ownerEmail}
            placeholder="owner@example.com"
            onChange={(e) => set('ownerEmail', e.target.value)}
          />
          {errors.ownerEmail ? <span className="field-error">{errors.ownerEmail}</span> : null}
        </Field>

        <Field label="Owner phone">
          <input className="input" value={form.ownerPhone} placeholder="+1 305 555 0100" onChange={(e) => set('ownerPhone', e.target.value)} />
        </Field>

        <Field label="Description" wide>
          <textarea
            className="input textarea"
            rows={4}
            value={form.description}
            placeholder="Describe the property, finishes and highlights…"
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}

export function PropertyReviewModal({
  property,
  onClose,
}: {
  property: Property | null
  onClose: () => void
}) {
  const { moderateProperty, money } = useApp()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setRejecting(false)
    setReason('')
    setImageFailed(false)
  }, [property?.id])

  if (!property) return null

  return (
    <Modal
      open={Boolean(property)}
      title={property.title}
      subtitle={`${property.reference} · ${property.kind} · ${property.listingType === 'rent' ? 'For rent' : 'For sale'}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Close
          </Btn>
          <Btn
            variant="danger"
            icon={<X size={16} />}
            onClick={() => {
              if (!rejecting) {
                setRejecting(true)
                return
              }
              moderateProperty(property.id, 'rejected', reason.trim() || 'Did not meet listing guidelines.')
              onClose()
            }}
          >
            {rejecting ? 'Confirm rejection' : 'Reject'}
          </Btn>
          <Btn
            variant="success"
            icon={<Check size={16} />}
            onClick={() => {
              moderateProperty(property.id, 'approved')
              onClose()
            }}
          >
            Approve listing
          </Btn>
        </>
      }
    >
      <div className="review-media">
        {imageFailed ? (
          <div className="prop-media-fallback">
            <Building2 size={40} strokeWidth={1.3} />
            <span>{property.kind}</span>
          </div>
        ) : (
          <img src={property.image} alt={property.title} onError={() => setImageFailed(true)} />
        )}
        <div className="review-media-badges">
          <Badge tone={statusTone(property.status)}>{statusLabel(property.status)}</Badge>
          {property.featured ? <Badge tone="accent">Featured</Badge> : null}
        </div>
      </div>

      <div className="review-price">
        <strong>{money(property.price)}</strong>
        <span>{property.listingType === 'rent' ? 'per month' : 'asking price'}</span>
      </div>

      <div className="review-facts">
        <div>
          <MapPin size={15} />
          <span>{property.location}</span>
        </div>
        <div>
          <Ruler size={15} />
          <span>{property.area} m²</span>
        </div>
        <div>
          <Building2 size={15} />
          <span>
            {property.beds} bd · {property.baths} ba
          </span>
        </div>
        <div>
          <CalendarDays size={15} />
          <span>Submitted {shortDate(property.submittedAt)}</span>
        </div>
      </div>

      <p className="review-desc">{property.description || 'No description provided by the owner.'}</p>

      <div className="review-owner">
        <h4>Owner</h4>
        <div className="review-owner-grid">
          <span>
            <User size={14} /> {property.owner.name}
          </span>
          <span>
            <Mail size={14} /> {property.owner.email}
          </span>
          <span>
            <Phone size={14} /> {property.owner.phone || '—'}
          </span>
        </div>
        <p className="review-agent">Assigned agent · {property.agent}</p>
      </div>

      {property.status === 'rejected' && property.rejectionReason ? (
        <p className="review-reason">Rejection note · {property.rejectionReason}</p>
      ) : null}

      {rejecting ? (
        <Field label="Rejection note" hint="Shared with the owner so they can fix the listing.">
          <textarea
            className="input textarea"
            rows={3}
            value={reason}
            placeholder="Photos do not match the property address."
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      ) : null}
    </Modal>
  )
}
