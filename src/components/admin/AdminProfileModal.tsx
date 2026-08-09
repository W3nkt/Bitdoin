import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { PaymentAccountsManager } from '@/components/admin/PaymentAccountsManager'
import { normalizeLaoPhone } from '@/lib/utils'

interface AdminProfileModalProps {
  open: boolean
  onClose: () => void
}

// Edits the admin's own avatar/name/phone (shared `users` row) plus the
// platform's payment accounts — both are read by the Bookstore admin sidebar
// and the Academy admin dropdown, so a change here shows up in both places.
export function AdminProfileModal({ open, onClose }: AdminProfileModalProps) {
  const { profile, refreshProfile } = useAuth()
  const { success, error } = useToast()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingIdentity, setSavingIdentity] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(profile?.name ?? '')
    setPhone(profile?.phone ?? '')
  }, [open, profile])

  async function handleAvatarFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !profile) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      error('Please choose a JPEG, PNG, or WEBP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      error('Image must be smaller than 5MB.')
      return
    }

    setUploadingAvatar(true)
    try {
      const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const path = `${profile.id}/avatar-${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600' })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)
      if (updateError) throw updateError

      await refreshProfile()
      success('Profile picture updated.')
    } catch (uploadError) {
      console.error(uploadError)
      error('Could not update your profile picture.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function saveIdentity() {
    if (!profile) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      error('Name cannot be empty.')
      return
    }

    setSavingIdentity(true)
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: trimmedName,
          phone: phone.trim() ? normalizeLaoPhone(phone.trim()) : null,
        })
        .eq('id', profile.id)
      if (updateError) throw updateError

      await refreshProfile()
      success('Profile updated.')
    } catch (updateError) {
      console.error(updateError)
      error('Could not update your profile.')
    } finally {
      setSavingIdentity(false)
    }
  }

  const identityDirty = name.trim() !== (profile?.name ?? '') || phone.trim() !== (profile?.phone ?? '')

  return (
    <Modal open={open} onClose={onClose} title="Admin profile settings" size="xl">
      <div className="space-y-6">
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="group relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gray-100 ring-2 ring-gray-200"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-black text-gray-400">{profile?.name?.charAt(0).toUpperCase() ?? 'A'}</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
                {uploadingAvatar ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </span>
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800">Profile picture</p>
              <p className="text-xs text-gray-400">Shown in both the Bookstore and Academy admin panels.</p>
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 020 5555 5555" />
          </div>
          <Input label="Email" value={profile?.email ?? ''} disabled hint="Contact support to change your sign-in email." />

          <div className="flex justify-end">
            <Button size="sm" onClick={saveIdentity} loading={savingIdentity} disabled={!identityDirty}>
              Save profile
            </Button>
          </div>
        </section>

        <div className="border-t border-gray-100" />

        <PaymentAccountsManager />
      </div>
    </Modal>
  )
}
