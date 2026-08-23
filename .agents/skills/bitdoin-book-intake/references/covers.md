# Book-cover handling

Resolve a cover only after the exact edition is known. ISBN match is strongest; title, language, publisher, and visible design must also agree.

## Source priority

1. Publisher product page or publisher CDN.
2. Reputable bookseller page for the exact ISBN.
3. Library catalog or book metadata provider.
4. The user-provided cover when it is clear and front-facing.

Do not use a cover from a different translation, edition, format, or ISBN. Avoid thumbnails, watermarks, marketplace seller photos, hotlinked search-result thumbnails, and URLs that require cookies or expire.

## Quality checks

- HTTPS and an image content type (`image/jpeg`, `image/png`, or `image/webp`).
- Prefer at least 600 px width and a clean front-cover crop.
- Confirm the title/author/publisher marks visually when possible.
- Check that the URL returns HTTP 200 before writing it to the database.

## External link or storage upload

A stable publisher/bookseller CDN URL may be used directly only when hotlinking is verified with the actual pixels, not merely HTTP status. Prefer Bitdoin storage whenever authenticated storage upload is available:

1. Save the selected original under `supabase/book-intake/covers/<isbn>.<ext>` for a traceable local artifact.
2. Upload to the existing public `books` bucket at `covers/<isbn>.<ext>` with the correct content type. Do not overwrite a different object without explicit authorization.
3. Obtain and verify the public storage URL.
4. Put that URL in the insert SQL, or prepare a cover-only update for an existing row.

Downloading, uploading, and changing the database are part of the execution mutation. Research and URL checks are safe preparation; do not upload or update before execution is authorized.

Open or decode the downloaded image before upload. A successful HTTP response can still contain a placeholder such as “image not available.” Reject placeholders, blank images, unrelated editions, and HTML responses disguised as images.

For a cover-only correction, update only `cover_image_url`, identify the row by normalized ISBN, use a transaction, and verify `id`, `isbn`, `cover_image_url`, and `is_active`. Never change `is_active` during a cover repair.
