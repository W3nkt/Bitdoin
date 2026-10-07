import i18n from '@/i18n'

// Replaces the browser's built-in "Please fill out this field." bubbles, which
// follow the browser's language (not the site's) and can't be styled, with an
// app-styled tip in the current site language. Works for every form that uses
// native validation (required, type="email", minLength, pattern, ...).

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

const INVALID_ATTR = 'data-invalid'

let tip: HTMLDivElement | null = null
let tipFor: Field | null = null
let lastShownAt = 0
let hideTimer: number | undefined

// Like the native bubble, the tip fades on its own; the red outline stays
// until the field is fixed.
const TIP_MS = 6000

function isField(el: EventTarget | null): el is Field {
  return el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
}

function messageFor(el: Field): string {
  const v = el.validity
  const t = (key: string, options?: Record<string, unknown>) => i18n.t(`validation.${key}`, options)
  const type = el instanceof HTMLInputElement ? el.type : ''

  // A message the page set on purpose via setCustomValidity() wins.
  if (v.customError) return el.validationMessage
  if (v.valueMissing) {
    if (el instanceof HTMLSelectElement || type === 'radio') return t('selectRequired')
    if (type === 'checkbox') return t('checkRequired')
    return t('required')
  }
  if (v.typeMismatch) return type === 'email' ? t('email') : type === 'url' ? t('url') : t('invalid')
  if (v.tooShort) return t('tooShort', { min: (el as HTMLInputElement).minLength, count: el.value.length })
  if (v.tooLong) return t('tooLong', { max: (el as HTMLInputElement).maxLength })
  // A field's own title describes its expected format best.
  if (v.patternMismatch) return el.title || t('pattern')
  if (v.rangeUnderflow) return t('rangeUnderflow', { min: (el as HTMLInputElement).min })
  if (v.rangeOverflow) return t('rangeOverflow', { max: (el as HTMLInputElement).max })
  if (v.badInput || v.stepMismatch) return t('number')
  return t('invalid')
}

// Radios and checkboxes are tiny; point the tip at their label/card instead.
function anchorOf(el: Field): Element {
  if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')) {
    return el.closest('label') ?? el
  }
  return el
}

function radioGroup(el: Field): Field[] {
  if (el instanceof HTMLInputElement && el.type === 'radio' && el.name) {
    const scope = el.form ?? document
    return [...scope.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(el.name)}"]`)]
  }
  return [el]
}

function hideTip() {
  window.clearTimeout(hideTimer)
  tip?.remove()
  tip = null
  tipFor = null
}

function showTip(el: Field) {
  hideTip()
  const rect = anchorOf(el).getBoundingClientRect()
  tip = document.createElement('div')
  tip.className = 'form-error-tip'
  tip.setAttribute('role', 'alert')
  tip.innerHTML = '<span class="form-error-tip__icon" aria-hidden="true">!</span><span class="form-error-tip__text"></span>'
  tip.querySelector('.form-error-tip__text')!.textContent = messageFor(el)
  document.body.appendChild(tip)

  // Page coordinates, so the tip scrolls with the field.
  const width = tip.offsetWidth
  const left = Math.min(
    Math.max(rect.left + window.scrollX, window.scrollX + 8),
    window.scrollX + document.documentElement.clientWidth - width - 8,
  )
  tip.style.left = `${left}px`
  tip.style.top = `${rect.bottom + window.scrollY + 8}px`
  tip.style.setProperty('--arrow-left', `${Math.min(Math.max(rect.left + window.scrollX - left + 18, 14), width - 14)}px`)
  tipFor = el
  hideTimer = window.setTimeout(hideTip, TIP_MS)
}

// Drop the tip once its field is gone (e.g. the page changed).
function hideIfDetached() {
  if (tipFor && !tipFor.isConnected) hideTip()
}

function handleInvalid(e: Event) {
  if (!isField(e.target)) return
  const el = e.target
  // Suppress the browser bubble; the form still won't submit.
  e.preventDefault()
  radioGroup(el).forEach(field => field.setAttribute(INVALID_ATTR, 'true'))

  // On submit the browser fires `invalid` for every bad field at once; only
  // the first one gets the tip and the focus.
  const now = performance.now()
  if (now - lastShownAt < 50) return
  lastShownAt = now
  showTip(el)
  el.focus({ preventScroll: true })
  anchorOf(el).scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function handleEdit(e: Event) {
  if (!isField(e.target)) return
  const el = e.target
  if (!el.hasAttribute(INVALID_ATTR) && tipFor !== el) return
  if (el.validity.valid) {
    radioGroup(el).forEach(field => field.removeAttribute(INVALID_ATTR))
    if (tipFor && radioGroup(el).includes(tipFor)) hideTip()
  } else if (tipFor === el) {
    // Still invalid, but maybe for a different reason (e.g. now too short).
    tip!.querySelector('.form-error-tip__text')!.textContent = messageFor(el)
  }
}

let installed = false

export function installLocalizedValidation() {
  if (installed || typeof document === 'undefined') return
  installed = true
  document.addEventListener('invalid', handleInvalid, true)
  document.addEventListener('input', handleEdit, true)
  document.addEventListener('change', handleEdit, true)
  window.addEventListener('resize', hideTip)
  // Leaving the page (SPA navigation) or switching language clears the tip.
  window.addEventListener('popstate', hideTip)
  document.addEventListener('click', () => window.setTimeout(hideIfDetached), true)
  i18n.on('languageChanged', () => {
    if (tipFor) showTip(tipFor)
  })
}
