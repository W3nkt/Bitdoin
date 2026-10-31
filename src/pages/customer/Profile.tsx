import { useEffect, useRef, useState, type ChangeEvent, type ReactNode, type SyntheticEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Camera,
  ChevronRight,
  Crop as CropIcon,
  DollarSign,
  Globe,
  Heart,
  Loader2,
  LogOut,
  Package,
  User,
} from 'lucide-react'
import ReactCrop, { centerCrop, convertToPixelCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PushNotificationCard } from '@/components/notifications/PushNotificationCard'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'

const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
const PROFILE_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_CROP_SIZE = 512

type ProfileImageTarget = 'avatar' | 'cover'

function getFileExtension(file: File) {
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/webp') return 'webp'
  return 'jpg'
}

export function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { profile, signOut, refreshProfile } = useAuth()
  const { language, setLanguage, currency, setCurrency } = useLanguage()
  const { totalItems } = useCart()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarCropImageRef = useRef<HTMLImageElement>(null)
  const [uploadingImage, setUploadingImage] = useState<ProfileImageTarget | null>(null)
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null)
  const [avatarCrop, setAvatarCrop] = useState<Crop>()
  const [completedAvatarCrop, setCompletedAvatarCrop] = useState<PixelCrop>()

  // The numbers under the name. The keys sit under the Orders page's and the heart's, so a new order or a
  // saved book updates them.
  const { data: orderCount } = useQuery({
    queryKey: ['orders', profile?.id, 'count'],
    queryFn: async () => {
      const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', profile!.id)
      return count ?? 0
    },
    enabled: profile?.role === 'CUSTOMER',
  })
  const { data: favoriteCount } = useQuery({
    queryKey: ['book-favorite', profile?.id, 'count'],
    queryFn: async () => {
      const { count } = await supabase.from('book_favorites').select('book_id', { count: 'exact', head: true })
      return count ?? 0
    },
    enabled: profile?.role === 'CUSTOMER',
  })

  useEffect(() => {
    return () => {
      if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc)
    }
  }, [avatarCropSrc])

  async function handleSignOut() {
    await signOut()
    navigate('/bookstore')
  }

  function isValidProfileImage(file: File) {
    if (!PROFILE_IMAGE_MIME_TYPES.includes(file.type)) {
      toast.error(t('profile.imageOnly'))
      return false
    }

    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      toast.error(t('profile.imageTooLarge'))
      return false
    }

    return true
  }

  async function uploadProfileImage(target: ProfileImageTarget, file: File) {
    if (!profile) return

    try {
      setUploadingImage(target)
      const path = `${profile.id}/${target}-${crypto.randomUUID()}.${getFileExtension(file)}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600' })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const column = target === 'avatar' ? 'avatar_url' : 'cover_image_url'
      const { error: updateError } = await supabase
        .from('users')
        .update({ [column]: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      await refreshProfile()
      toast.success(t('profile.uploadSuccess'))
    } catch (error) {
      console.error(error)
      toast.error(t('profile.uploadFailed'))
    } finally {
      setUploadingImage(null)
    }
  }

  async function handleProfileImageChange(
    target: ProfileImageTarget,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !profile || !isValidProfileImage(file)) return

    if (target === 'cover') {
      await uploadProfileImage(target, file)
      return
    }

    setAvatarCropSrc(URL.createObjectURL(file))
    setAvatarCrop(undefined)
    setCompletedAvatarCrop(undefined)
  }

  function closeAvatarCrop() {
    setAvatarCropSrc(null)
    setAvatarCrop(undefined)
    setCompletedAvatarCrop(undefined)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  function handleAvatarCropImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth, naturalHeight } = event.currentTarget
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, naturalWidth, naturalHeight),
      naturalWidth,
      naturalHeight,
    )
    setAvatarCrop(initialCrop)
    setCompletedAvatarCrop(convertToPixelCrop(initialCrop, naturalWidth, naturalHeight))
  }

  async function applyAvatarCrop() {
    const image = avatarCropImageRef.current
    if (!image || !completedAvatarCrop?.width || !completedAvatarCrop?.height) return

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return

    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = AVATAR_CROP_SIZE
    canvas.height = AVATAR_CROP_SIZE
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      completedAvatarCrop.x * scaleX,
      completedAvatarCrop.y * scaleY,
      completedAvatarCrop.width * scaleX,
      completedAvatarCrop.height * scaleY,
      0,
      0,
      AVATAR_CROP_SIZE,
      AVATAR_CROP_SIZE,
    )

    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/png', 0.95)
    })
    if (!blob) return

    closeAvatarCrop()
    await uploadProfileImage('avatar', new File([blob], 'profile-picture.png', { type: 'image/png' }))
  }

  if (!profile) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-primary-200 bg-gradient-to-b from-primary-50 to-white px-6 py-12 text-center dark:border-primary-500/30 dark:from-primary-500/10 dark:to-gray-900/40">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-white shadow-lg shadow-primary-700/15 ring-1 ring-primary-100 dark:bg-gray-900 dark:ring-primary-500/25">
          <User className="h-9 w-9 text-primary-400" />
        </span>
        <p className="mt-4 text-base font-bold text-gray-900 dark:text-gray-100">{t('auth.signIn')}</p>
        <div className="mt-5">
          <Button onClick={() => navigate('/auth')}>{t('nav.signIn')}</Button>
        </div>
      </div>
    )
  }

  if (profile.role !== 'CUSTOMER') {
    return <Navigate to="/admin" replace />
  }

  const hour = new Date().getHours()
  const greeting = t(hour < 12 ? 'profile.goodMorning' : hour < 18 ? 'profile.goodAfternoon' : 'profile.goodEvening')
  const initial = profile.name.trim().charAt(0).toUpperCase()

  return (
    <>
      <div className="-mx-4 -mt-4 pb-6">
        {/* ── Cover: the customer's own picture (or the brand colours), with a greeting ───────────────────────── */}
        <div className="relative h-48 overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-primary-800 via-primary-700 to-indigo-600">
          {profile.cover_image_url && (
            <img
              src={profile.cover_image_url}
              alt=""
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-primary-950/70 via-primary-900/40 to-primary-900/55" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-10 h-48 w-48 rounded-full bg-accent-500/25 blur-2xl" />

          <p className="absolute left-4 top-5 text-sm font-semibold text-white/90">{greeting}</p>

          <input
            ref={coverInputRef}
            id="profile-cover-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={event => handleProfileImageChange('cover', event)}
          />
          <label
            htmlFor="profile-cover-upload"
            aria-disabled={uploadingImage !== null}
            className={cn(
              'absolute right-4 top-4 z-10 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md transition-colors hover:bg-white/30',
              uploadingImage && 'pointer-events-none opacity-70',
            )}
          >
            {uploadingImage === 'cover'
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Camera className="h-3.5 w-3.5" />}
            {t('profile.changeCover')}
          </label>
        </div>

        {/* ── Who the customer is, and their numbers ───────────────────────────────────────────────────────── */}
        <div className="relative z-10 mx-auto -mt-20 max-w-md px-4">
          <section className="relative rounded-3xl border border-gray-100/80 bg-white px-4 pb-4 pt-16 text-center shadow-card dark:border-gray-800/80 dark:bg-gray-900">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 shadow-xl shadow-primary-900/25 ring-4 ring-white dark:ring-gray-900">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-black text-white">{initial}</span>
                )}
                <input
                  ref={avatarInputRef}
                  id="profile-avatar-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={event => handleProfileImageChange('avatar', event)}
                />
                <label
                  htmlFor="profile-avatar-upload"
                  aria-disabled={uploadingImage !== null}
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-accent-500 text-white shadow-lg ring-2 ring-white transition-transform hover:scale-105 dark:ring-gray-900',
                    uploadingImage && 'pointer-events-none opacity-70',
                  )}
                >
                  {uploadingImage === 'avatar'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Camera className="h-4 w-4" />}
                  <span className="sr-only">{t('profile.changePhoto')}</span>
                </label>
              </div>
            </div>

            <h1 className="truncate text-xl font-black text-gray-900 dark:text-gray-50">{profile.name}</h1>
            <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">{profile.email ?? profile.phone}</p>
            <span className="mt-3 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
              {t('profile.memberSince', { date: formatDate(profile.created_at, language) })}
            </span>

            <div className="mt-4 grid grid-cols-3 divide-x divide-gray-200/80 rounded-2xl bg-gray-50 dark:divide-gray-700 dark:bg-gray-800/50">
              <Stat value={orderCount} label={t('profile.statOrders')} onClick={() => navigate('/bookstore/orders')} />
              <Stat value={favoriteCount} label={t('profile.statFavorites')} onClick={() => navigate('/bookstore/favorites')} />
              <Stat value={totalItems()} label={t('profile.statCart')} onClick={() => navigate('/bookstore/cart')} />
            </div>
          </section>
        </div>

        <div className="mx-auto mt-5 max-w-md space-y-5 px-4">
          {/* ── Shopping ─────────────────────────────────────────────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">{t('profile.shopping')}</h2>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-3xl border border-gray-100/80 bg-white shadow-card dark:divide-gray-800 dark:border-gray-800/80 dark:bg-gray-900">
              <MenuRow
                icon={<Package className="h-5 w-5 text-white" />}
                tone="from-blue-400 to-blue-600"
                title={t('orders.title')}
                subtitle={t('orders.manageAll')}
                onClick={() => navigate('/bookstore/orders')}
              />
              <MenuRow
                icon={<Heart className="h-5 w-5 text-white" />}
                tone="from-rose-400 to-rose-600"
                title={t('favorites.title')}
                subtitle={t('favorites.subtitle')}
                onClick={() => navigate('/bookstore/favorites')}
              />
            </div>
          </section>

          <PushNotificationCard platform="BOOKSTORE" lo={language === 'lo'} className="rounded-3xl" />

          {/* ── Preferences ──────────────────────────────────────────────────────────────────────────────────── */}
          <section>
            <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-gray-400">{t('profile.preferences')}</h2>
            <div className="space-y-4 rounded-3xl border border-gray-100/80 bg-white p-4 shadow-card dark:border-gray-800/80 dark:bg-gray-900">
              <PreferenceRow
                icon={<Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                tone="bg-blue-50 dark:bg-blue-500/10"
                label={t('book.language')}
              >
                <Segmented
                  label={t('book.language')}
                  value={language}
                  onChange={setLanguage}
                  options={[{ value: 'lo', label: t('sidebar.lao') }, { value: 'en', label: t('sidebar.english') }]}
                />
              </PreferenceRow>
              <PreferenceRow
                icon={<DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />}
                tone="bg-green-50 dark:bg-green-500/10"
                label={t('profile.currency')}
              >
                <Segmented
                  label={t('profile.currency')}
                  value={currency}
                  onChange={setCurrency}
                  options={[{ value: 'LAK', label: t('common.lak') }, { value: 'USD', label: 'USD' }]}
                />
              </PreferenceRow>
            </div>
          </section>

          <Button
            variant="outline"
            fullWidth
            icon={<LogOut className="h-4 w-4" />}
            onClick={handleSignOut}
            className="border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            {t('nav.signOut')}
          </Button>
        </div>
      </div>

      <Modal
        open={!!avatarCropSrc}
        onClose={closeAvatarCrop}
        title={t('profile.cropPhoto')}
        size="lg"
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeAvatarCrop}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              icon={<CropIcon className="h-4 w-4" />}
              onClick={applyAvatarCrop}
              disabled={!completedAvatarCrop?.width || uploadingImage !== null}
              loading={uploadingImage === 'avatar'}
            >
              {t('profile.savePhoto')}
            </Button>
          </>
        }
      >
        {avatarCropSrc && (
          <div className="space-y-3">
            <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">{t('profile.cropPhotoHint')}</p>
            <div className="flex justify-center overflow-hidden rounded-2xl bg-gray-950/95 p-2">
              <ReactCrop
                crop={avatarCrop}
                onChange={crop => setAvatarCrop(crop)}
                onComplete={crop => setCompletedAvatarCrop(crop)}
                aspect={1}
                circularCrop
                minWidth={80}
                minHeight={80}
                className="max-w-full overflow-hidden rounded-xl"
              >
                <img
                  ref={avatarCropImageRef}
                  src={avatarCropSrc}
                  onLoad={handleAvatarCropImageLoad}
                  alt={t('profile.changePhoto')}
                  style={{ maxHeight: '60vh', maxWidth: '100%', display: 'block' }}
                />
              </ReactCrop>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

/** One of the three numbers under the name; tapping it opens the page it counts. */
function Stat({ value, label, onClick }: { value: number | undefined; label: string; onClick: () => void }) {
  return (
    // Square corners in the middle, so the dividers between the three are straight lines.
    <button type="button" onClick={onClick} className="flex min-w-0 flex-col items-center gap-0.5 px-2 py-3 transition-colors first:rounded-l-2xl last:rounded-r-2xl hover:bg-white active:bg-white dark:hover:bg-gray-800 dark:active:bg-gray-800">
      <span className="text-xl font-black leading-none text-gray-900 dark:text-gray-50">{value ?? '–'}</span>
      <span className="max-w-full truncate text-[11px] font-semibold text-gray-500 dark:text-gray-400">{label}</span>
    </button>
  )
}

function MenuRow({ icon, tone, title, subtitle, onClick }: { icon: ReactNode; tone: string; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800/60 dark:active:bg-gray-800">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-sm', tone)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-gray-900 dark:text-gray-100">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-gray-400">{subtitle}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 dark:text-gray-600" />
    </button>
  )
}

function PreferenceRow({ icon, tone, label, children }: { icon: ReactNode; tone: string; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', tone)}>{icon}</span>
        <span className="truncate text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
      </div>
      {children}
    </div>
  )
}

/** A pill-shaped switch between a few choices. */
function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex shrink-0 rounded-full bg-gray-100 p-1 dark:bg-gray-800">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs font-bold transition-all',
            value === option.value
              ? 'bg-primary-700 text-white shadow-sm dark:bg-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
