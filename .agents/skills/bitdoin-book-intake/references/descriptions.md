# Book descriptions

Prefer authoritative, book-specific product content instead of inventing a short synopsis.

## Source priority

1. The publisher's `รายละเอียด` or product-description section.
2. A reputable bookseller's `รายละเอียด` section for the exact ISBN.
3. Library catalog summary.
4. A concise factual summary only when no detailed source exists.

When the selected page includes `รายละเอียด`, retain the useful editorial content beneath it. Include meaningful subsections such as `คำนำ` and `สารบัญ` when available. Exclude price, stock, delivery, checkout controls, reviews, related products, site navigation, and promotional boilerplate unrelated to the book.

## Database format

Store safe HTML compatible with the Book Intake editor:

- Headings: `<h2>` and `<h3>`
- Paragraphs: `<p>`
- Emphasis: `<strong>` and `<em>`
- Lists: `<ul>`, `<ol>`, and `<li>`
- Line breaks: `<br>`

Do not store Markdown headings, escaped line-continuation slashes, scripts, styles, links, images, classes, or inline attributes. Preserve the source language and section order. Normalize spacing and obvious extraction artifacts without rewriting the source's meaning. If the user supplies the desired description, treat that text as authoritative and convert it to safe HTML.
