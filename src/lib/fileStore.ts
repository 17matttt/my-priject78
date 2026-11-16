const DB_NAME = 'vault-documents'
const STORE = 'files'
const VERSION = 1

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDb()
  if (!db) return null
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, mode)
    const request = run(tx.objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    tx.oncomplete = () => db.close()
    tx.onerror = () => db.close()
  })
}

export async function putFile(id: string, blob: Blob): Promise<boolean> {
  const result = await withStore('readwrite', (store) => store.put(blob, id))
  return result !== null
}

export async function getFile(id: string): Promise<Blob | null> {
  const result = await withStore<Blob>('readonly', (store) => store.get(id))
  return result instanceof Blob ? result : null
}

export async function deleteFile(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
}

export async function clearFiles(): Promise<void> {
  await withStore('readwrite', (store) => store.clear())
}

export async function downloadDocument(id: string, name: string): Promise<boolean> {
  const blob = await getFile(id)
  if (!blob) return false
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return true
}
