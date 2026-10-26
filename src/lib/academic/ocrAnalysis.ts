// On-device photo checks for score-book scanning (P2-OCR #48: OCR-003,
// OCR-008). Pure: no DOM, so scripts/test-ocr-extract.mjs runs it directly.
// The browser side (ocrImage.ts) turns a canvas into a Gray and calls these.
//
// Thresholds are provisional until calibrated on the #9 sample set (OCR-003,
// decision OCR-DESIGN). A failed check is a tip; the student may continue.

export interface Gray { data: Float32Array; width: number; height: number }

export const DARK_LUMINANCE = 60
export const BLUR_VARIANCE = 40
export const SKEW_DEGREES = 15

export type QualityIssue = 'dark' | 'blurry' | 'skewed'
export interface PhotoQuality { brightness: number; sharpness: number; skew_degrees: number; issues: QualityIssue[] }

export function grayFromRgba(rgba: ArrayLike<number>, width: number, height: number): Gray {
  const data = new Float32Array(width * height)
  for (let i = 0; i < data.length; i++) data[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]
  return { data, width, height }
}

/** Weights of each source index for an exact area-average from n to m samples. */
function areaWeights(n: number, m: number) {
  const scale = n / m
  return Array.from({ length: m }, (_, i) => {
    const start = i * scale
    const end = (i + 1) * scale
    const taps: [number, number][] = []
    for (let k = Math.floor(start); k < Math.min(n, Math.ceil(end)); k++) {
      const overlap = Math.min(end, k + 1) - Math.max(start, k)
      if (overlap > 0) taps.push([k, overlap / scale])
    }
    return taps
  })
}

/** Area-average resample (the same result in every browser, unlike canvas smoothing). */
export function resizeGray(source: Gray, width: number, height: number): Gray {
  const columns = areaWeights(source.width, width)
  const rows = areaWeights(source.height, height)
  const across = new Float32Array(width * source.height)
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (const [k, w] of columns[x]) sum += source.data[y * source.width + k] * w
      across[y * width + x] = sum
    }
  }
  const data = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (const [k, w] of rows[y]) sum += across[k * width + x] * w
      data[y * width + x] = sum
    }
  }
  return { data, width, height }
}

export function meanLuminance(gray: Gray): number {
  let sum = 0
  for (const value of gray.data) sum += value
  return gray.data.length ? sum / gray.data.length : 0
}

/** Variance of the 4-neighbour Laplacian: low means blurry. */
export function laplacianVariance(gray: Gray): number {
  const { data, width, height } = gray
  let sum = 0
  let sumSq = 0
  let n = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const value = data[i - width] + data[i + width] + data[i - 1] + data[i + 1] - 4 * data[i]
      sum += value
      sumSq += value * value
      n++
    }
  }
  if (!n) return 0
  const mean = sum / n
  return sumSq / n - mean * mean
}

/**
 * Page skew in degrees (projection profile): dark pixels are projected onto
 * rows at each candidate angle; text lines and ruled lines give the sharpest
 * profile when the angle matches the skew. Searches ±maxAngle.
 */
export function estimateSkew(gray: Gray, maxAngle = 30, step = 1): number {
  const { data, width, height } = gray
  const threshold = meanLuminance(gray) * 0.7
  const points: number[] = []
  const stride = Math.max(1, Math.round(Math.sqrt((width * height) / 40000)))
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      if (data[y * width + x] < threshold) points.push(x - width / 2, y - height / 2)
    }
  }
  if (points.length < 40) return 0
  const diagonal = Math.ceil(Math.hypot(width, height))
  const bins = new Float64Array(diagonal * 2 + 1)
  let best = 0
  let bestScore = -1
  for (let angle = -maxAngle; angle <= maxAngle + 1e-9; angle += step) {
    const rad = (angle * Math.PI) / 180
    const sin = Math.sin(rad)
    const cos = Math.cos(rad)
    bins.fill(0)
    for (let i = 0; i < points.length; i += 2) bins[Math.round(points[i + 1] * cos - points[i] * sin) + diagonal]++
    let score = 0
    for (const count of bins) score += count * count
    if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && Math.abs(angle) < Math.abs(best))) {
      bestScore = score
      best = angle
    }
  }
  return Math.round(best * 10) / 10
}

/** OCR-003 checks on a small copy of the photo (about 512 px on the long edge). */
export function assessQuality(gray: Gray): PhotoQuality {
  const brightness = meanLuminance(gray)
  const sharpness = laplacianVariance(gray)
  const skew = estimateSkew(gray)
  const issues: QualityIssue[] = []
  if (brightness < DARK_LUMINANCE) issues.push('dark')
  if (sharpness < BLUR_VARIANCE) issues.push('blurry')
  if (Math.abs(skew) > SKEW_DEGREES) issues.push('skewed')
  return { brightness: Math.round((brightness / 255) * 100) / 100, sharpness: Math.round(sharpness), skew_degrees: skew, issues }
}

/**
 * 64-bit perceptual hash (DCT) as 16 hex digits, for duplicate detection
 * (OCR-008: Hamming distance ≤ 6 on the server). Any size in; resized to 32×32.
 */
export function perceptualHash(gray: Gray): string {
  const small = gray.width === 32 && gray.height === 32 ? gray : resizeGray(gray, 32, 32)
  const cos = (k: number, n: number) => Math.cos(((2 * n + 1) * k * Math.PI) / 64)
  const coefficients: number[] = []
  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      let sum = 0
      for (let y = 0; y < 32; y++) {
        const cy = cos(u, y)
        for (let x = 0; x < 32; x++) sum += small.data[y * 32 + x] * cy * cos(v, x)
      }
      coefficients.push(sum)
    }
  }
  const sorted = coefficients.slice(1).sort((a, b) => a - b)
  const median = (sorted[31] + sorted[32]) / 2
  let hex = ''
  for (let i = 0; i < 64; i += 4) {
    let nibble = 0
    for (let b = 0; b < 4; b++) nibble = (nibble << 1) | (coefficients[i + b] > median ? 1 : 0)
    hex += nibble.toString(16)
  }
  return hex
}

export function hammingDistance(a: string, b: string): number {
  let distance = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    while (x) { distance += x & 1; x >>= 1 }
  }
  return distance
}
