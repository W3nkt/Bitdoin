import { useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react'
import { Camera, Crop as CropIcon } from 'lucide-react'
import ReactCrop, { centerCrop, convertToPixelCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import type { Language } from '@/types'

const AVATAR_SIZE = 512
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// The original is only read locally; what's uploaded is the 512px crop.
const MAX_SOURCE_BYTES = 15 * 1024 * 1024

/**
 * Shows the profile picture large, and lets the member pick a new one and
 * crop it to a circle before it's saved.
 */
export function AvatarPhotoModal({
  open,
  onClose,
  avatarUrl,
  name,
  language,
  saving,
  onSave,
}: {
  open: boolean
  onClose: () => void
  avatarUrl?: string | null
  name: string
  language: Language
  saving: boolean
  onSave: (file: File) => Promise<boolean>
}) {
  const lo = language === 'lo'
  const { error } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [pixelCrop, setPixelCrop] = useState<PixelCrop>()
  const initial = (name.trim().charAt(0) || '?').toUpperCase()

  useEffect(() => () => { if (cropSrc) URL.revokeObjectURL(cropSrc) }, [cropSrc])

  useEffect(() => {
    if (!open) resetCrop()
  }, [open])

  function resetCrop() {
    setCropSrc(null)
    setCrop(undefined)
    setPixelCrop(undefined)
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      error(lo ? 'ກະລຸນາເລືອກຮູບ JPEG, PNG ຫຼື WEBP.' : 'Please choose a JPEG, PNG, or WEBP image.')
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      error(lo ? 'ຮູບຕ້ອງນ້ອຍກວ່າ 15MB.' : 'Image must be smaller than 15MB.')
      return
    }
    setCrop(undefined)
    setPixelCrop(undefined)
    setCropSrc(URL.createObjectURL(file))
  }

  function handleImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    // Work in the displayed size: ReactCrop reports pixel crops in displayed pixels.
    const { width, height } = event.currentTarget
    const initialCrop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height)
    setCrop(initialCrop)
    setPixelCrop(convertToPixelCrop(initialCrop, width, height))
  }

  async function saveCrop() {
    const image = imageRef.current
    if (!image || !pixelCrop?.width || !pixelCrop?.height) return
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      pixelCrop.x * scaleX,
      pixelCrop.y * scaleY,
      pixelCrop.width * scaleX,
      pixelCrop.height * scaleY,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    )
    // Safari can't encode WEBP and silently falls back to PNG.
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.9))
    if (!blob) return
    const type = blob.type === 'image/webp' ? 'image/webp' : 'image/png'
    const saved = await onSave(new File([blob], `profile-picture.${type === 'image/webp' ? 'webp' : 'png'}`, { type }))
    if (saved) onClose()
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) onClose() }}
      title={cropSrc ? (lo ? 'ຕັດຮູບໂປຣໄຟລ໌' : 'Crop your photo') : (lo ? 'ຮູບໂປຣໄຟລ໌' : 'Profile picture')}
      size="lg"
      footer={cropSrc ? (
        <>
          <Button type="button" variant="ghost" disabled={saving} onClick={resetCrop}>
            {lo ? 'ກັບຄືນ' : 'Back'}
          </Button>
          <Button type="button" icon={<CropIcon className="h-4 w-4" />} loading={saving} disabled={!pixelCrop?.width} onClick={() => void saveCrop()}>
            {lo ? 'ບັນທຶກຮູບ' : 'Save photo'}
          </Button>
        </>
      ) : (
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            {lo ? 'ປິດ' : 'Close'}
          </Button>
          <Button type="button" icon={<Camera className="h-4 w-4" />} onClick={() => inputRef.current?.click()}>
            {avatarUrl ? (lo ? 'ປ່ຽນຮູບ' : 'Change photo') : (lo ? 'ເພີ່ມຮູບ' : 'Add photo')}
          </Button>
        </>
      )}
    >
      <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} className="sr-only" onChange={handleFile} />
      {cropSrc ? (
        <div className="space-y-3">
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
            {lo ? 'ລາກ ແລະ ປັບຂະໜາດວົງມົນ ເພື່ອເລືອກສ່ວນທີ່ຈະສະແດງ.' : 'Drag and resize the circle to choose what shows in your profile picture.'}
          </p>
          <div className="flex justify-center overflow-hidden rounded-2xl bg-gray-950/95 p-2">
            <ReactCrop
              crop={crop}
              onChange={(next: PixelCrop) => setCrop(next)}
              onComplete={(next: PixelCrop) => setPixelCrop(next)}
              aspect={1}
              circularCrop
              keepSelection
              minWidth={60}
              minHeight={60}
              className="max-w-full overflow-hidden rounded-xl"
            >
              <img
                ref={imageRef}
                src={cropSrc}
                onLoad={handleImageLoad}
                alt=""
                style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
              />
            </ReactCrop>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-2">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="aspect-square w-full max-w-sm rounded-3xl object-cover shadow-xl ring-1 ring-black/5 dark:ring-white/10"
            />
          ) : (
            <div className="grid aspect-square w-full max-w-xs place-items-center rounded-3xl bg-primary-950 text-7xl font-black text-amber-200 ring-1 ring-amber-300/30">
              {initial}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
