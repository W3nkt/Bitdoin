import { useEffect, useRef } from 'react'
import qrcode from 'qrcode-generator'

const CELL = 8 // canvas pixels per QR module
const QUIET = 4 // quiet-zone modules around the code
const PLATE_SHARE = 0.22 // white plate behind the logo, as a share of the code width (about 5% of its area)
const LOGO_SHARE = 0.65 // logo width as a share of the plate; the white margin keeps its colours away from the data modules

interface QrCodeLogoProps {
  value: string
  logoSrc: string
  /** Largest size in CSS pixels; the code is drawn at the biggest whole number of pixels per module below it. */
  maxSize?: number
  /** Accessible name of the image. */
  label?: string
  className?: string
}

// A QR code with a logo in the centre. The payload is never changed: the logo only covers modules that
// error-correction level H can rebuild, and it is drawn after the code, so a logo that fails to load
// leaves a plain code that still scans.
export function QrCodeLogo({ value, logoSrc, maxSize = 340, label = 'QR code', className }: QrCodeLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const qr = qrcode(0, 'H')
    qr.addData(value, 'Byte')
    qr.make()
    const count = qr.getModuleCount()
    const modules = count + QUIET * 2
    canvas.width = canvas.height = modules * CELL
    // Whole CSS pixels per module keep the edges sharp; a fractional scale blurs the code and scanners struggle.
    canvas.style.width = canvas.style.height = `${Math.max(3, Math.floor(maxSize / modules)) * modules}px`

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#000'
    for (let row = 0; row < count; row += 1) {
      for (let col = 0; col < count; col += 1) {
        if (qr.isDark(row, col)) ctx.fillRect((col + QUIET) * CELL, (row + QUIET) * CELL, CELL, CELL)
      }
    }

    let cancelled = false
    const logo = new Image()
    logo.onload = () => {
      if (cancelled) return
      // The plate covers a whole, odd number of modules so it sits exactly on the centre of the grid.
      let plate = Math.round(count * PLATE_SHARE)
      if (plate % 2 === 0) plate += 1
      const side = plate * CELL
      const start = ((count - plate) / 2 + QUIET) * CELL
      const inset = (side * (1 - LOGO_SHARE)) / 2
      ctx.fillStyle = '#fff'
      ctx.fillRect(start, start, side, side)
      ctx.drawImage(logo, start + inset, start + inset, side - inset * 2, side - inset * 2)
    }
    logo.src = logoSrc
    return () => {
      cancelled = true
    }
  }, [value, logoSrc, maxSize])

  return <canvas ref={canvasRef} role="img" aria-label={label} className={className} style={{ imageRendering: 'pixelated', maxWidth: '100%' }} />
}
