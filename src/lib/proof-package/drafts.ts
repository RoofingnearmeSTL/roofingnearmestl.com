// Proof package drafts saved in this browser (IndexedDB). Nothing leaves the computer, and clearing the browser's
// site data removes them. Two stores: "packages" (the form, small) and "files" (photo and page images, large).
import type { ProofPackage, StoredFile } from './model'

const DB_NAME = 'rnm-proof-packages'
const VERSION = 1

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('This browser cannot save drafts.'))
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('packages')) db.createObjectStore('packages', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('files')) {
        const files = db.createObjectStore('files', { keyPath: 'id' })
        files.createIndex('packageId', 'packageId')
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(new Error('Drafts could not be opened in this browser.'))
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(new Error(tx.error?.name === 'QuotaExceededError' ? 'This computer is out of space for drafts. Remove an old draft or some photos.' : 'The draft could not be saved.'))
    tx.onabort = tx.onerror
  })
}

function all<T>(req: IDBRequest): Promise<T[]> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(new Error('Drafts could not be read.'))
  })
}

export type DraftSummary = { id: string; address: string; updatedAt: string; photos: number }

export async function listDrafts(): Promise<DraftSummary[]> {
  const db = await open()
  try {
    const rows = await all<ProofPackage>(db.transaction('packages').objectStore('packages').getAll())
    return rows.map((p) => ({ id: p.id, address: p.address || 'No address yet', updatedAt: p.updatedAt, photos: p.photos.length }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } finally {
    db.close()
  }
}

export async function loadDraft(id: string): Promise<{ pkg: ProofPackage; files: StoredFile[] } | null> {
  const db = await open()
  try {
    const tx = db.transaction(['packages', 'files'])
    const pkg = await new Promise<ProofPackage | undefined>((resolve, reject) => {
      const r = tx.objectStore('packages').get(id)
      r.onsuccess = () => resolve(r.result as ProofPackage | undefined)
      r.onerror = () => reject(new Error('The draft could not be read.'))
    })
    if (!pkg) return null
    const files = await all<StoredFile & { packageId: string }>(tx.objectStore('files').index('packageId').getAll(id))
    return { pkg, files: files.map((f) => ({ id: f.id, name: f.name, type: f.type, dataUrl: f.dataUrl, width: f.width, height: f.height, takenAt: f.takenAt })) }
  } finally {
    db.close()
  }
}

/** Save the form and any new files; remove files the package no longer uses. */
export async function saveDraft(pkg: ProofPackage, newFiles: StoredFile[], keepIds: Set<string>): Promise<void> {
  const db = await open()
  try {
    const tx = db.transaction(['packages', 'files'], 'readwrite')
    tx.objectStore('packages').put(pkg)
    const files = tx.objectStore('files')
    for (const f of newFiles) files.put({ ...f, packageId: pkg.id })
    const existing = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const r = files.index('packageId').getAllKeys(pkg.id)
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(new Error('The draft could not be saved.'))
    })
    for (const key of existing) if (!keepIds.has(String(key))) files.delete(key)
    await done(tx)
  } finally {
    db.close()
  }
}

export async function deleteDraft(id: string): Promise<void> {
  const db = await open()
  try {
    const tx = db.transaction(['packages', 'files'], 'readwrite')
    tx.objectStore('packages').delete(id)
    const files = tx.objectStore('files')
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const r = files.index('packageId').getAllKeys(id)
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(new Error('The draft could not be removed.'))
    })
    for (const k of keys) files.delete(k)
    await done(tx)
  } finally {
    db.close()
  }
}
