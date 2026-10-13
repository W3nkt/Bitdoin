// The platform's WhatsApp number (digits only, with country code).
export const ADMIN_WHATSAPP_NUMBER = (import.meta.env.VITE_ADMIN_WHATSAPP || '+8562095324510').replace(/\D/g, '')

/** A wa.me link to the platform, optionally with a drafted message. */
export function adminWhatsAppLink(text?: string) {
  const base = `https://wa.me/${ADMIN_WHATSAPP_NUMBER}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
