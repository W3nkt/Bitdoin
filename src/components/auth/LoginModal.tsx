import { Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { EmailAuthForm } from './EmailAuthForm'

interface LoginModalProps {
  open: boolean
  onClose: () => void
  /** Runs after an email sign-in; Google/Facebook return to `returnPath` instead. */
  onSignedIn: () => void
  returnPath: string
  message: string
}

/** Asks a guest to sign in without leaving the page, then lets them carry on. */
export function LoginModal({ open, onClose, onSignedIn, returnPath, message }: LoginModalProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onClose} title={t('auth.signInRequired')} size="sm">
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3 py-2.5">
          <Heart className="h-5 w-5 flex-shrink-0 fill-rose-500 text-rose-500" />
          <p className="text-sm text-gray-700 dark:text-gray-200">{message}</p>
        </div>
        <EmailAuthForm returnPath={returnPath} onSignedIn={onSignedIn} />
      </div>
    </Modal>
  )
}
