// Reads the "date taken" from a JPEG photo's EXIF data (pure, no imports).
// Returns "YYYY-MM-DDTHH:MM:SSZ" holding the camera's own clock time (cameras don't record a time zone), so the report
// shows exactly what the camera recorded. Returns null for anything that isn't a readable JPEG with a date.

function ascii(view: DataView, offset: number, length: number): string {
  let s = ''
  for (let i = 0; i < length && offset + i < view.byteLength; i++) {
    const c = view.getUint8(offset + i)
    if (c === 0) break
    s += String.fromCharCode(c)
  }
  return s
}

function toIso(raw: string): string | null {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(raw)
  if (!m || m[1] === '0000') return null
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`
  return Number.isNaN(Date.parse(iso)) ? null : iso
}

export function readExifDate(buffer: ArrayBuffer): string | null {
  try {
    const view = new DataView(buffer)
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null
    let offset = 2
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset)
      if ((marker & 0xff00) !== 0xff00) return null
      const size = view.getUint16(offset + 2)
      if (marker === 0xffe1 && ascii(view, offset + 4, 4) === 'Exif') {
        const tiff = offset + 10
        const little = view.getUint16(tiff) === 0x4949
        const u16 = (o: number) => view.getUint16(o, little)
        const u32 = (o: number) => view.getUint32(o, little)
        if (u16(tiff + 2) !== 42) return null
        const readIfd = (ifd: number): Map<number, number> => {
          const tags = new Map<number, number>()
          if (ifd + 2 > view.byteLength) return tags
          const count = Math.min(u16(ifd), 500)
          for (let i = 0; i < count; i++) {
            const entry = ifd + 2 + i * 12
            if (entry + 12 > view.byteLength) break
            tags.set(u16(entry), entry)
          }
          return tags
        }
        const dateAt = (entry: number | undefined): string | null => {
          if (entry === undefined || u16(entry + 2) !== 2) return null
          const count = u32(entry + 4)
          const at = count > 4 ? tiff + u32(entry + 8) : entry + 8
          return toIso(ascii(view, at, Math.min(count, 32)))
        }
        const ifd0 = readIfd(tiff + u32(tiff + 4))
        const exifPtr = ifd0.get(0x8769)
        if (exifPtr !== undefined) {
          const exif = readIfd(tiff + u32(exifPtr + 8))
          const taken = dateAt(exif.get(0x9003)) ?? dateAt(exif.get(0x9004))
          if (taken) return taken
        }
        return dateAt(ifd0.get(0x0132))
      }
      if (marker === 0xffda || size < 2) return null
      offset += 2 + size
    }
    return null
  } catch {
    return null
  }
}
