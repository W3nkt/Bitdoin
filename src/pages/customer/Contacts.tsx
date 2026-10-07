import { useTranslation } from 'react-i18next'
import { WhatsAppIcon, MessengerIcon, IPhoneIcon, GmailIcon } from '@/components/ui/ContactIcons'

export default function Contacts() {
  const { t } = useTranslation()

  const waNumber = (import.meta.env.VITE_ADMIN_WHATSAPP || '+8562095324510').replace(/\s+/g, '')
  const waHref = `https://wa.me/${waNumber.replace(/\D/g, '')}`

  const rawMessenger = import.meta.env.VITE_ADMIN_MESSENGER || 'm.me/620472337804971'
  const messengerHref = rawMessenger.startsWith('http') ? rawMessenger : `https://${rawMessenger.replace(/^\/+/, '')}`

  const phoneHref = `tel:${waNumber}`

  const email = 'bitdoin0@gmail.com'
  const emailHref = `mailto:${email}`

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{t('nav.contacts')}</h1>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{t('contacts.intro')}</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <a href={waHref} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 rounded border hover:bg-gray-50 dark:hover:bg-gray-800/50">
          <WhatsAppIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          <span className="text-sm">WhatsApp</span>
        </a>

        <a href={messengerHref} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 rounded border hover:bg-gray-50 dark:hover:bg-gray-800/50">
          <MessengerIcon className="h-6 w-6 text-blue-500 dark:text-blue-400" />
          <span className="text-sm">Messenger</span>
        </a>

        <a href={phoneHref} className="flex flex-col items-center gap-2 p-3 rounded border hover:bg-gray-50 dark:hover:bg-gray-800/50">
          <IPhoneIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
          <span className="text-sm">{waNumber}</span>
        </a>

        <a href={emailHref} className="flex flex-col items-center gap-2 p-3 rounded border hover:bg-gray-50 dark:hover:bg-gray-800/50">
          <GmailIcon className="h-6 w-6 text-red-500 dark:text-red-400" />
          <span className="text-sm">{email}</span>
        </a>
      </div>
    </div>
  )
}
