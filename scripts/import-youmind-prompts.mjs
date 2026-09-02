import { writeFile } from 'node:fs/promises'

const README_URL = 'https://raw.githubusercontent.com/YouMind-OpenLab/awesome-gpt-image-2/main/README.md'
const SOURCE_URL = 'https://github.com/YouMind-OpenLab/awesome-gpt-image-2'

const response = await fetch(README_URL)
if (!response.ok) throw new Error(`Could not download YouMind catalog: ${response.status}`)
const markdown = await response.text()

const starts = [...markdown.matchAll(/^### No\.\s+\d+:\s+(.+)$/gm)]
const prompts = starts.map((match, index) => {
  const block = markdown.slice(match.index, starts[index + 1]?.index ?? markdown.length)
  const title = match[1].trim()
  const description = block.match(/#### 📖 Description\s+([\s\S]*?)\s+#### 📝 Prompt/)?.[1]
    ?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? ''
  const prompt = block.match(/#### 📝 Prompt\s+```(?:\w+)?\s*([\s\S]*?)```/)?.[1]?.trim() ?? ''
  const preview = block.match(/https:\/\/cms-assets\.youmind\.com\/media\/[A-Za-z0-9_.-]+/)?.[0] ?? null
  const language = block.match(/Language-([A-Za-z-]+)-blue/)?.[1]?.toLowerCase() ?? 'unknown'
  const category = title.includes(' - ') ? title.split(' - ')[0] : 'AI images'
  return { externalId: String(index + 1), title, description, prompt, preview, language, category }
}).filter(item => item.prompt)

// Dollar quoting with a stable delimiter keeps JSON prompts and multilingual text intact.
function q(value) {
  if (value == null) return 'null'
  return `$ym$${value.replaceAll('$ym$', '$ ym $')}$ym$`
}

const rows = prompts.map((item, index) => `(
  null, '2026-01-02', ${q('youmind-' + item.externalId)}, ${q(item.category)},
  ${q(item.title)}, ${q(item.title)}, ${q(item.description)}, ${q(item.description)},
  ${q(item.prompt)}, ${q(item.prompt)}, null, null, ${q(SOURCE_URL)},
  array['image','gpt-image-2',${q(item.category.toLowerCase())}], true, ${1000 + index},
  ${q(item.preview)}, ${q(item.externalId)}, 'YouMind OpenLab', 'CC BY 4.0', ${q(item.language)}
)`).join(',\n')

const migration = `-- Generated from ${README_URL}
-- Source: YouMind OpenLab, CC BY 4.0. Imported records retain attribution and source URL.
insert into public.premium_prompt_library
  (run_id, week_start, slug, category, title_en, title_lo, description_en, description_lo,
   prompt_en, prompt_lo, example_output_en, example_output_lo, source_url, tags, is_evergreen,
   sort_order, preview_url, external_id, source_name, source_license, source_language)
values
${rows}
on conflict (source_name, external_id) where external_id is not null do update set
  category = excluded.category, title_en = excluded.title_en, title_lo = excluded.title_lo,
  description_en = excluded.description_en, description_lo = excluded.description_lo,
  prompt_en = excluded.prompt_en, prompt_lo = excluded.prompt_lo,
  source_url = excluded.source_url, tags = excluded.tags, preview_url = excluded.preview_url,
  source_license = excluded.source_license, source_language = excluded.source_language,
  sort_order = excluded.sort_order;
`

await writeFile(new URL('../supabase/migrations/080_import_youmind_public_catalog.sql', import.meta.url), migration)
console.log(`Generated migration with ${prompts.length} complete prompts.`)
