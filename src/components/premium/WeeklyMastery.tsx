import { useQuery } from '@tanstack/react-query'
import { Check, Target } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Language } from '@/types'

const LAOS_TZ = 'Asia/Vientiane'
const WEEK_LABELS = [
  { en: 'M', lo: 'ຈ' },
  { en: 'T', lo: 'ອ' },
  { en: 'W', lo: 'ພ' },
  { en: 'T', lo: 'ພຫ' },
  { en: 'F', lo: 'ສກ' },
  { en: 'S', lo: 'ສ' },
  { en: 'S', lo: 'ອາ' },
]

export const WEEKLY_ACTIVITY_QUERY_KEY = ['premium', 'weekly-activity'] as const

function laosDate(value: Date | string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: LAOS_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(typeof value === 'string' ? new Date(value) : value)
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Monday-to-Sunday dates of the current week in Laos time. */
function currentLaosWeek() {
  const today = laosDate(new Date())
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7
  const monday = addDays(today, -weekday)
  return { today, days: Array.from({ length: 7 }, (_, index) => addDays(monday, index)) }
}

/**
 * Counts every Academy task finished this week, per Laos day: Play & Learn
 * activities, Learning Hub lessons (a lesson's quiz is saved with it, so it
 * isn't counted again), weekly challenges and habits, AI Coach
 * messages, and Daily Mentor replies (passed in, since the home page already
 * loads that history). Each source is read separately so one failing query
 * doesn't blank the whole tracker.
 */
async function fetchWeeklyTasks(profileId: string, weekStart: string) {
  const since = `${weekStart}T00:00:00+07:00`
  const [activities, lessons, challenges, habits, coach] = await Promise.allSettled([
    supabase.from('premium_learning_activity_attempts').select('activity_date').eq('user_id', profileId).gte('activity_date', weekStart),
    supabase.from('premium_lesson_progress').select('updated_at').eq('user_id', profileId).gte('updated_at', since),
    supabase.from('premium_weekly_challenge_progress').select('updated_at,completed_steps').eq('user_id', profileId).gte('updated_at', since),
    supabase.from('premium_habit_checkins').select('checkin_date').eq('user_id', profileId).gte('checkin_date', weekStart),
    supabase.from('premium_coach_messages').select('created_at').eq('user_id', profileId).eq('role', 'user').gte('created_at', since).limit(1000),
  ])
  const rows = <T,>(result: PromiseSettledResult<{ data: T[] | null; error: unknown }>) => {
    if (result.status === 'rejected' || result.value.error) {
      console.error('Could not load weekly activity', result.status === 'rejected' ? result.reason : result.value.error)
      return [] as T[]
    }
    return result.value.data ?? []
  }

  const days: string[] = [
    ...rows<{ activity_date: string }>(activities).map(row => row.activity_date),
    ...rows<{ updated_at: string }>(lessons).map(row => laosDate(row.updated_at)),
    ...rows<{ updated_at: string; completed_steps: number[] | null }>(challenges)
      .filter(row => (row.completed_steps ?? []).length > 0)
      .map(row => laosDate(row.updated_at)),
    ...rows<{ checkin_date: string }>(habits).map(row => row.checkin_date),
    ...rows<{ created_at: string }>(coach).map(row => laosDate(row.created_at)),
  ]
  return days
}

export function WeeklyMastery({
  profileId,
  language,
  mentorTaskDays,
}: {
  profileId: string
  language: Language
  /** One entry per Daily Mentor reply, as its Laos publish date. */
  mentorTaskDays: string[]
}) {
  const { today, days: weekDays } = currentLaosWeek()
  const { data: taskDays = [] } = useQuery({
    queryKey: [...WEEKLY_ACTIVITY_QUERY_KEY, profileId, weekDays[0]],
    queryFn: () => fetchWeeklyTasks(profileId, weekDays[0]),
    retry: 1,
  })

  const tasksByDay = new Map<string, number>()
  for (const day of [...taskDays, ...mentorTaskDays]) {
    if (day >= weekDays[0] && day <= weekDays[6]) tasksByDay.set(day, (tasksByDay.get(day) ?? 0) + 1)
  }
  const activeDays = tasksByDay.size
  const totalTasks = [...tasksByDay.values()].reduce((sum, count) => sum + count, 0)
  const lo = language === 'lo'

  return (
    <div data-no-premium-translate className="flex flex-col gap-3 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10 sm:flex-row sm:items-center sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
          <Target className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-white">{lo ? 'ຄວາມຊຳນານປະຈຳອາທິດ' : 'Weekly mastery'}</p>
          <p className="mt-0.5 text-xs font-bold text-emerald-300">
            {lo ? `${activeDays} ໃນ 7 ມື້` : `${activeDays} of 7 days`}
            <span className="font-semibold text-primary-200">
              {' · '}{lo ? `${totalTasks} ໜ້າວຽກ` : `${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'}`}
            </span>
          </p>
        </div>
      </div>
      <div className="flex justify-between gap-1.5 sm:justify-end" aria-label={lo ? `ເຄື່ອນໄຫວ ${activeDays} ມື້ໃນອາທິດນີ້` : `${activeDays} active days this week`}>
        {weekDays.map((day, index) => {
          const count = tasksByDay.get(day) ?? 0
          const isToday = day === today
          const isFuture = day > today
          return (
            <span
              key={day}
              title={lo ? `${count} ໜ້າວຽກ` : `${count} ${count === 1 ? 'task' : 'tasks'}`}
              className="flex flex-col items-center gap-1"
            >
              <span className={cn('text-[10px] font-black', isToday ? 'text-amber-300' : 'text-primary-200')}>
                {lo ? WEEK_LABELS[index].lo : WEEK_LABELS[index].en}
              </span>
              <span className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border',
                count > 0
                  ? 'border-emerald-400 bg-emerald-500 text-white'
                  : isToday
                    ? 'border-amber-300 border-dashed'
                    : 'border-white/25',
                isFuture && 'opacity-40',
              )}>
                {count > 0 && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
