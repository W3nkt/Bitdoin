---
name: bitdoin-book-intake
description: Research books and exact-edition cover images from a title, ISBN, or attached cover, generate reviewable PostgreSQL for the Bitdoin intake list, and execute it when explicitly authorized. Use only inside the Bitdoin repository for bookstore price-collection intake; do not use for ordinary catalog editing or runtime features.
---

# Bitdoin Book Intake

Turn a book title, ISBN, or cover image into verified inactive `public.books` rows ready for bookstore price collection. This is a local Codex workflow; never add an AI API or agent feature to the application.

## Inputs

Accept a title with optional author/language/edition, an ISBN, or an attached/local cover image. For an image, inspect it directly and extract visible title, subtitle, author, publisher mark, language, and ISBN/barcode.

If multiple editions remain plausible and the choice changes ISBN, publisher, pages, or publication date, present the candidates and ask the user to choose before producing executable SQL.

## Workflow

1. Read [references/database.md](references/database.md) before generating or executing SQL.
2. Inspect `supabase/migrations/001_initial_schema.sql` and later migrations if the schema may have changed.
3. Resolve the edition:
   - Normalize and validate any ISBN checksum.
   - Search the web when factual metadata is not supplied. Prefer publisher pages, library catalogs, Google Books, Open Library, or reputable booksellers.
   - Cross-check edition-specific facts. Never fill ISBN, pages, publisher, publication date, or cover URL from memory alone.
   - Preserve the printed title and language. Do not silently translate it. Use `null` for unverified facts.
   - Resolve the cover using [references/covers.md](references/covers.md). A completed intake should normally include a verified exact-edition cover; disclose why when none is safe to use.
   - Build the description using [references/descriptions.md](references/descriptions.md). Prefer the source's `รายละเอียด` section and its useful subsections over a short generated summary.
4. Inspect current category rows before choosing `category_id`. Use a read-only database query when connected; otherwise inspect seeds/migrations and label it unresolved. Never invent a category UUID.
5. Check duplicates by normalized ISBN first, then case-insensitive title plus author. Never overwrite a row unless explicitly requested after showing the current row and proposed changes.
6. Generate SQL at `supabase/book-intake/generated/YYYYMMDD-HHMM-<slug>.sql`. Use UTF-8, a transaction, explicit columns, escaped literals, `is_active = false`, and a verification query. For ISBN-backed inserts use `ON CONFLICT (isbn) DO NOTHING`.
7. Run `scripts/validate-book-sql.ps1` against the file and fix every failure.
8. Show the resolved fields, evidence links, uncertainties, duplicate result, target database, and SQL path.
9. Treat execution as a separate mutation step. Generation does not authorize execution. Execute only when the user explicitly says to execute/apply/run the prepared SQL. Identify local versus remote; never infer production from project configuration. Use an existing authenticated connection and never expose secrets. If none exists, stop after generation and explain the missing setup.
10. Verify the inserted row by ISBN or ID. Never publish it; `is_active` remains false for `/admin/book-intake` and bookstore pricing.

## Safety

- Do not generate destructive statements, schema changes, price rows, or bookstore submissions.
- Do not place service-role keys in SQL or committed files.
- Cover download, storage upload, and database update are mutations. Perform them only within an explicitly authorized execution step and verify the resulting public URL.
- For a batch, use one transaction only when every edition is resolved.
- If the database target or edition is uncertain, pause before execution, not before safe research and draft generation.

## Output

Keep the handoff compact: resolved edition, missing/uncertain fields, sources, SQL path, validation status, and execution/verification result. State clearly whether the database changed.
