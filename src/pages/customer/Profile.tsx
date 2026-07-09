import { useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  ChevronRight,
  Crop as CropIcon,
  Crown,
  DollarSign,
  Globe,
  Loader2,
  LogOut,
  Package,
  Sparkles,
  Store,
  User,
} from 'lucide-react'
import ReactCrop, { centerCrop, convertToPixelCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { useAuth } from '@/context/AuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

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
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const avatarCropImageRef = useRef<HTMLImageElement>(null)
  const [uploadingImage, setUploadingImage] = useState<ProfileImageTarget | null>(null)
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null)
  const [avatarCrop, setAvatarCrop] = useState<Crop>()
  const [completedAvatarCrop, setCompletedAvatarCrop] = useState<PixelCrop>()

  const roleLabel = profile?.role === 'ADMIN'
    ? t('nav.admin')
    : profile?.role === 'CUSTOMER'
      ? t('nav.profile')
      : profile?.role

  useEffect(() => {
    return () => {
      if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc)
    }
  }, [avatarCropSrc])

  async function handleSignOut() {
    await signOut()
    navigate('/')
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
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <User className="h-16 w-16 text-gray-300" />
        <p className="text-gray-500">{t('auth.signIn')}</p>
        <Button onClick={() => navigate('/auth')}>{t('nav.signIn')}</Button>
      </div>
    )
  }

  const isAdmin = profile.role !== 'CUSTOMER'

  return (
    <>
      <div className="-mx-4 -mt-4 pb-6">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-indigo-600 px-4 pb-8 pt-10 text-center">
        {profile.cover_image_url && (
          <img
            src={profile.cover_image_url}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950/85 via-primary-800/75 to-indigo-700/80" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-14 -left-10 h-48 w-48 rounded-full bg-accent-500/20 blur-2xl" />

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

        <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/30 backdrop-blur-sm">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.name}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span className="text-3xl font-black text-white">
              {profile.name.charAt(0).toUpperCase()}
            </span>
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
              'absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white text-primary-700 shadow-lg transition-transform hover:scale-105',
              uploadingImage && 'pointer-events-none opacity-70',
            )}
          >
            {uploadingImage === 'avatar'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Camera className="h-4 w-4" />}
            <span className="sr-only">{t('profile.changePhoto')}</span>
          </label>
        </div>
        <h2 className="relative mt-3 text-lg font-bold text-white">{profile.name}</h2>
        <p className="relative text-sm text-white/70">{profile.email ?? profile.phone}</p>
        <span className={cn(
          'relative mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold',
          isAdmin ? 'bg-amber-400 text-amber-950' : 'bg-white/20 text-white',
        )}>
          {isAdmin && <Sparkles className="h-3 w-3" />}
          {roleLabel}
        </span>
      </div>

      <div className="mx-auto max-w-md space-y-4 px-4 pt-4">
        {isAdmin && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="group flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-indigo-600 to-primary-600 p-5 text-left shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-white">{t('profile.bookstoreDashboard')}</p>
                <p className="text-xs text-white/70">{t('profile.bookstoreDashboardSubtitle')}</p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-white transition-transform group-hover:translate-x-1" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/premium-admin')}
              className="group flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-left shadow-lg shadow-orange-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-white">{t('profile.premiumDashboard')}</p>
                <p className="text-xs text-white/75">{t('profile.premiumDashboardSubtitle')}</p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0 text-white transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        )}

        {!isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/subscription')}
            className="group flex w-full items-center gap-4 rounded-3xl bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-left shadow-lg shadow-orange-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99]"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-white">{t('profile.subscriptionDetails')}</p>
              <p className="text-xs text-white/75">{t('profile.subscriptionSubtitle')}</p>
            </div>
            <ChevronRight className="h-5 w-5 flex-shrink-0 text-white transition-transform group-hover:translate-x-1" />
          </button>
        )}

        <Card hover onClick={() => navigate('/orders')} className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 p-2.5 shadow-sm">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">{t('orders.title')}</p>
            <p className="text-xs text-gray-400">{t('orders.manageAll')}</p>
          </div>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
        </Card>

        <Card padding>
          <h3 className="mb-3 text-sm font-semibold text-gray-700">{t('profile.preferences')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-1.5">
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-700">{t('book.language')}</span>
              </div>
              <div className="flex overflow-hidden rounded-xl border border-gray-200">
                {(['lo', 'en'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      language === lang ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {lang === 'lo' ? t('sidebar.lao') : t('sidebar.english')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-green-50 p-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-green-600" />
                </div>
                <span className="text-sm text-gray-700">{t('profile.currency')}</span>
              </div>
              <div className="flex overflow-hidden rounded-xl border border-gray-200">
                {(['LAK', 'USD'] as const).map(cur => (
                  <button
                    key={cur}
                    onClick={() => setCurrency(cur)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      currency === cur ? 'bg-primary-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Button
          variant="outline"
          fullWidth
          icon={<LogOut className="h-4 w-4" />}
          onClick={handleSignOut}
          className="border-red-200 text-red-600 hover:bg-red-50"
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
            <p className="text-xs leading-5 text-gray-500">{t('profile.cropPhotoHint')}</p>
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
