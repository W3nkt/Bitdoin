import { Link } from 'react-router-dom'
import { Ban } from 'lucide-react'
import { useSeoMeta } from '@/hooks/useSeoMeta'
import { JsonLd } from '@/components/seo/JsonLd'
import { useLanguage } from '@/context/LanguageContext'

const COMPARISON_ROWS_EN: [string, string, string][] = [
  ['Entity', 'Online bookstore and book marketplace', 'Digital currency, network, exchange, wallet, or financial service'],
  ['Core product', 'Physical books', 'Cryptocurrency or crypto-related financial products'],
  ['Catalog identifiers', 'Book title, author, publisher, ISBN', 'Token symbol, wallet address, transaction hash'],
  ['Customer action', 'Find, compare, order, and arrange shipping for books', 'Buy, sell, trade, hold, or transfer digital assets'],
  ['Primary market', 'Readers and bookstores in Lao PDR', 'Not applicable to Bitdoin.store'],
]

const COMPARISON_ROWS_LO: [string, string, string][] = [
  ['ປະເພດທຸລະກິດ', 'ຮ້ານໜັງສືອອນລາຍ ແລະ ຕະຫຼາດໜັງສື', 'ສະກຸນເງິນດິຈິຕອນ, ເຄືອຂ່າຍ, ບ່ອນແລກປ່ຽນ, ກະເປົາເງິນ ຫຼື ບໍລິການການເງິນ'],
  ['ສິນຄ້າຫຼັກ', 'ໜັງສືແບບຮູບເຫຼັ້ມ', 'ສະກຸນເງິນດິຈິຕອນ ຫຼື ຜະລິດຕະພັນການເງິນທີ່ກ່ຽວກັບຄຣິບໂຕ'],
  ['ຕົວລະບຸລາຍການ', 'ຊື່ໜັງສື, ຜູ້ຂຽນ, ສຳນັກພິມ, ISBN', 'ສັນຍາລັກໂທເຄັນ, ທີ່ຢູ່ກະເປົາເງິນ, ລະຫັດທຸລະກຳ'],
  ['ສິ່ງທີ່ລູກຄ້າເຮັດ', 'ຄົ້ນຫາ, ປຽບທຽບ, ສັ່ງຊື້ ແລະ ເລືອກການຈັດສົ່ງໜັງສື', 'ຊື້, ຂາຍ, ແລກປ່ຽນ, ເກັບຮັກສາ ຫຼື ໂອນຊັບສິນດິຈິຕອນ'],
  ['ຕະຫຼາດຫຼັກ', 'ຜູ້ອ່ານ ແລະ ຮ້ານໜັງສືໃນ ສປປ ລາວ', 'ບໍ່ກ່ຽວຂ້ອງກັບ Bitdoin.store'],
]

export function About() {
  const { language } = useLanguage()
  const isLao = language === 'lo'
  const comparisonRows = isLao ? COMPARISON_ROWS_LO : COMPARISON_ROWS_EN

  useSeoMeta({
    title: isLao ? 'ກ່ຽວກັບ Bitdoin.store — ຮ້ານໜັງສືອອນລາຍໃນ ສປປ ລາວ' : 'About Bitdoin.store — A Lao PDR Online Bookstore',
    description: isLao ? 'Bitdoin.store ແມ່ນຮ້ານໜັງສືອອນລາຍ ແລະ ຕະຫຼາດໜັງສືໃນ ສປປ ລາວ. ບໍ່ແມ່ນ Bitcoin ຫຼື ບໍລິການສະກຸນເງິນດິຈິຕອນ.' : 'Bitdoin.store is an online bookstore and physical book marketplace in Lao PDR. It is not Bitcoin or a cryptocurrency service.',
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

      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent-600">{isLao ? 'ກ່ຽວກັບ Bitdoin.store' : 'About Bitdoin.store'}</p>
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{isLao ? 'ຮ້ານໜັງສືອອນລາຍສຳລັບ ສປປ ລາວ' : 'An online bookstore for Lao PDR'}</h1>
      <p className="mt-4 text-base leading-7 text-slate-700">
        {isLao
          ? 'Bitdoin.store ແມ່ນຮ້ານໜັງສືອອນລາຍ ແລະ ຕະຫຼາດໜັງສື ທີ່ຜູ້ອ່ານໃນ ສປປ ລາວ ສາມາດຄົ້ນຫາໜັງສືແບບຮູບເຫຼັ້ມຕາມຊື່, ຜູ້ຂຽນ, ສຳນັກພິມ, ໝວດໝູ່, ພາສາ ຫຼື ISBN, ປຽບທຽບລາຄາ, ສັ່ງຊື້ອອນລາຍ ແລະ ເລືອກການຈັດສົ່ງໄດ້.'
          : 'Bitdoin.store is an online bookstore and book marketplace where readers in Lao PDR can find physical books by title, author, publisher, category, language, or ISBN, compare bookstore prices, order online, and arrange shipping.'}
      </p>

      <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-accent-200 bg-[#fff3ee] p-4 sm:p-5">
        <Ban className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-600" />
        <p className="text-sm leading-6 text-slate-700">
          {isLao ? <><strong>Bitdoin ບໍ່ແມ່ນ Bitcoin.</strong> ສອງຄຳນີ້ຂຽນຕ່າງກັນ, ມີຄວາມໝາຍ ແລະ ຈຸດປະສົງທາງທຸລະກິດຕ່າງກັນ. Bitcoin ແມ່ນສະກຸນເງິນດິຈິຕອນ; Bitdoin.store ແມ່ນຮ້ານໜັງສືອອນລາຍ. ຄຳວ່າ Bitcoin ໃນ Bitdoin.store ອາດປາກົດພຽງເປັນຊື່ ຫຼື ຫົວຂໍ້ຂອງໜັງສື, ບົດຄວາມ, ບົດຮຽນ ຫຼື ບົດສະຫຼຸບການອ່ານ—ເນື້ອຫານັ້ນບໍ່ໄດ້ເຮັດໃຫ້ Bitdoin ເປັນບໍລິການສະກຸນເງິນດິຈິຕອນ.</> : <><strong>Bitdoin is not Bitcoin.</strong> The words have different spellings, meanings, and commercial purposes. Bitcoin is a cryptocurrency; Bitdoin.store is an online bookstore. References to Bitcoin on Bitdoin.store may appear only as the title or subject of a book, article, lesson, or reading summary — that editorial content does not make Bitdoin a cryptocurrency service.</>}
        </p>
      </div>

      <h2 className="mt-8 text-lg font-bold text-slate-900">{isLao ? 'Bitdoin.store ເຮັດຫຍັງ' : 'What Bitdoin.store does'}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        {isLao ? 'Bitdoin.store ເຊື່ອມຕໍ່ຜູ້ອ່ານກັບໜັງສືແບບຮູບເຫຼັ້ມຈາກຮ້ານທົ່ວ ສປປ ລາວ. ລາຍການປະກອບມີຂໍ້ມູນຊື່, ຜູ້ຂຽນ, ສຳນັກພິມ, ພາສາ, ໝວດໝູ່, ຈຳນວນໜ້າ, ວັນພິມ ແລະ ISBN ເມື່ອມີຂໍ້ມູນ. ລູກຄ້າສາມາດປຽບທຽບລາຄາ, ສັ່ງຫຼາຍຫົວ, ເລືອກຜູ້ຈັດສົ່ງ, ຈ່າຍດ້ວຍ QR ຫຼື ໂອນທະນາຄານ ແລະ ຕິດຕາມຄຳສັ່ງຊື້.' : 'Bitdoin.store connects readers with physical books offered by bookstores across Lao PDR. The catalog includes bibliographic details such as title, author, publisher, language, category, page count, publication date, and ISBN when available. Customers can compare available bookstore prices, place a multi-book order, select a supported shipping provider, pay by QR payment or bank transfer, and track the order.'}
      </p>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        {isLao ? 'Bitdoin.store ດຳເນີນງານໃນຮູບແບບຕະຫຼາດ. ຮ້ານໜັງສືທີ່ເຂົ້າຮ່ວມເປັນຜູ້ເກັບສິນຄ້າ ແລະ ກຳນົດລາຄາ; Bitdoin ຈັດລວມຂໍ້ສະເໜີເຫຼົ່ານັ້ນໄວ້ໃນໜ້າຮ້ານດຽວ. ຄຳສັ່ງຊື້ໜຶ່ງອາດມີໜັງສືຈາກຫຼາຍຮ້ານ.' : 'Bitdoin.store operates as a marketplace. Participating bookstores hold the inventory and provide book prices; Bitdoin organizes those offers into a single storefront. An order may include books sourced from more than one bookstore.'}
      </p>

      <h2 className="mt-8 text-lg font-bold text-slate-900">{isLao ? 'Bitdoin.store ທຽບກັບ Bitcoin ຫຼື ບໍລິການສະກຸນເງິນດິຈິຕອນ' : 'Bitdoin.store vs. Bitcoin or a cryptocurrency service'}</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">{isLao ? 'ຄຸນລັກສະນະ' : 'Attribute'}</th>
              <th className="px-4 py-2.5">Bitdoin.store</th>
              <th className="px-4 py-2.5">{isLao ? 'Bitcoin ຫຼື ບໍລິການຄຣິບໂຕ' : 'Bitcoin or cryptocurrency service'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {comparisonRows.map(row => (
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
        {isLao ? 'Bitdoin.store ໃຊ້ລະບົບບັນຊີຮ່ວມກັບ ' : 'Bitdoin.store shares its account system with '}
        <Link to="/academy" className="font-semibold text-primary-700 hover:underline">
          Bitdoin Academy
        </Link>
        {isLao ? ' ເຊິ່ງເປັນແພລດຟອມການຮຽນແບບສະໝັກສະມາຊິກທີ່ແຍກຕ່າງຫາກ ພ້ອມຜູ້ຊ່ວຍຮຽນ AI ແລະ ເນື້ອຫາແນະນຳອາຊີບ. ການສະໝັກ Academy ແມ່ນບໍ່ບັງຄັບ ແລະ ບໍ່ກ່ຽວກັບການຊື້ໜັງສື.' : ', a separate subscription learning platform with an AI study coach and career-guidance content. Academy membership is optional and unrelated to buying books.'}
      </p>

      <h2 className="mt-8 text-lg font-bold text-slate-900">{isLao ? 'ຕິດຕໍ່' : 'Contact'}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-700">
        {isLao ? 'ຕິດຕໍ່ Bitdoin.store ຜ່ານ WhatsApp, Messenger, ໂທລະສັບ ຫຼື ອີເມວທີ່ ' : 'Reach Bitdoin.store by WhatsApp, Messenger, phone, or email at '}
        <a href="mailto:bitdoin0@gmail.com" className="font-semibold text-primary-700 hover:underline">
          bitdoin0@gmail.com
        </a>{' '}
        {isLao ? ' — ເບິ່ງລິ້ງໂດຍກົງໄດ້ທີ່ ' : ' — see the '}
        <Link to="/bookstore/contacts" className="font-semibold text-primary-700 hover:underline">
          {isLao ? 'ໜ້າຕິດຕໍ່' : 'Contacts page'}
        </Link>{' '}
        {isLao ? '.' : ' for direct links.'}
      </p>
    </div>
  )
}
