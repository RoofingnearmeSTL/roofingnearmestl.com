// Browser-only file handling for the proof package builder: shrink photos, read their date taken, and turn PDF
// pages into images. Everything happens on this computer; no file is uploaded anywhere.
import { readExifDate } from './exif'
import { newId, type StoredFile } from './model'

const MAX_SIDE = 1800
const JPEG_QUALITY = 0.82
export const MAX_PDF_PAGES = 25
export const MAX_FILE_BYTES = 60 * 1024 * 1024

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

function drawScaled(source: CanvasImageSource, width: number, height: number, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot draw images.')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** A photo, shrunk to at most 1800 px on its long side as a JPEG, with the camera's date taken when present. */
export async function photoToStored(file: File): Promise<StoredFile> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name} is larger than 60 MB.`)
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    throw new Error(`${file.name} is an iPhone HEIC photo, which this browser can't read. On the iPhone, set Camera, Formats, Most Compatible, or export it as JPEG.`)
  }
  const buffer = await file.arrayBuffer()
  const takenAt = /jpe?g/i.test(file.type) || /\.jpe?g$/i.test(file.name) ? readExifDate(buffer) : null
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(new Blob([buffer], { type: file.type || 'image/jpeg' }), { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`${file.name} could not be read as a photo.`)
  }
  const canvas = drawScaled(bitmap, bitmap.width, bitmap.height, MAX_SIDE)
  bitmap.close()
  return { id: newId(), name: file.name.slice(0, 120), type: 'image/jpeg', dataUrl: canvasToDataUrl(canvas), width: canvas.width, height: canvas.height, takenAt }
}

/** Each page of a PDF (up to 25) as an image, for the report's attachments. */
export async function pdfToPages(file: File): Promise<{ pages: StoredFile[]; total: number }> {
  return pdfBlobToPages(file, file.name)
}

/** Mike's Building Experts Institute certificates, served by this website (public/certifications). */
export const CERTIFICATES = [
  { path: '/certifications/bei-hail-damage-identification.pdf', title: 'Hail Damage Identification on Asphalt Shingle Roofs' },
  { path: '/certifications/bei-wind-damage-identification.pdf', title: 'Wind Damage Identification on Asphalt Shingle Roofs' },
  { path: '/certifications/bei-asphalt-shingle-building-code.pdf', title: 'Building Code for Asphalt Shingle Roofs' },
  { path: '/certifications/bei-asphalt-shingle-installation.pdf', title: 'Installation of Asphalt Shingle Roofs' },
] as const

/** All certificate pages, in the order above. */
export async function certificatePages(): Promise<{ pages: StoredFile[]; total: number }> {
  const pages: StoredFile[] = []
  for (const c of CERTIFICATES) {
    const res = await fetch(window.location.origin + c.path)
    if (!res.ok) throw new Error(`The certificate ${c.title} could not be loaded from the website.`)
    const out = await pdfBlobToPages(await res.blob(), c.title)
    pages.push(...out.pages)
  }
  return { pages, total: pages.length }
}

async function pdfBlobToPages(file: Blob, name: string): Promise<{ pages: StoredFile[]; total: number }> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`${name} is larger than 60 MB.`)
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  // pdf.js 6 never uses eval; XFA forms stay off.
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), enableXfa: false })
  let doc: Awaited<typeof task.promise>
  try {
    doc = await task.promise
  } catch {
    await task.destroy().catch(() => undefined)
    throw new Error(`${name} could not be opened as a PDF (it may be damaged or password protected).`)
  }
  const total = doc.numPages
  const pages: StoredFile[] = []
  try {
    for (let i = 1; i <= Math.min(total, MAX_PDF_PAGES); i++) {
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: Math.min(2.2, 1700 / Math.max(base.width, base.height)) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      await page.render({ canvas, viewport, background: '#ffffff' }).promise
      pages.push({ id: newId(), name: `${name.slice(0, 100)} p${i}`, type: 'image/jpeg', dataUrl: canvasToDataUrl(canvas), width: canvas.width, height: canvas.height, takenAt: null })
      page.cleanup()
    }
  } finally {
    await task.destroy().catch(() => undefined)
  }
  return { pages, total }
}

/** The site logo as an inline image, so a downloaded report shows it without the internet. */
export async function logoDataUrl(path = '/logo.png'): Promise<string | null> {
  try {
    const res = await fetch(window.location.origin + path)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : null)
      r.onerror = () => resolve(null)
      r.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
