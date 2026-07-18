export interface LaoEducationSource {
  title: string
  url: string
  description: string
  keywords: string[]
}

// Trusted Lao PDR education references supplied for the Bitdoin Mentor.
export const LAO_EDUCATION_SOURCES: LaoEducationSource[] = [
  {
    title: 'Department of General Education learning resources',
    url: 'https://dge.moes.edu.la/learning-resources.php',
    description: 'Official Ministry of Education and Sports index for curricula, textbooks, teacher guides, supporting materials, and review lessons.',
    keywords: ['curriculum', 'ministry', 'official', 'review', 'exam', 'ຫຼັກສູດ', 'ກະຊວງ', 'ບົດທວນຄືນ', 'ສອບເສັງ'],
  },
  {
    title: 'Primary teacher guides',
    url: 'https://pubhtml5.com/bookcase/twll/',
    description: 'Collection of Lao primary-school teacher guides linked by the Department of General Education.',
    keywords: ['teacher', 'guide', 'primary', 'lesson plan', 'ຄູ', 'ຄູ່ມື', 'ປະຖົມ', 'ແຜນການສອນ'],
  },
  {
    title: 'Secondary teacher guides',
    url: 'https://pubhtml5.com/bookcase/esgtj/',
    description: 'Collection of Lao secondary-school teacher guides linked by the Department of General Education.',
    keywords: ['teacher', 'guide', 'secondary', 'lesson plan', 'ຄູ', 'ຄູ່ມື', 'ມັດທະຍົມ', 'ແຜນການສອນ'],
  },
  {
    title: 'Khang Panya Lao Learning Passport',
    url: 'https://laos.learningpassport.org/',
    description: 'Lao teaching and learning platform with grade- and subject-level textbooks and learning materials.',
    keywords: ['textbook', 'subject', 'grade', 'learning material', 'math', 'science', 'english', 'lao language', 'ແບບຮຽນ', 'ວິຊາ', 'ຊັ້ນ', 'ຄະນິດສາດ', 'ວິທະຍາສາດ', 'ພາສາອັງກິດ', 'ພາສາລາວ'],
  },
]

const EDUCATION_TERMS = [
  'education', 'school', 'student', 'study', 'learn', 'lesson', 'homework', 'teacher',
  'curriculum', 'textbook', 'subject', 'grade', 'exam', 'math', 'science', 'english',
  'ການສຶກສາ', 'ໂຮງຮຽນ', 'ນັກຮຽນ', 'ຮຽນ', 'ບົດຮຽນ', 'ວຽກບ້ານ', 'ຄູ',
  'ຫຼັກສູດ', 'ແບບຮຽນ', 'ວິຊາ', 'ຊັ້ນ', 'ສອບເສັງ', 'ຄະນິດສາດ',
  'ວິທະຍາສາດ', 'ພາສາອັງກິດ', 'ພາສາລາວ',
]

function includesTerm(value: string, term: string) {
  return value.includes(term.toLocaleLowerCase())
}

function htmlToText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

async function retrieveSource(source: LaoEducationSource) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    const response = await fetch(source.url, {
      headers: { Accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    })
    if (!response.ok) return ''
    return htmlToText(await response.text()).slice(0, 4500)
  } catch {
    return ''
  } finally {
    clearTimeout(timeout)
  }
}

export async function retrieveLaoEducationContext(query: string) {
  const normalized = query.toLocaleLowerCase()
  if (!EDUCATION_TERMS.some(term => includesTerm(normalized, term))) return ''

  const ranked = LAO_EDUCATION_SOURCES
    .map((source, index) => ({
      source,
      score: source.keywords.reduce((total, term) => total + (includesTerm(normalized, term) ? 1 : 0), 0)
        + (index === 0 ? 0.25 : 0)
        + (index === 3 ? 0.2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const retrieved = await Promise.all(ranked.map(async ({ source }) => ({
    source,
    content: await retrieveSource(source),
  })))

  const directory = LAO_EDUCATION_SOURCES
    .map(source => `- ${source.title}: ${source.description} URL: ${source.url}`)
    .join('\n')
  const excerpts = retrieved
    .filter(item => item.content)
    .map(item => `SOURCE: ${item.source.title}\nURL: ${item.source.url}\nRETRIEVED CONTENT:\n${item.content}`)
    .join('\n\n')

  return `TRUSTED LAO EDUCATION SOURCE DIRECTORY\n${directory}\n\n${excerpts || 'Live source content could not be retrieved for this request.'}`
}
