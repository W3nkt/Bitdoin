import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  Clock3,
  MessagesSquare,
  Puzzle,
  RotateCcw,
  Star,
  Target,
  X,
  Zap,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { usePremiumTranslation } from '@/i18n/premium'

type ActivityKind = 'brain_sprint' | 'word_match'

interface ActivityAttempt {
  activity_type: 'brain_sprint' | 'word_match' | 'ai_roleplay'
  score: number
  total: number
  xp_earned: number
  completed_at: string
}

interface Question {
  prompt: string
  options: string[]
  answer: string
  explanation: string
}

const BRAIN_QUESTION_BANK: Question[] = [
  {
    prompt: 'What is 15% of 200?',
    options: ['15', '20', '30', '40'],
    answer: '30',
    explanation: '10% is 20 and 5% is 10, so 15% is 30.',
  },
  {
    prompt: 'Choose the correct sentence.',
    options: ['She go to school.', 'She goes to school.', 'She going to school.', 'She gone school.'],
    answer: 'She goes to school.',
    explanation: 'With “she” in the present simple, the verb takes -s: “goes.”',
  },
  {
    prompt: 'Which study method best strengthens long-term memory?',
    options: ['Rereading once', 'Highlighting everything', 'Retrieval practice', 'Studying all night'],
    answer: 'Retrieval practice',
    explanation: 'Actively recalling an answer strengthens memory more than passive rereading.',
  },
  {
    prompt: 'A book costs 80,000 LAK after a 20% discount. What was its original price?',
    options: ['90,000 LAK', '96,000 LAK', '100,000 LAK', '120,000 LAK'],
    answer: '100,000 LAK',
    explanation: '80,000 is 80% of the original price, so 80,000 ÷ 0.8 = 100,000.',
  },
  {
    prompt: 'Which action is the clearest next step for a large goal?',
    options: ['Wait for motivation', 'Make it more ambitious', 'Choose one small task', 'Think about every risk'],
    answer: 'Choose one small task',
    explanation: 'A specific, manageable next action makes progress easier to start and measure.',
  },
  {
    prompt: 'What is 3/4 written as a percentage?',
    options: ['25%', '50%', '75%', '80%'],
    answer: '75%',
    explanation: 'Three divided by four is 0.75, which equals 75%.',
  },
  {
    prompt: 'Choose the word that best completes: “I have ___ my homework.”',
    options: ['finish', 'finished', 'finishing', 'finishes'],
    answer: 'finished',
    explanation: 'The present perfect uses “have” plus the past participle: “have finished.”',
  },
  {
    prompt: 'Which source is usually most reliable for official Lao curriculum information?',
    options: ['An anonymous post', 'A random comment', 'The Ministry of Education', 'An advertisement'],
    answer: 'The Ministry of Education',
    explanation: 'Official ministry resources are the primary source for national curriculum information.',
  },
  {
    prompt: 'If you save 10,000 LAK each day for 30 days, how much will you save?',
    options: ['30,000 LAK', '100,000 LAK', '300,000 LAK', '3,000,000 LAK'],
    answer: '300,000 LAK',
    explanation: '10,000 multiplied by 30 equals 300,000 LAK.',
  },
  {
    prompt: 'Which habit is most helpful before an exam?',
    options: ['One all-night session', 'Short spaced reviews', 'Skipping sleep', 'Only rereading notes'],
    answer: 'Short spaced reviews',
    explanation: 'Spacing study across several sessions supports stronger long-term memory.',
  },
  {
    prompt: 'Which sentence asks for help politely?',
    options: ['Help me now.', 'You must help.', 'Could you please help me?', 'Why no help?'],
    answer: 'Could you please help me?',
    explanation: '“Could you please…” is a clear and polite request form.',
  },
  {
    prompt: 'A bus leaves at 08:35 and travels for 1 hour 45 minutes. When does it arrive?',
    options: ['09:20', '10:10', '10:20', '11:20'],
    answer: '10:20',
    explanation: '08:35 plus one hour is 09:35, then plus 45 minutes is 10:20.',
  },
  {
    prompt: 'What should you do first when an online claim seems surprising?',
    options: ['Share it quickly', 'Check the original source', 'Believe the headline', 'Ignore all evidence'],
    answer: 'Check the original source',
    explanation: 'Checking the original and another reliable source helps verify the claim.',
  },
  {
    prompt: 'Which is a renewable source of energy?',
    options: ['Coal', 'Diesel', 'Solar power', 'Natural gas'],
    answer: 'Solar power',
    explanation: 'Sunlight is naturally replenished, so solar power is renewable.',
  },
  {
    prompt: 'What is the best way to make a study goal measurable?',
    options: ['Study more', 'Try harder', 'Read 10 pages tonight', 'Become smarter'],
    answer: 'Read 10 pages tonight',
    explanation: 'A measurable goal states a specific action and amount.',
  },
]

const WORD_PAIR_BANK = [
  { id: 'learn', left: 'Learn', right: 'ຮຽນ' },
  { id: 'teacher', left: 'Teacher', right: 'ຄູ' },
  { id: 'book', left: 'Book', right: 'ປຶ້ມ' },
  { id: 'future', left: 'Future', right: 'ອະນາຄົດ' },
  { id: 'goal', left: 'Goal', right: 'ເປົ້າໝາຍ' },
  { id: 'knowledge', left: 'Knowledge', right: 'ຄວາມຮູ້' },
  { id: 'student', left: 'Student', right: 'ນັກຮຽນ' },
  { id: 'school', left: 'School', right: 'ໂຮງຮຽນ' },
  { id: 'question', left: 'Question', right: 'ຄຳຖາມ' },
  { id: 'answer', left: 'Answer', right: 'ຄຳຕອບ' },
  { id: 'practice', left: 'Practice', right: 'ຝຶກຝົນ' },
  { id: 'success', left: 'Success', right: 'ຄວາມສຳເລັດ' },
  { id: 'time', left: 'Time', right: 'ເວລາ' },
  { id: 'work', left: 'Work', right: 'ວຽກ' },
  { id: 'skill', left: 'Skill', right: 'ທັກສະ' },
  { id: 'confidence', left: 'Confidence', right: 'ຄວາມໝັ້ນໃຈ' },
]
const WEEK_DAYS = [
  { short: 'Mon', label: 'M' },
  { short: 'Tue', label: 'T' },
  { short: 'Wed', label: 'W' },
  { short: 'Thu', label: 'T' },
  { short: 'Fri', label: 'F' },
  { short: 'Sat', label: 'S' },
  { short: 'Sun', label: 'S' },
]
const ROLEPLAY_MISSIONS = [
  { slug: 'job-interview', description: 'Practice a job interview with your personal mentor.' },
  { slug: 'english-cafe', description: 'Order food and ask questions in English at a café.' },
  { slug: 'class-presentation', description: 'Practice introducing a short class presentation.' },
  { slug: 'ask-teacher-help', description: 'Ask a teacher for help clearly and politely.' },
  { slug: 'scholarship-interview', description: 'Practice answering a scholarship interview question.' },
  { slug: 'customer-service', description: 'Help a customer solve a simple problem in English.' },
  { slug: 'travel-directions', description: 'Ask for and give simple travel directions in English.' },
]

function hashSeed(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededRandom(seed: number) {
  let value = seed
  return () => {
    value += 0x6D2B79F5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number = Math.random) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function todayInLaos() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Vientiane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function PlayLearnArcade({
  profileId,
  onStartRoleplay,
}: {
  profileId: string
  onStartRoleplay: (mission: string) => void
}) {
  usePremiumTranslation()
  const queryClient = useQueryClient()
  const { success, error } = useToast()
  const [activeActivity, setActiveActivity] = useState<ActivityKind | null>(null)
  const [brainQuestions, setBrainQuestions] = useState<typeof BRAIN_QUESTION_BANK>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [brainAnswers, setBrainAnswers] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [showExplanation, setShowExplanation] = useState(false)
  const [wordSelection, setWordSelection] = useState<{ id: string; side: 'left' | 'right' } | null>(null)
  const [matchedWords, setMatchedWords] = useState<string[]>([])
  const [wrongWord, setWrongWord] = useState<string | null>(null)
  const [wordShuffleNonce, setWordShuffleNonce] = useState(0)
  const [saving, setSaving] = useState(false)

  const attempts = useQuery({
    queryKey: ['premium', 'learning-activity-attempts', profileId],
    queryFn: async () => {
      const { data, error: attemptsError } = await supabase
        .from('premium_learning_activity_attempts')
        .select('activity_type,score,total,xp_earned,completed_at')
        .eq('user_id', profileId)
        .order('completed_at', { ascending: false })
        .limit(100)
      if (attemptsError) throw attemptsError
      return data as ActivityAttempt[]
    },
    retry: 1,
  })

  const today = todayInLaos()
  const dailyBrainQuestions = useMemo(
    () => shuffle(BRAIN_QUESTION_BANK, seededRandom(hashSeed(`brain:${today}`))).slice(0, 5),
    [today],
  )
  const dailyWordPairs = useMemo(
    () => shuffle(WORD_PAIR_BANK, seededRandom(hashSeed(`words:${today}`))).slice(0, 6),
    [today],
  )
  const dailyRoleplayMission = useMemo(
    () => ROLEPLAY_MISSIONS[hashSeed(`roleplay:${today}`) % ROLEPLAY_MISSIONS.length],
    [today],
  )
  const todayAttempts = (attempts.data ?? []).filter(attempt => todayInLaosFromIso(attempt.completed_at) === today)
  const completedToday = new Set(todayAttempts.map(attempt => attempt.activity_type))
  const activeWeekdays = new Set((attempts.data ?? [])
    .filter(attempt => Date.now() - new Date(attempt.completed_at).getTime() < 7 * 24 * 60 * 60 * 1000)
    .map(attempt => new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Vientiane',
      weekday: 'short',
    }).format(new Date(attempt.completed_at))))
  const bestBrainScore = Math.max(0, ...(attempts.data ?? []).filter(item => item.activity_type === 'brain_sprint').map(item => Math.round((item.score / item.total) * 100)))
  const bestWordScore = Math.max(0, ...(attempts.data ?? []).filter(item => item.activity_type === 'word_match').map(item => item.score))
  const activeDays = new Set((attempts.data ?? []).map(attempt => todayInLaosFromIso(attempt.completed_at))).size

  const shuffledWords = useMemo(() => {
    const cards = dailyWordPairs.flatMap(pair => [
      { id: pair.id, side: 'left' as const, label: pair.left },
      { id: pair.id, side: 'right' as const, label: pair.right },
    ])
    return shuffle(cards)
  }, [dailyWordPairs, wordShuffleNonce])

  function resetBrainSprint() {
    setBrainQuestions(shuffle(dailyBrainQuestions).map(question => ({
      ...question,
      options: shuffle(question.options),
    })))
    setQuestionIndex(0)
    setBrainAnswers([])
    setSelectedAnswer('')
    setShowExplanation(false)
  }

  function openActivity(kind: ActivityKind) {
    setActiveActivity(kind)
    if (kind === 'brain_sprint') resetBrainSprint()
    if (kind === 'word_match') {
      setWordShuffleNonce(nonce => nonce + 1)
      setWordSelection(null)
      setMatchedWords([])
      setWrongWord(null)
    }
  }

  async function completeActivity(kind: ActivityKind, score: number, total: number) {
    setSaving(true)
    try {
      const { data, error: completionError } = await supabase.rpc('complete_premium_learning_activity', {
        p_activity_type: kind,
        p_score: score,
        p_total: total,
        p_metadata: {},
      })
      if (completionError) throw completionError
      const result = data as { xp_earned?: number } | null
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['premium', 'learning-activity-attempts', profileId] }),
        queryClient.invalidateQueries({ queryKey: ['premium', 'member-progress', profileId] }),
      ])
      success(result?.xp_earned ? `Activity complete! +${result.xp_earned} XP` : 'Activity complete! Replay anytime.')
    } catch (completionError) {
      console.error(completionError)
      error('Could not save this activity. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function advanceBrainSprint() {
    if (!selectedAnswer) return
    if (!showExplanation) {
      setShowExplanation(true)
      return
    }
    const nextAnswers = [...brainAnswers, selectedAnswer]
    if (questionIndex === brainQuestions.length - 1) {
      setBrainAnswers(nextAnswers)
      const score = nextAnswers.filter((answer, index) => answer === brainQuestions[index].answer).length
      await completeActivity('brain_sprint', score, brainQuestions.length)
      return
    }
    setBrainAnswers(nextAnswers)
    setQuestionIndex(index => index + 1)
    setSelectedAnswer('')
    setShowExplanation(false)
  }

  async function selectWord(id: string, side: 'left' | 'right') {
    if (matchedWords.includes(id)) return
    if (!wordSelection) {
      setWordSelection({ id, side })
      return
    }
    if (wordSelection.id === id && wordSelection.side !== side) {
      const nextMatches = [...matchedWords, id]
      setMatchedWords(nextMatches)
      setWordSelection(null)
      setWrongWord(null)
      if (nextMatches.length === dailyWordPairs.length) {
        await completeActivity('word_match', dailyWordPairs.length, dailyWordPairs.length)
      }
      return
    }
    setWrongWord(`${id}-${side}`)
    setWordSelection({ id, side })
    window.setTimeout(() => setWrongWord(null), 450)
  }

  const brainFinished = brainQuestions.length > 0 && brainAnswers.length === brainQuestions.length
  const brainScore = brainAnswers.filter((answer, index) => answer === brainQuestions[index]?.answer).length
  const currentQuestion = brainQuestions[questionIndex]

  return (
    <section className="premium-i18n overflow-hidden rounded-3xl bg-white shadow-card">
      <div className="px-5 pb-4 pt-5 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-600">Practice arcade</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-primary-950">Play & Learn</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">Short activities. Real learning.</p>
          </div>
          <div className="hidden items-center gap-2 text-right sm:flex">
            <Target className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-xs font-black text-slate-800">{activeDays} active {activeDays === 1 ? 'day' : 'days'}</p>
              <p className="text-[10px] font-semibold text-slate-400">Keep building mastery</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50/80 px-4 py-4 sm:px-6">
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Target className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800">Weekly mastery</p>
            <p className="mt-0.5 text-[10px] font-bold text-emerald-600">{Math.min(activeDays, 7)} of 7 days</p>
          </div>
          <div className="flex gap-1.5" aria-label={`${Math.min(activeDays, 7)} active learning days this week`}>
            {WEEK_DAYS.map(day => {
              const active = activeWeekdays.has(day.short)
              return (
                <span key={day.short} className="flex flex-col items-center gap-1">
                  <span className="text-[8px] font-black text-slate-400">{day.label}</span>
                  <span className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border',
                    active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white',
                  )}>
                    {active && <Check className="h-2.5 w-2.5" />}
                  </span>
                </span>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => openActivity('brain_sprint')}
          className="group relative w-full overflow-hidden rounded-3xl bg-primary-950 p-5 text-left text-white shadow-xl shadow-primary-950/15 transition hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-950/20">
              <BrainCircuit className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Today’s challenge</p>
                {completedToday.has('brain_sprint') && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white">
                    <RotateCcw className="h-3 w-3" /> Replay
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-xl font-black">Daily Brain Sprint</h3>
              <p className="mt-1 text-sm leading-6 text-primary-100">Five quick questions to strengthen recall and practical thinking.</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-bold text-primary-100">
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" /> ~3 min</span>
                <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-emerald-300" /> {bestBrainScore ? `Best: ${bestBrainScore}%` : '+15 XP'}</span>
              </div>
            </div>
          </div>
          <span className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white transition group-hover:bg-emerald-400">
            {completedToday.has('brain_sprint') ? 'Play again' : 'Play now'}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </button>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <ActivityTile
            title="Word Match"
            description="Build Lao–English vocabulary through fast matching."
            duration="2–4 min"
            stat={bestWordScore ? `Best: ${bestWordScore} pairs` : '+15 XP'}
            completed={completedToday.has('word_match')}
            icon={<Puzzle className="h-6 w-6" />}
            onClick={() => openActivity('word_match')}
          />
          <ActivityTile
            title="AI Role-play Mission"
            description={dailyRoleplayMission.description}
            duration="3–5 min"
            stat={completedToday.has('ai_roleplay') ? 'Completed today' : '+20 XP'}
            completed={completedToday.has('ai_roleplay')}
            accent="violet"
            icon={<MessagesSquare className="h-6 w-6" />}
            onClick={() => onStartRoleplay(dailyRoleplayMission.slug)}
          />
        </div>
      </div>

      <Modal
        open={activeActivity === 'brain_sprint'}
        onClose={() => setActiveActivity(null)}
        title="Daily Brain Sprint"
        size="lg"
      >
        {brainFinished ? (
          <ActivityResult
            score={`${brainScore}/${brainQuestions.length}`}
            title={brainScore >= 4 ? 'Strong thinking!' : 'Good practice!'}
            detail="Your result is saved. Replay to improve your score—XP is awarded once each day."
            onReplay={resetBrainSprint}
            onClose={() => setActiveActivity(null)}
          />
        ) : currentQuestion ? (
          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="text-xs font-black text-emerald-700">Question {questionIndex + 1} of {brainQuestions.length}</span>
              <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${((questionIndex + 1) / brainQuestions.length) * 100}%` }} />
              </div>
            </div>
            <p className="text-lg font-black leading-7 text-primary-950">{currentQuestion.prompt}</p>
            <div className="mt-5 grid gap-2">
              {currentQuestion.options.map(option => {
                const isSelected = selectedAnswer === option
                const isAnswer = currentQuestion.answer === option
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={showExplanation}
                    onClick={() => setSelectedAnswer(option)}
                    className={cn(
                      'flex min-h-12 items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-bold transition',
                      showExplanation && isAnswer && 'border-emerald-500 bg-emerald-50 text-emerald-900',
                      showExplanation && isSelected && !isAnswer && 'border-red-300 bg-red-50 text-red-800',
                      !showExplanation && isSelected && 'border-primary-500 bg-primary-50 text-primary-950 ring-2 ring-primary-100',
                      !showExplanation && !isSelected && 'border-slate-200 bg-white text-slate-700 hover:border-primary-300',
                    )}
                  >
                    {option}
                    {showExplanation && isAnswer && <Check className="h-4 w-4" />}
                    {showExplanation && isSelected && !isAnswer && <X className="h-4 w-4" />}
                  </button>
                )
              })}
            </div>
            {showExplanation && (
              <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">{currentQuestion.explanation}</p>
            )}
            <button
              type="button"
              disabled={!selectedAnswer || saving}
              onClick={() => void advanceBrainSprint()}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {showExplanation ? (questionIndex === brainQuestions.length - 1 ? 'See result' : 'Next question') : 'Check answer'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={activeActivity === 'word_match'}
        onClose={() => setActiveActivity(null)}
        title="Word Match"
        size="lg"
      >
        {matchedWords.length === dailyWordPairs.length ? (
          <ActivityResult
            score={`${dailyWordPairs.length}/${dailyWordPairs.length}`}
            title="Perfect match!"
            detail="You matched every Lao–English pair. Replay anytime to strengthen recall."
            onReplay={() => {
              setMatchedWords([])
              setWordSelection(null)
              setWordShuffleNonce(nonce => nonce + 1)
            }}
            onClose={() => setActiveActivity(null)}
          />
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-600">Match each English word with its Lao meaning.</p>
              <span className="whitespace-nowrap text-xs font-black text-emerald-700">{matchedWords.length}/{dailyWordPairs.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {shuffledWords.map(card => {
                const selected = wordSelection?.id === card.id && wordSelection.side === card.side
                const matched = matchedWords.includes(card.id)
                const wrong = wrongWord === `${card.id}-${card.side}`
                return (
                  <button
                    key={`${card.id}-${card.side}`}
                    type="button"
                    disabled={matched || saving}
                    onClick={() => void selectWord(card.id, card.side)}
                    className={cn(
                      'min-h-16 rounded-2xl border px-3 py-3 text-sm font-black transition',
                      matched && 'border-emerald-200 bg-emerald-50 text-emerald-700 opacity-60',
                      selected && !matched && 'border-primary-500 bg-primary-50 text-primary-950 ring-2 ring-primary-100',
                      !selected && !matched && 'border-slate-200 bg-white text-slate-700 hover:border-primary-300',
                      wrong && 'border-red-300 bg-red-50 text-red-700',
                    )}
                  >
                    {matched && <CheckCircle2 className="mx-auto mb-1 h-4 w-4" />}
                    {card.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}

function todayInLaosFromIso(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Vientiane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function ActivityTile({
  title,
  description,
  duration,
  stat,
  completed,
  icon,
  accent = 'emerald',
  onClick,
}: {
  title: string
  description: string
  duration: string
  stat: string
  completed: boolean
  icon: React.ReactNode
  accent?: 'emerald' | 'violet'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group min-w-0 rounded-3xl border p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:p-4',
        accent === 'violet'
          ? 'border-violet-200 bg-violet-50/60 focus-visible:ring-violet-500'
          : 'border-emerald-200 bg-emerald-50/60 focus-visible:ring-emerald-500',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn(
          'flex h-10 w-10 items-center justify-center rounded-2xl sm:h-11 sm:w-11',
          accent === 'violet' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700',
        )}>
          {icon}
        </span>
        {completed && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
      </div>
      <h3 className="mt-3 text-sm font-black leading-5 text-primary-950 sm:mt-4 sm:text-base">{title}</h3>
      <p className="mt-1 min-h-[60px] text-[11px] font-semibold leading-[18px] text-slate-500 sm:min-h-10 sm:text-xs sm:leading-5">{description}</p>
      <div className="mt-3 flex flex-col items-start gap-1 text-[10px] font-bold text-slate-500 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:text-[11px]">
        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" /> {duration}</span>
        <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {stat}</span>
      </div>
      <span className={cn(
        'mt-4 flex w-full items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-xs font-black transition',
        accent === 'violet' ? 'border-violet-300 text-violet-700 group-hover:bg-violet-700 group-hover:text-white' : 'border-emerald-300 text-emerald-700 group-hover:bg-emerald-700 group-hover:text-white',
      )}>
        {completed ? 'Play again' : 'Play'} <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </button>
  )
}

function ActivityResult({
  score,
  title,
  detail,
  onReplay,
  onClose,
}: {
  score: string
  title: string
  detail: string
  onReplay: () => void
  onClose: () => void
}) {
  return (
    <div className="py-3 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-2xl font-black text-emerald-700">{score}</span>
      <h3 className="mt-5 text-xl font-black text-primary-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">{detail}</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onReplay} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
          <RotateCcw className="h-4 w-4" /> Play again
        </button>
        <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-950 px-4 py-3 text-sm font-black text-white hover:bg-primary-800">
          Done <CheckCircle2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
