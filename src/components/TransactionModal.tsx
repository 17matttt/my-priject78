import { useEffect, useState } from 'react'
import { categoriesFor, categoryColor } from '../lib/constants'
import { currencySymbol, parseAmount, todayIso } from '../lib/format'
import type { Transaction, TxType } from '../lib/types'
import { useData } from '../context/DataContext'
import { Field, Modal, useToast } from './UI'

interface Props {
  open: boolean
  onClose: () => void
  initial?: Transaction | null
  currency: string
  defaultType?: TxType
}

export default function TransactionModal({ open, onClose, initial, currency, defaultType = 'expense' }: Props) {
  const { addTransaction, editTransaction } = useData()
  const notify = useToast()

  const [type, setType] = useState<TxType>(defaultType)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(categoriesFor(defaultType)[0].id)
  const [date, setDate] = useState(todayIso())
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setBusy(false)
    if (initial) {
      setType(initial.type)
      setAmount(String(initial.amount))
      setCategory(initial.category)
      setDate(initial.occurred_on)
      setDescription(initial.description ?? '')
    } else {
      setType(defaultType)
      setAmount('')
      setCategory(categoriesFor(defaultType)[0].id)
      setDate(todayIso())
      setDescription('')
    }
  }, [open, initial, defaultType])

  const changeType = (next: TxType) => {
    setType(next)
    const options = categoriesFor(next)
    if (!options.some((c) => c.id === category)) setCategory(options[0].id)
  }

  const submit = async () => {
    const value = parseAmount(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!category) {
      setError('Choose a category.')
      return
    }
    if (!date) {
      setError('Choose a date.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const payload = { type, amount: value, category, description, occurred_on: date }
      if (initial) {
        await editTransaction(initial.id, payload)
        notify('Transaction updated.', 'ok')
      } else {
        await addTransaction(payload)
        notify(`${type === 'income' ? 'Income' : 'Expense'} added.`, 'ok')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this transaction.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit transaction' : 'New transaction'}
      subtitle={initial ? 'Update the details of this entry.' : 'Record money in or out of your accounts.'}
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : initial ? 'Save changes' : 'Add transaction'}
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <div className="segmented full">
          <button
            type="button"
            className={type === 'expense' ? 'on' : ''}
            onClick={() => changeType('expense')}
          >
            Expense
          </button>
          <button
            type="button"
            className={type === 'income' ? 'on lime' : ''}
            onClick={() => changeType('income')}
          >
            Income
          </button>
        </div>

        <div className="amount-input">
          <span className="sym">{currencySymbol(currency)}</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            aria-label="Amount"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit()
            }}
          />
        </div>

        <div className="form-grid">
          <Field label="Category" htmlFor="tx-category">
            <select
              id="tx-category"
              className="select"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categoriesFor(type).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Date" htmlFor="tx-date">
            <input
              id="tx-date"
              className="input"
              type="date"
              value={date}
              max={todayIso()}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>

          <Field label="Description" htmlFor="tx-description" className="span-2">
            <input
              id="tx-description"
              className="input"
              value={description}
              maxLength={200}
              placeholder="e.g. Weekly grocery run"
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <span className="dot" style={{ background: categoryColor(category) }} />
          <span className="tx-meta" style={{ margin: 0 }}>
            {type === 'income' ? 'Money in' : 'Money out'} · {currency}
          </span>
        </div>

        {error ? <p className="field-error">{error}</p> : null}
      </div>
    </Modal>
  )
}
