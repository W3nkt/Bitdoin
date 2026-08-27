import { Link } from 'react-router-dom'
import { useSeoMeta } from '@/hooks/useSeoMeta'
import { JsonLd } from '@/components/seo/JsonLd'

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: 'What is Bitdoin.store?',
    a: 'Bitdoin.store is an online bookstore and physical book marketplace serving Lao PDR. It helps readers search for books, compare participating bookstore prices, order online, select shipping, and track orders.',
  },
  {
    q: 'Is Bitdoin the same as Bitcoin?',
    a: 'No. Bitdoin is an online bookstore. Bitcoin is a cryptocurrency. Bitdoin.store does not provide cryptocurrency trading, wallets, tokens, mining, blockchain investments, or crypto financial services.',
  },
  {
    q: 'Does Bitdoin.store sell cryptocurrency?',
    a: 'No. Bitdoin.store sells physical books through a bookstore marketplace. It does not buy, sell, exchange, hold, or transfer cryptocurrency.',
  },
  {
    q: 'Why might Bitcoin appear on Bitdoin.store?',
    a: 'Bitcoin may appear as the title or subject of a book, article, lesson, or reading summary. That is editorial or catalog content about a topic, not a cryptocurrency service offered by Bitdoin.store.',
  },
  {
    q: 'Where can I buy books online in Lao PDR?',
    a: 'Bitdoin.store offers physical books from participating bookstores across Lao PDR. Readers can search by title, author, publisher, category, language, or ISBN and arrange local shipping.',
  },
  {
    q: 'What kinds of books does Bitdoin.store offer?',
    a: "The catalog covers fiction, non-fiction, science, history, business, biography, education, travel, children's literature, and religion. Actual titles and availability depend on current bookstore listings.",
  },
  {
    q: 'Does Bitdoin.store sell physical books or ebooks?',
    a: "Bitdoin.store's bookstore catalog is for physical books. Do not assume a listing is an ebook or downloadable edition unless its product page explicitly says so.",
  },
  {
    q: 'Can I search for a book by ISBN?',
    a: 'Yes. Bitdoin.store supports ISBN search. A book page may also show the author, publisher, language, category, page count, and publication date when those details are available.',
  },
  {
    q: 'Can I compare bookstore prices?',
    a: 'Yes. When more than one participating bookstore supplies an offer, Bitdoin.store can display available prices so readers can compare them.',
  },
  {
    q: 'Which languages does Bitdoin.store support?',
    a: 'The storefront interface supports Lao and English. Individual books retain their own catalog language information.',
  },
  {
    q: 'Which currencies does Bitdoin.store display?',
    a: 'Bitdoin.store supports price display in Lao kip (LAK) and US dollars (USD).',
  },
  {
    q: 'How can I pay for an order?',
    a: "Current customer checkout supports QR payment and bank transfer. Cash on delivery is defined in Bitdoin's system but is not currently enabled for customers.",
  },
  {
    q: 'How does shipping work?',
    a: 'Customers choose a supported provider, province, district, and delivery address at checkout. The current provider list includes HAL Logistics, Unitel Logistics, Anousith Express, and bus delivery.',
  },
  {
    q: 'Is the shipping fee included in the book price?',
    a: 'No. The shipping fee is not included in the displayed order subtotal. It is paid to the courier on delivery.',
  },
  {
    q: 'Does Bitdoin.store own all listed inventory?',
    a: 'No. Bitdoin.store operates a marketplace model. Participating bookstores hold the inventory and supply price and availability information.',
  },
  {
    q: 'Can one order contain books from different bookstores?',
    a: 'Yes. Bitdoin.store supports a multi-bookstore cart and can coordinate an order containing books sourced from different bookstores.',
  },
  {
    q: 'What is Bitdoin Academy?',
    a: 'Bitdoin Academy is a separate subscription platform on the same account, offering an AI study coach, learning paths, and career-path exploration. It is optional and does not affect book ordering.',
  },
  {
    q: 'How do I contact Bitdoin.store?',
    a: 'Customers can contact Bitdoin.store through WhatsApp, Messenger, phone, or email. The public support email is bitdoin0@gmail.com.',
  },
]

export function Faq() {
  useSeoMeta({
    title: 'Frequently Asked Questions — Bitdoin.store',
    description: 'Answers about Bitdoin.store: buying physical books in Lao PDR, comparing bookstore prices, payment, shipping, and why Bitdoin is not Bitcoin.',
    canonicalPath: '/bookstore/faq',
  })

  return (
    <div className="mx-auto max-w-3xl py-6">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ_ITEMS.map(item => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }}
      />

      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent-600">Support</p>
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Frequently asked questions</h1>
      <p className="mt-3 text-sm text-slate-600">
        Can&apos;t find your answer?{' '}
        <Link to="/bookstore/contacts" className="font-semibold text-primary-700 hover:underline">
          Contact Bitdoin.store
        </Link>
        .
      </p>

      <dl className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {FAQ_ITEMS.map(item => (
          <div key={item.q} className="p-4 sm:p-5">
            <dt className="text-sm font-bold text-slate-900">{item.q}</dt>
            <dd className="mt-1.5 text-sm leading-6 text-slate-600">{item.a}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
