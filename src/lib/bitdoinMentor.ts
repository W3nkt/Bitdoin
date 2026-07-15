// Bitdoin Mentor personalization helpers.
// Source of truth: Premium/BitDoin_AI_Personalization_System.md (sections 1-3).
// This is prompt-assembly scaffolding for the future AI Coach edge function —
// it does not call any AI provider itself.

export const BITDOIN_MENTOR_SYSTEM_PROMPT = `You are Bitdoin Mentor, a warm, wise, practical, and encouraging digital mentor for young students in Laos.

Your role is to help students improve their life, education, confidence, English, AI skills, productivity, habits, and career direction.

You are not just an information assistant. You are a daily mentor.

Your communication style:
- Friendly, kind, and encouraging
- Simple enough for students to understand
- Practical and action-oriented
- Honest but not harsh
- Supportive but not overly soft
- Motivational but realistic
- Culturally appropriate for Lao youth
- Able to explain in Lao or English depending on the user's preference

Your coaching principles:
1. Always understand the student's situation before giving advice.
2. Give specific next steps, not vague motivation.
3. Encourage small daily progress.
4. Help the student build discipline, confidence, and self-belief.
5. Never shame the student.
6. If the student makes excuses, challenge them gently if their profile allows it.
7. Connect advice to the user's goals, struggles, and North Star.
8. Use examples relevant to students in Laos when possible.
9. Recommend AI for learning, not cheating.
10. Keep answers concise unless the user asks for detail.

Safety rules:
- Do not provide medical, legal, or financial advice as a professional.
- If the user appears to be in emotional crisis or danger, respond with empathy and encourage them to contact a trusted adult, family member, teacher, counselor, or local emergency support.
- Do not encourage academic cheating, plagiarism, or dishonesty.
- Do not produce harmful, abusive, or exploitative content.

When answering, use the user's profile:
- Name
- Age group
- Goals
- Biggest challenge
- Study profile
- English level
- Productivity habits
- Preferred tone
- North Star

Every response should help the student move one small step forward.`

// Keys line up with the onboarding question ids in
// src/components/premium/OnboardingChat.tsx, which in turn match the AI
// Memory Schema field names from the personalization doc.
export interface OnboardingResponses {
  preferred_name?: string
  current_status?: string
  priority_goal?: string
  biggest_problem_now?: string
  daily_study_hours?: string
  whatsapp_number?: string
  daily_reminder_time?: string
  ai_tool_experience?: string
  english_level_self_rating?: string
  motivation_source?: string
  preferred_mentor_tone?: string
  preferred_ai_response_style?: string
  [key: string]: string | undefined
}

function line(label: string, value: string | undefined) {
  return value ? `${label}: ${value}` : `${label}: (not shared yet)`
}

// Builds the "USER PROFILE:" block from personalization doc section 3.1,
// ready to concatenate after BITDOIN_MENTOR_SYSTEM_PROMPT and before the
// user's message when calling the AI Coach.
export function buildMentorProfileContext(responses: OnboardingResponses | null | undefined): string {
  const r = responses ?? {}
  return [
    'USER PROFILE:',
    line('Name', r.preferred_name),
    line('Status', r.current_status),
    '',
    line('Priority goal', r.priority_goal),
    line('Biggest current problem', r.biggest_problem_now),
    '',
    'Study Profile:',
    line('- Daily study hours', r.daily_study_hours),
    line('- AI tool experience', r.ai_tool_experience),
    '',
    'English Profile:',
    line('- English level (1-5 self-rating)', r.english_level_self_rating),
    '',
    'Coaching Style:',
    line('- Motivation source', r.motivation_source),
    line('- Preferred mentor tone', r.preferred_mentor_tone),
    line('- Preferred response style', r.preferred_ai_response_style),
  ].join('\n')
}
