import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

type QuestionType = 'text' | 'longtext' | 'single' | 'scale'

interface Question {
  id: string
  emoji: string
  prompt: string
  helper?: string
  type: QuestionType
  options?: string[]
  placeholder?: string
  inputMode?: 'text' | 'tel'
}

// Curated per Premium/BitDoin_User_Onboarding_Questionnaire.md's own guidance:
// registration should only ask ~10-12 essential questions, the rest are
// gathered progressively later (one extra question a day, monthly reassessment).
//
// Question ids match the AI Memory Schema field names in
// Premium/BitDoin_AI_Personalization_System.md section 1, so the saved
// `responses` blob can be dropped straight into the mentor prompt template
// (section 3.1) without a translation layer.
const QUESTIONS: Question[] = [
  {
    id: 'preferred_name',
    emoji: '😊',
    prompt: 'What should we call you?',
    type: 'text',
    placeholder: 'Your name',
  },
  {
    id: 'current_status',
    emoji: '🎓',
    prompt: 'What are you up to these days?',
    type: 'single',
    options: ['High School Student', 'University Student', 'Vocational Student', 'Working', 'Looking for a Job', 'Other'],
  },
  {
    id: 'priority_goal',
    emoji: '🎯',
    prompt: "What's your biggest goal right now?",
    type: 'longtext',
    placeholder: 'e.g. Improve my English, get a scholarship, learn AI...',
  },
  {
    id: 'biggest_problem_now',
    emoji: '😕',
    prompt: "What's your biggest challenge right now?",
    type: 'single',
    options: [
      'I procrastinate',
      'I cannot focus',
      "I don't know what to study",
      "I don't know what career to choose",
      'I feel stressed',
      'I have low confidence',
      "I don't have motivation",
      'I cannot speak English',
      'I use social media too much',
    ],
  },
  {
    id: 'daily_study_hours',
    emoji: '📚',
    prompt: 'How many hours do you study each day?',
    type: 'single',
    options: ['Less than 1 hour', '1-2 hours', '2-3 hours', '3-5 hours', 'More than 5 hours'],
  },
  {
    id: 'whatsapp_number',
    emoji: 'WA',
    prompt: 'What WhatsApp number should we use for daily reminders?',
    helper: 'Enter the 8 digits after +85620.',
    type: 'text',
    placeholder: '12345678',
    inputMode: 'tel',
  },
  {
    id: 'daily_reminder_time',
    emoji: 'TIME',
    prompt: 'When should we remind you each day?',
    type: 'single',
    options: ['Morning', 'Afternoon', 'Evening', 'No reminder for now'],
  },
  {
    id: 'ai_tool_experience',
    emoji: '🤖',
    prompt: 'Have you used ChatGPT before?',
    type: 'single',
    options: ['Every day', 'Weekly', 'Sometimes', 'Never'],
  },
  {
    id: 'english_level_self_rating',
    emoji: '🇬🇧',
    prompt: 'How confident are you in English?',
    helper: '1 = not confident, 5 = very confident',
    type: 'scale',
  },
  {
    id: 'motivation_source',
    emoji: '🔥',
    prompt: 'What motivates you the most?',
    type: 'single',
    options: ['Family', 'Money', 'Career', 'Education', 'Self-improvement', 'Freedom', 'Helping others'],
  },
  {
    id: 'preferred_mentor_tone',
    emoji: '💬',
    prompt: 'How should BitDoin talk to you?',
    type: 'single',
    options: ['Friend', 'Teacher', 'Mentor', 'Coach', 'Professional'],
  },
  {
    id: 'preferred_ai_response_style',
    emoji: '🎨',
    prompt: 'How do you like answers explained?',
    type: 'single',
    options: ['Simple', 'Detailed', 'Step-by-step', 'Motivational', 'Visual examples'],
  },
]

interface OnboardingChatProps {
  open: boolean
  userId: string
  onClose: () => void
  onComplete: () => void
}

export function OnboardingChat({ open, userId, onClose, onComplete }: OnboardingChatProps) {
  const { error } = useToast()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const whatsappInputRefs = useRef<Array<HTMLInputElement | null>>([])

  if (!open) return null

  const isIntro = step === 0
  const question = QUESTIONS[step]
  const total = QUESTIONS.length
  const currentValue = answers[question.id] ?? ''
  const isFreeform = question.type === 'text' || question.type === 'longtext'
  const isWhatsAppQuestion = question.id === 'whatsapp_number'
  const canContinue = isWhatsAppQuestion
    ? /^\d{8}$/.test(draft)
    : isFreeform
      ? draft.trim().length > 0
      : currentValue.trim().length > 0
  const isLast = step === total - 1

  function reset() {
    setStep(0)
    setAnswers({})
    setDraft('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function selectOption(value: string) {
    setAnswers(prev => ({ ...prev, [question.id]: value }))
  }

  function setWhatsAppDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    if (!digit) return

    const digits = draft.split('')
    digits[index] = digit
    const nextValue = digits.join('').slice(0, 8)
    setDraft(nextValue)
    whatsappInputRefs.current[Math.min(index + 1, 7)]?.focus()
  }

  function handleWhatsAppKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Backspace') return
    event.preventDefault()

    if (draft[index]) {
      setDraft(`${draft.slice(0, index)}${draft.slice(index + 1)}`)
      return
    }

    const previousIndex = Math.max(index - 1, 0)
    setDraft(`${draft.slice(0, previousIndex)}${draft.slice(previousIndex + 1)}`)
    whatsappInputRefs.current[previousIndex]?.focus()
  }

  function handleWhatsAppPaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    let digits = event.clipboardData.getData('text').replace(/\D/g, '')
    if (digits.startsWith('85620')) digits = digits.slice(5)
    const nextValue = digits.slice(0, 8)
    setDraft(nextValue)
    whatsappInputRefs.current[Math.min(nextValue.length, 7)]?.focus()
  }

  function goNext() {
    const finalAnswers = isFreeform ? { ...answers, [question.id]: draft.trim() } : answers
    if (isFreeform) setAnswers(finalAnswers)

    if (isLast) {
      void finish(finalAnswers)
      return
    }
    setStep(s => s + 1)
    setDraft(finalAnswers[QUESTIONS[step + 1]?.id] ?? '')
  }

  function goBack() {
    if (step === 0) return
    const prevQuestion = QUESTIONS[step - 1]
    setDraft(answers[prevQuestion.id] ?? '')
    setStep(s => s - 1)
  }

  async function finish(finalAnswers: Record<string, string>) {
    setSaving(true)
    try {
      const whatsappDigits = finalAnswers.whatsapp_number?.replace(/\D/g, '') ?? ''
      const whatsappNumber = whatsappDigits.length === 8 ? `+85620${whatsappDigits}` : null
      const normalizedAnswers = {
        ...finalAnswers,
        whatsapp_number: whatsappNumber ?? '',
      }
      const reminderTime = finalAnswers.daily_reminder_time?.trim() || null
      const reminderEnabled = Boolean(whatsappNumber && reminderTime !== 'No reminder for now')
      const { error: saveError } = await supabase
        .from('premium_onboarding_responses')
        .upsert({
          user_id: userId,
          responses: normalizedAnswers,
          whatsapp_number: whatsappNumber,
          daily_reminder_enabled: reminderEnabled,
          daily_reminder_time: reminderEnabled ? reminderTime : null,
          completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (saveError) throw saveError
      reset()
      onComplete()
    } catch (err) {
      console.error(err)
      error('Could not save your answers. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl md:max-h-[85vh] md:max-w-lg md:rounded-3xl">
        {/* Progress bar */}
        <div className="h-1.5 w-full bg-gray-100">
          <div
            className="h-full bg-primary-700 transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between px-5 pt-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary-600">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Getting to know you
          </div>
          <button
            onClick={handleClose}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {isIntro && (
            <div className="mb-5 rounded-2xl bg-primary-50 p-4 text-sm leading-6 text-primary-900">
              👋 Hi! I'm BitDoin. Before I become your mentor, I'd like to get to know you. It only takes a minute.
            </div>
          )}

          <div key={question.id} className="animate-slide-up">
            <p className="text-2xl">{question.emoji}</p>
            <h3 className="mt-2 text-xl font-black text-gray-950">{question.prompt}</h3>
            {question.helper && <p className="mt-1 text-xs text-gray-400">{question.helper}</p>}

            <div className="mt-5">
              {(question.type === 'text') && (
                isWhatsAppQuestion ? (
                  <div className="flex w-full items-center gap-2 sm:gap-3" onPaste={handleWhatsAppPaste}>
                    <span className="flex h-12 flex-shrink-0 items-center rounded-xl border-2 border-gray-200 bg-gray-50 px-3 text-sm font-black tabular-nums text-gray-700 sm:px-4">
                      +85620
                    </span>
                    <div className="grid min-w-0 flex-1 grid-cols-8 gap-1.5 sm:gap-2">
                      {Array.from({ length: 8 }, (_, index) => (
                        <input
                          key={index}
                          ref={element => { whatsappInputRefs.current[index] = element }}
                          autoFocus={index === 0}
                          type="tel"
                          inputMode="numeric"
                          autoComplete={index === 0 ? 'tel-national' : 'off'}
                          aria-label={`WhatsApp digit ${index + 1} of 8`}
                          value={draft[index] ?? ''}
                          maxLength={1}
                          pattern="[0-9]"
                          onChange={event => setWhatsAppDigit(index, event.target.value)}
                          onKeyDown={event => handleWhatsAppKeyDown(index, event)}
                          onFocus={event => event.currentTarget.select()}
                          className="h-12 min-w-0 rounded-xl border-2 border-gray-200 text-center text-base font-black tabular-nums text-gray-900 outline-none transition-colors focus:border-primary-500 focus:bg-primary-50"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <input
                    autoFocus
                    type={question.inputMode === 'tel' ? 'tel' : 'text'}
                    inputMode={question.inputMode}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    placeholder={question.placeholder}
                    className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:outline-none"
                  />
                )
              )}

              {question.type === 'longtext' && (
                <textarea
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder={question.placeholder}
                  rows={3}
                  className="w-full resize-none rounded-2xl border-2 border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:outline-none"
                />
              )}

              {question.type === 'single' && (
                <div className="grid gap-2">
                  {question.options!.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => selectOption(option)}
                      className={cn(
                        'rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition-colors',
                        currentValue === option
                          ? 'border-primary-700 bg-primary-50 text-primary-900'
                          : 'border-gray-200 text-gray-700 hover:border-primary-300',
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {question.type === 'scale' && (
                <div className="flex justify-between gap-2">
                  {['1', '2', '3', '4', '5'].map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectOption(value)}
                      className={cn(
                        'flex h-12 flex-1 items-center justify-center rounded-2xl border-2 text-base font-black transition-colors',
                        currentValue === value
                          ? 'border-primary-700 bg-primary-50 text-primary-900'
                          : 'border-gray-200 text-gray-700 hover:border-primary-300',
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="h-4 w-4" />}
            onClick={goBack}
            disabled={step === 0}
          >
            Back
          </Button>
          <span className="text-xs font-semibold text-gray-400">{step + 1} / {total}</span>
          <Button
            type="button"
            size="sm"
            onClick={goNext}
            loading={saving}
            disabled={!canContinue}
            icon={!isLast ? <ArrowRight className="h-4 w-4" /> : undefined}
          >
            {isLast ? 'Finish' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
