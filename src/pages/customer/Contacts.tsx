import { useTranslation } from 'react-i18next'
import { WhatsAppIcon, MessengerIcon, IPhoneIcon, GmailIcon } from '@/components/ui/ContactIcons'

export default function Contacts() {
  const { t } = useTranslation()

  const rawWa = import.meta.env.VITE_ADMIN_WHATSAPP || ''
  const waNumber = rawWa.replace(/\s+/g, '')
  const waHref = waNumber ? `https://wa.me/${waNumber.replace(/\D/g,'')}` : ''

  const rawMessenger = import.meta.env.VITE_ADMIN_MESSENGER || ''
  const messengerHref = rawMessenger.startsWith('http') ? rawMessenger : (rawMessenger ? `https://${rawMessenger.replace(/^\/+/, '')}` : '')

  const phoneNumber = waNumber || ''
  const phoneHref = phoneNumber ? `tel:${phoneNumber.replace(/\s+/g,'')}` : ''

  const email = 'ckateng25@gmail.com'
  const emailHref = `mailto:${email}`

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{t('nav.contacts')}</h1>

      <p className="text-sm text-gray-600 mb-4">{t('contacts.intro')}</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <a href={waHref} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 rounded border hover:bg-gray-50">
          <WhatsAppIcon className="h-6 w-6 text-green-600" />
          <span className="text-sm">WhatsApp</span>
        </a>

        <a href={messengerHref} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-3 rounded border hover:bg-gray-50">
          <MessengerIcon className="h-6 w-6" />
          <span className="text-sm">Messenger</span>
        </a>

        <a href={phoneHref} className="flex flex-col items-center gap-2 p-3 rounded border hover:bg-gray-50">
          <IPhoneIcon className="h-6 w-6 text-gray-700" />
          <span className="text-sm">{phoneNumber || t('contacts.noPhone')}</span>
        </a>

        <a href={emailHref} className="flex flex-col items-center gap-2 p-3 rounded border hover:bg-gray-50">
          <GmailIcon className="h-6 w-6" />
          <span className="text-sm">{email}</span>
        </a>
      </div>
    </div>
  )
}
