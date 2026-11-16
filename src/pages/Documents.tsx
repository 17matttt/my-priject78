import { useEffect, useMemo, useState } from 'react'
import {
  Download,
  Eye,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  Paperclip,
  Plus,
  Search,
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
  Select,
  StatCard,
} from '../components/UI'
import { bytes, uid } from '../lib/format'
import { fmtDateShort } from '../lib/date'
import { deleteFile, downloadDocument, getFile, putFile } from '../lib/fileStore'
import type { VaultDocument } from '../types'

const FOLDERS = ['All', 'School', 'Personal', 'Admin', 'Email']

export default function Documents() {
  const { state, upsert, remove } = useApp()
  const [folder, setFolder] = useState('All')
  const [query, setQuery] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [preview, setPreview] = useState<VaultDocument | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const documents = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.documents
      .filter((doc) => (folder === 'All' ? true : doc.folder === folder))
      .filter((doc) => (q ? `${doc.name} ${doc.category}`.toLowerCase().includes(q) : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [state.documents, folder, query])

  const totalSize = state.documents.reduce((sum, doc) => sum + doc.size, 0)
  const withBlob = state.documents.filter((doc) => doc.hasBlob).length

  const handleFiles = async (files: File[], targetFolder: string, category: string) => {
    setBusy(true)
    setError('')
    try {
      for (const file of files) {
        const id = uid('doc')
        const stored = await putFile(id, file)
        upsert('documents', {
          id,
          name: file.name,
          folder: targetFolder,
          category,
          size: file.size,
          type: file.type || 'application/octet-stream',
          createdAt: new Date().toISOString(),
          hasBlob: stored,
        })
        if (!stored) {
          setError('This browser refused to store the file contents; the entry was saved as metadata only.')
        }
      }
      setUploadOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const removeDocument = async (doc: VaultDocument) => {
    await deleteFile(doc.id)
    remove('documents', doc.id)
    if (preview?.id === doc.id) setPreview(null)
  }

  return (
    <div className="page">
      <PageHead
        title="Documents"
        sub={`${state.documents.length} files · ${bytes(totalSize)} stored in this browser`}
        eyebrow="Library"
      >
        <Btn variant="primary" icon={<Plus size={15} />} onClick={() => setUploadOpen(true)}>
          Upload files
        </Btn>
      </PageHead>

      <div className="grid-3" style={{ marginBottom: 14 }}>
        <StatCard label="Documents" value={state.documents.length} hint="Metadata in local storage" icon={<FileText size={16} />} />
        <StatCard label="Stored files" value={withBlob} hint="Contents kept in IndexedDB" icon={<HardDrive size={16} />} />
        <StatCard label="Total size" value={bytes(totalSize)} hint="On this device only" icon={<Paperclip size={16} />} />
      </div>

      <Panel
        title="Library"
        sub="Files never leave your browser"
        action={
          <div className="row" style={{ gap: 6 }}>
            <Search size={14} color="#8993a8" />
            <Input
              value={query}
              placeholder="Search documents"
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search documents"
              style={{ width: 190 }}
            />
          </div>
        }
      >
        <div className="chip-scroll" style={{ marginBottom: 12 }}>
          {FOLDERS.map((entry) => (
            <Chip
              key={entry}
              active={folder === entry}
              onClick={() => setFolder(entry)}
              count={entry === 'All' ? state.documents.length : state.documents.filter((doc) => doc.folder === entry).length}
            >
              {entry}
            </Chip>
          ))}
        </div>

        {documents.length === 0 ? (
          <EmptyState
            icon={<FolderOpen />}
            title={query ? 'No matching documents' : 'This folder is empty'}
            text="Upload school papers, contracts or receipts. Contents are saved in this browser's IndexedDB, not on a server."
            action={
              <Btn variant="soft" icon={<Upload size={14} />} onClick={() => setUploadOpen(true)}>
                Upload a file
              </Btn>
            }
          />
        ) : (
          <div className="doc-grid">
            {documents.map((doc) => (
              <div key={doc.id} className="doc-card">
                <div className="doc-thumb">
                  {doc.type.startsWith('image/') ? <ImageIcon size={22} /> : <FileText size={22} />}
                </div>
                <div className="doc-name" title={doc.name}>
                  {doc.name}
                </div>
                <div className="doc-meta">
                  <span>{bytes(doc.size)}</span>
                  <span>·</span>
                  <span>{fmtDateShort(doc.createdAt.slice(0, 10))}</span>
                </div>
                <div className="row" style={{ gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  <Badge tone="violet">{doc.folder}</Badge>
                  {doc.demo && <span className="badge badge--demo">Demo</span>}
                  {!doc.hasBlob && <Badge tone="warn">No file</Badge>}
                </div>
                <div className="row" style={{ gap: 2, marginTop: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="icon-btn" aria-label={`Preview ${doc.name}`} onClick={() => setPreview(doc)}>
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Download ${doc.name}`}
                    onClick={() => void downloadDocument(doc.id, doc.name)}
                  >
                    <Download size={14} />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Delete ${doc.name}`} onClick={() => void removeDocument(doc)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <UploadModal open={uploadOpen} busy={busy} error={error} onClose={() => setUploadOpen(false)} onUpload={handleFiles} />
      <PreviewModal document={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

function UploadModal({
  open,
  busy,
  error,
  onClose,
  onUpload,
}: {
  open: boolean
  busy: boolean
  error: string
  onClose: () => void
  onUpload: (files: File[], folder: string, category: string) => Promise<void>
}) {
  const [files, setFiles] = useState<File[]>([])
  const [folder, setFolder] = useState('School')
  const [category, setCategory] = useState('Document')

  useEffect(() => {
    if (!open) {
      setFiles([])
      setCategory('Document')
    }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload documents"
      sub="Saved in this browser only · 10 MB per file recommended"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            disabled={busy || files.length === 0}
            onClick={() => void onUpload(files, folder, category)}
          >
            {busy ? 'Saving…' : `Save ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
          </Btn>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Files" className="full">
          <label className="dropzone" style={{ cursor: 'pointer' }}>
            <Upload size={18} />
            <span>{files.length === 0 ? 'Choose files from your computer' : `${files.length} file(s) selected`}</span>
            <input
              type="file"
              multiple
              hidden
              onChange={(event) => {
                setFiles(Array.from(event.target.files || []))
                event.target.value = ''
              }}
            />
          </label>
        </Field>
        <Field label="Folder">
          <Select value={folder} onChange={(event) => setFolder(event.target.value)}>
            {FOLDERS.filter((entry) => entry !== 'All').map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Homework, invoice…" />
        </Field>
      </div>
      {files.length > 0 && (
        <div className="stack" style={{ gap: 4, marginTop: 10 }}>
          {files.map((file) => (
            <div key={file.name} className="list-item">
              <span className="li-icon"><Folder size={13} /></span>
              <span className="li-main">
                <span className="li-title">{file.name}</span>
                <span className="li-sub">{bytes(file.size)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
    </Modal>
  )
}

function PreviewModal({ document: doc, onClose }: { document: VaultDocument | null; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading')

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    setUrl(null)
    setText(null)
    setStatus('loading')
    if (!doc) return
    if (!doc.hasBlob) {
      setStatus('missing')
      return
    }
    void (async () => {
      const blob = await getFile(doc.id)
      if (cancelled) return
      if (!blob) {
        setStatus('missing')
        return
      }
      if (doc.type.startsWith('text/') || doc.type === 'application/json') {
        setText((await blob.text()).slice(0, 8000))
      } else {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      }
      setStatus('ready')
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [doc])

  return (
    <Modal open={Boolean(doc)} onClose={onClose} title={doc?.name || 'Preview'} sub={doc ? `${bytes(doc.size)} · ${doc.type}` : ''} size="lg">
      {status === 'loading' && <p className="hint">Loading preview…</p>}
      {status === 'missing' && (
        <div className="stack">
          <p className="hint" style={{ margin: 0 }}>
            Only metadata is stored for this document, so there is no file to preview. Re-upload the file to keep its contents on this device.
          </p>
        </div>
      )}
      {status === 'ready' && doc && (
        <div className="preview-stage">
          {text !== null && <pre className="preview-text">{text}</pre>}
          {url && doc.type.startsWith('image/') && <img src={url} alt={doc.name} className="preview-img" />}
          {url && doc.type === 'application/pdf' && <iframe src={url} title={doc.name} className="preview-frame" />}
          {url && !doc.type.startsWith('image/') && doc.type !== 'application/pdf' && (
            <p className="hint" style={{ margin: 0 }}>
              This file type cannot be previewed here. Use download to open it with your computer.
            </p>
          )}
        </div>
      )}
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <Btn variant="soft" size="sm" icon={<Download size={13} />} onClick={() => doc && void downloadDocument(doc.id, doc.name)}>
          Download
        </Btn>
      </div>
    </Modal>
  )
}
