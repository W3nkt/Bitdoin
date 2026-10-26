// Browser side of score-book scanning (P2-OCR #48: OCR-001..003, OCR-008,
// PRIV-006). The photo never leaves the device as taken: it is rotated,
// cropped, downscaled to 2000 px on the long edge and re-encoded as JPEG 0.8,
// which also drops EXIF (location, device). The checks and the perceptual
// hash run on a small copy (ocrAnalysis.ts).
import { assessQuality, grayFromRgba, perceptualHash, type PhotoQuality } from './ocrAnalysis'

export const SCAN_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024
const LONG_EDGE = 2000
const ANALYSIS_EDGE = 512
const MAX_UPLOAD_BYTES = 3 * 1024 * 1024

export interface PreparedScan {
  /** Object URL of the compressed photo (for crops of uncertain fields). */
  url: string
  base64: string
  width: number
  height: number
  bytes: number
  phash: string
  quality: PhotoQuality
}

export interface PixelRect { x: number; y: number; width: number; height: number }

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image_decode'))
    image.src = src
  })
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('image_encode'))), 'image/jpeg', quality))
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''))
    reader.onerror = () => reject(new Error('image_read'))
    reader.readAsDataURL(blob)
  })
}

function canvas2d(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas')
  return { canvas, context }
}

/** A quarter-turned copy of the photo, as an object URL (the crop then works on the turned image). */
export async function rotateQuarter(image: HTMLImageElement, clockwise = true): Promise<string> {
  const { canvas, context } = canvas2d(image.naturalHeight, image.naturalWidth)
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate(clockwise ? Math.PI / 2 : -Math.PI / 2)
  context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2)
  return URL.createObjectURL(await toBlob(canvas, 0.92))
}

/** OCR-002/003/008: crop, downscale, compress, check and hash the photo. */
export async function prepareScan(image: HTMLImageElement, crop: PixelRect | null): Promise<PreparedScan> {
  const area = crop && crop.width > 8 && crop.height > 8 ? crop : { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight }
  const scale = Math.min(1, LONG_EDGE / Math.max(area.width, area.height))
  const width = Math.round(area.width * scale)
  const height = Math.round(area.height * scale)
  const { canvas, context } = canvas2d(width, height)
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height)

  let blob = await toBlob(canvas, 0.8)
  if (blob.size > MAX_UPLOAD_BYTES) blob = await toBlob(canvas, 0.6)
  if (blob.size > MAX_UPLOAD_BYTES) throw new Error('image_size')

  const small = Math.min(1, ANALYSIS_EDGE / Math.max(width, height))
  const { context: analysis } = canvas2d(Math.max(1, Math.round(width * small)), Math.max(1, Math.round(height * small)))
  analysis.drawImage(canvas, 0, 0, analysis.canvas.width, analysis.canvas.height)
  const pixels = analysis.getImageData(0, 0, analysis.canvas.width, analysis.canvas.height)
  const gray = grayFromRgba(pixels.data, pixels.width, pixels.height)

  return {
    url: URL.createObjectURL(blob),
    base64: await blobToBase64(blob),
    width,
    height,
    bytes: blob.size,
    phash: perceptualHash(gray),
    quality: assessQuality(gray),
  }
}

/**
 * The part of the photo a value was read from, as a data URL, or null when the
 * box does not fit the photo. bbox is [x1, y1, x2, y2] in the uploaded photo's pixels.
 */
export async function cropField(scan: Pick<PreparedScan, 'url' | 'width' | 'height'>, bbox: [number, number, number, number] | null): Promise<string | null> {
  if (!bbox) return null
  const [x1, y1, x2, y2] = bbox
  if (!(x2 > x1 && y2 > y1 && x1 >= 0 && y1 >= 0 && x2 <= scan.width && y2 <= scan.height)) return null
  const padX = Math.max(24, (x2 - x1) * 0.6)
  const padY = Math.max(16, (y2 - y1) * 0.6)
  const left = Math.max(0, x1 - padX)
  const top = Math.max(0, y1 - padY)
  const width = Math.min(scan.width, x2 + padX) - left
  const height = Math.min(scan.height, y2 + padY) - top
  const image = await loadImage(scan.url)
  const zoom = Math.min(3, 480 / width)
  const { canvas, context } = canvas2d(Math.round(width * zoom), Math.round(height * zoom))
  context.drawImage(image, left, top, width, height, 0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#f59e0b'
  context.lineWidth = 3
  context.strokeRect((x1 - left) * zoom, (y1 - top) * zoom, (x2 - x1) * zoom, (y2 - y1) * zoom)
  return canvas.toDataURL('image/jpeg', 0.85)
}
