import { Link } from 'react-router-dom'
import { Ban } from 'lucide-react'
import { useSeoMeta } from '@/hooks/useSeoMeta'
import { JsonLd } from '@/components/seo/JsonLd'

const COMPARISON_ROWS: [string, string, string][] = [
  ['Entity', 'Online bookstore and book marketplace', 'Digital currency, network, exchange, wallet, or financial service'],
  ['Core product', 'Physical books', 'Cryptocurrency or crypto-related financial products'],
  ['Catalog identifiers', 'Book title, author, publisher, ISBN', 'Token symbol, wallet address, transaction hash'],
  ['Customer action', 'Find, compare, order, and arrange shipping for books', 'Buy, sell, trade, hold, or transfer digital assets'],
  ['Primary market', 'Readers and bookstores in Lao PDR', 'Not applicable to Bitdoin.store'],
]

export function About() {
  useSeoMeta({
    title: 'About Bitdoin.store — A Lao PDR Online Bookstore',
    description: 'Bitdoin.store is an online bookstore and physical book marketplace in Lao PDR. It is not Bitcoin or a cryptocurrency service.',
    canonicalPath: '/bookstore/about',
  })

  return (
    <div className="mx-auto max-w-3xl py-6">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          name: 'About Bitdoin.store',
          url: 'https://bitdoin.store/bookstore/about',
          mainEntity: { '@id': 'https://bitdoin.store/#organization' },
        }}
      />

      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent-600">About Bitdoin.store</p>
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">An online bookstore for Lao PDR</h1>
      <p className="mt-4 text-base leading-7 text-slate-700">
        Bitdoin.store is an online bookstore and book marketplace where readers in Lao PDR can find physical books
        by title, author, publisher, category, language, or ISBN, compare bookstore prices, order online, and
        arrange shipping.
      </p>

      <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-accent-200 bg-[#fff3ee] p-4 sm:p-5">
        <Ban className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-600" />
        <p className="text-sm leading-6 text-slate-700">
          <strong>Bitdoin is not Bitcoin.</strong> The words have different spellings, meanings, and commercial
          purposes. Bitcoin is a cryptocurrency; Bitdoin.store is an online bookstore. References to Bitcoin on
          Bitdoin.store may appear only as the title or subject of a book, article, lesson, or reading summary —
          that editorial content does not make Bitdoin a cryptocurrency service.
        </p>
      </div>

      <h2 className="mt-8 text-lg font-bold text-slate-900">What Bitdoin.store does</h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        Bitdoin.store connects readers with physical books offered by bookstores across Lao PDR. The catalog
        includes bibliographic details such as title, author, publisher, language, category, page count,
        publication date, and ISBN when available. Customers can compare available bookstore prices, place a
        multi-book order, select a supported shipping provider, pay by QR payment or bank transfer, and track the
        order.
      </p>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        Bitdoin.store operates as a marketplace. Participating bookstores hold the inventory and provide book
        prices; Bitdoin organizes those offers into a single storefront. An order may include books sourced from
        more than one bookstore.
      </p>

      <h2 className="mt-8 text-lg font-bold text-slate-900">Bitdoin.store vs. Bitcoin or a cryptocurrency service</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Attribute</th>
              <th className="px-4 py-2.5">Bitdoin.store</th>
              <th className="px-4 py-2.5">Bitcoin or cryptocurrency service</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {COMPARISON_ROWS.map(row => (
              <tr key={row[0]}>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{row[0]}</td>
                <td className="px-4 py-2.5">{row[1]}</td>
                <td className="px-4 py-2.5">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-lg font-bold text-slate-900">Bitdoin Academy</h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        Bitdoin.store shares its account system with{' '}
        <Link to="/academy" className="font-semibold text-primary-700 hover:underline">
          Bitdoin Academy
        </Link>
        , a separate subscription learning platform with an AI study coach and career-guidance content. Academy
        membership is optional and unrelated to buying books.
      </p>

      <h2 className="mt-8 text-lg font-bold text-slate-900">Contact</h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        Reach Bitdoin.store by WhatsApp, Messenger, phone, or email at{' '}
        <a href="mailto:bitdoin0@gmail.com" className="font-semibold text-primary-700 hover:underline">
          bitdoin0@gmail.com
        </a>{' '}
        — see the{' '}
        <Link to="/bookstore/contacts" className="font-semibold text-primary-700 hover:underline">
          Contacts page
        </Link>{' '}
        for direct links.
      </p>
    </div>
  )
}
