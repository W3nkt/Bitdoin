import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWhatsapp, faFacebookMessenger } from '@fortawesome/free-brands-svg-icons'
import { faMobile, faEnvelope } from '@fortawesome/free-solid-svg-icons'

export function WhatsAppIcon({ className }: { className?: string }) {
  return <FontAwesomeIcon icon={faWhatsapp} className={className} />
}

export function MessengerIcon({ className }: { className?: string }) {
  return <FontAwesomeIcon icon={faFacebookMessenger} className={className} />
}

export function IPhoneIcon({ className }: { className?: string }) {
  return <FontAwesomeIcon icon={faMobile} className={className} />
}

export function GmailIcon({ className }: { className?: string }) {
  return <FontAwesomeIcon icon={faEnvelope} className={className} />
}

export default WhatsAppIcon
