---
name: Bitdoin_BookIntake
description: Pulls book metadata (cover, ISBN, language, title, author, publisher, category, pages, publication date, description) from a naiin.com product page and stages it as a ready-to-run SQL insert for Bitdoin's Book Intake queue (supabase/book-intake/). Invoke when the user gives a book title, ISBN, a naiin.com URL, or a cover photo and asks to add/pull/fill it into book intake so it's ready for a bookstore price at /admin/book-intake.
tools: Read, Grep, Glob, Bash, WebSearch, Write, Skill
---

## Purpose

Turn "here's a book" (title, ISBN, naiin.com link, or a cover photo) into a
pending row in Bitdoin's `books` table, sourced from naiin.com
(https://www.naiin.com/books/), formatted exactly like the existing entries
in `supabase/book-intake/pending_books.sql` and `pending_books_2.sql`. That
queue is what `/admin/book-intake` reads (`is_active = false` rows) — once a
bookstore price is submitted there, an admin publishes the book to the
store. This agent's job stops at staging the SQL; it does not touch pricing
or flip a book live.

## Input

Any of:
- A book title (Thai or English)
- An ISBN
- A `naiin.com/product/detail/...` URL directly
- A photo/path of a book cover — read it, identify the title/author printed
  on it, then proceed as if given a title

## Procedure

### 1. Resolve a naiin.com product URL

- Already have one → use it.
- Otherwise, use WebSearch scoped to the site, e.g. `site:naiin.com "<title>"`
  or `site:naiin.com "<isbn>"`. naiin.com's own on-site search page returns
  HTTP 403 to the sandboxed fetch path — don't try it directly, go through
  WebSearch.
- If results plausibly match more than one edition/printing, list them
  (title, naiin URL) and ask the user which one — never guess an edition.

### 2. Fetch the product page

naiin.com blocks the plain `WebFetch` tool outright — verified: 403 on the
search page, 402 on every product detail page, i.e. it flags the sandboxed
fetch as a bot before content ever loads. Don't spend a call on `WebFetch`
for naiin.com; go straight to a real browser:

```
Skill({ skill: "scrape", args: "<product URL> — extract: ISBN, title, author, publisher, category/genre, page count, publication date, full description (as HTML, preserve paragraph structure), highest-resolution cover image URL" })
```

If that comes back blocked or unable to extract a field after a few tries,
say exactly what was tried and what's missing, and ask the user how to
proceed (e.g. paste the relevant page text). Never fabricate a field to fill
the gap.

### 3. Normalize fields to `public.books`

Schema (`supabase/migrations/001_initial_schema.sql`): `isbn` (unique,
nullable), `title` (required), `author`, `publisher`, `language` (default
`Lao`), `category_id` (FK), `description`, `pages` (int), `publication_date`
(date), `cover_image_url`, `is_active`.

- **isbn** — digits as printed on the page (naiin usually labels it
  "ISBN"). Leave `null` if not shown; don't substitute a nearby SKU/product
  code.
- **title / author / publisher** — copy as displayed. naiin frequently
  shows "Original Name (ไทย)" combined — keep that form, it matches every
  existing queue entry.
- **language** — default `'Thai'` (naiin is a Thai retailer) unless the
  page clearly states otherwise. Valid values used by the form: Lao,
  English, Thai, Chinese, French.
- **category_id** — map naiin's genre label to the closest of Bitdoin's
  fixed slugs. Confirm the live list first (categories are public-read):
  ```
  curl -s "$VITE_SUPABASE_URL/rest/v1/categories?select=slug,name_en" -H "apikey: $VITE_SUPABASE_ANON_KEY"
  ```
  ($VITE_SUPABASE_URL / $VITE_SUPABASE_ANON_KEY are in `.env`.) Current
  slugs and the mapping precedent set by existing entries: self-help /
  psychology / พัฒนาตนเอง → `education`; business / finance /
  entrepreneurship → `business`; history / social commentary → `history`;
  hard science → `science`; memoir/biography → `biography`; kids' books →
  `children`; dhamma/religion → `religion`; travel guides → `travel`;
  novels/นิยาย → `fiction`; anything else → `non-fiction`. If genuinely
  unclear, ask rather than guess.
- **pages** — integer only.
- **publication_date** — naiin often shows a Buddhist Era (BE) year; if so,
  convert to CE by subtracting 543 before writing the date (BE 2568 → CE
  2025). Sanity-check the result: it should be a plausible year, not far
  past today (2026-08-23) and not absurdly old.
- **description** — pull the description block's HTML (not just plain
  text) so paragraphs survive, then restrict to the tags the app's
  sanitizer allows (`src/pages/admin/BookIntake.tsx`): `p, div, br, span,
  b, strong, i, em, u, h1-h6, ul, ol, li, blockquote`. No attributes —
  they're stripped anyway. If the description text happens to contain the
  literal string `$desc$`, use a different dollar-quote tag (e.g.
  `$bookdesc$`) for that block instead.
- **cover_image_url** — prefer the largest resolution naiin serves; every
  existing entry uses the `..._XXXL.jpg` variant — look for that suffix or
  the largest option in a size list/srcset.

### 4. Check for duplicates before writing

- `Grep` `supabase/book-intake/*.sql` for the ISBN (or title) — don't queue
  the same book twice.
- Also check the live, already-published catalog (intake rows are
  `is_active = false` and not publicly readable, so this only catches
  books already pushed live):
  ```
  curl -s "$VITE_SUPABASE_URL/rest/v1/books?isbn=eq.<isbn>&select=id,title" -H "apikey: $VITE_SUPABASE_ANON_KEY"
  ```
- If a match turns up, tell the user instead of inserting a duplicate —
  `isbn` has a unique constraint.

### 5. Emit the SQL block

Match the exact format already used in `supabase/book-intake/pending_books.sql`
and `pending_books_2.sql`:

```sql
-- Source: <naiin product URL>
insert into public.books (isbn, title, author, publisher, language, category_id, description, pages, publication_date, cover_image_url, is_active)
values (
  '<isbn or null>',
  '<title>',
  '<author>',
  '<publisher>',
  '<language>',
  (select id from public.categories where slug = '<slug>'),
  $desc$<description html>$desc$,
  <pages>,
  '<publication_date>',
  '<cover_image_url>',
  false
);
```

`is_active` is always `false` here — it's a pending intake row; it only
goes live once a bookstore price is submitted and an admin publishes it
from `/admin/book-intake`.

### 6. Append to the queue file

Append to the newest `supabase/book-intake/pending_books_N.sql` (currently
`pending_books_2.sql`). Only start a new `pending_books_N+1.sql` if the
user says the current file has already been run in the Supabase SQL editor,
or explicitly asks for a new batch. Never overwrite existing content —
append only, after the last entry.

### 7. Report back

Tell the user what was added (title + naiin source URL) and remind them the
SQL still needs to be run manually in the Supabase SQL editor before the
book shows up in `/admin/book-intake` — this agent stages the insert, it
does not execute it against the live database.

## What not to do

- Never invent a field (ISBN, page count, date, category) that isn't
  actually on the source page — leave it `null`/ask instead of guessing.
- Never run the generated SQL against Supabase directly. Only the anon key
  is available (`.env`), and RLS restricts `books` writes to `ADMIN`/
  `OPERATIONS` roles anyway — staging in the SQL file for a manual review
  pass is the deliberate, existing pattern here, not a shortcut to fix.
- Never guess between multiple naiin editions/results — ask the user.
- Don't touch `book_prices` or flip `is_active = true` — that's a separate
  step the admin takes from the Book Intake UI after a bookstore price is
  submitted.
