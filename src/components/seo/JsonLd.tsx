interface JsonLdProps {
  data: Record<string, unknown>
}

/** Renders a JSON-LD <script> tag. `<` is escaped so JSON content can never break out of the script tag. */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
