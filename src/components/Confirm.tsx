import { AlertTriangle } from 'lucide-react'
import { Btn, Modal } from './UI'

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={message}
      width="sm"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="danger"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Btn>
        </>
      }
    >
      <div className="confirm-body">
        <span className="confirm-icon">
          <AlertTriangle size={22} />
        </span>
        <p>
          This action is immediate and is recorded in the activity log. It cannot be undone from
          here.
        </p>
      </div>
    </Modal>
  )
}
