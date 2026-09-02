import { Link } from 'react-router-dom'
import { useSeoMeta } from '@/hooks/useSeoMeta'
import { JsonLd } from '@/components/seo/JsonLd'
import { useLanguage } from '@/context/LanguageContext'

const FAQ_ITEMS_EN: { q: string; a: string }[] = [
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

const FAQ_ITEMS_LO: { q: string; a: string }[] = [
  { q: 'Bitdoin.store ແມ່ນຫຍັງ?', a: 'Bitdoin.store ແມ່ນຮ້ານຂາຍໜັງສືອອນລາຍ ແລະ ຕະຫຼາດໜັງສືແບບຮູບເຫຼັ້ມໃນ ສປປ ລາວ. ຜູ້ອ່ານສາມາດຄົ້ນຫາໜັງສື, ປຽບທຽບລາຄາຈາກຮ້ານທີ່ເຂົ້າຮ່ວມ, ສັ່ງຊື້ອອນລາຍ, ເລືອກການຈັດສົ່ງ ແລະ ຕິດຕາມຄຳສັ່ງຊື້ໄດ້.', },
  { q: 'Bitdoin ແມ່ນອັນດຽວກັນກັບ Bitcoin ບໍ?', a: 'ບໍ່ແມ່ນ. Bitdoin ແມ່ນຮ້ານຂາຍໜັງສືອອນລາຍ, ສ່ວນ Bitcoin ແມ່ນສະກຸນເງິນດິຈິຕອນ. Bitdoin.store ບໍ່ໄດ້ໃຫ້ບໍລິການຊື້ຂາຍຄຣິບໂຕ, ກະເປົາເງິນ, ໂທເຄັນ, ການຂຸດຫຼຽນ, ການລົງທຶນບລັອກເຊນ ຫຼື ບໍລິການການເງິນຄຣິບໂຕ.', },
  { q: 'Bitdoin.store ຂາຍສະກຸນເງິນດິຈິຕອນບໍ?', a: 'ບໍ່ຂາຍ. Bitdoin.store ຂາຍໜັງສືແບບຮູບເຫຼັ້ມຜ່ານຕະຫຼາດຮ້ານໜັງສື ແລະ ບໍ່ໄດ້ຊື້, ຂາຍ, ແລກປ່ຽນ, ເກັບຮັກສາ ຫຼື ໂອນສະກຸນເງິນດິຈິຕອນ.', },
  { q: 'ເປັນຫຍັງຈຶ່ງອາດເຫັນຄຳວ່າ Bitcoin ໃນ Bitdoin.store?', a: 'Bitcoin ອາດປາກົດເປັນຊື່ ຫຼື ຫົວຂໍ້ຂອງໜັງສື, ບົດຄວາມ, ບົດຮຽນ ຫຼື ບົດສະຫຼຸບການອ່ານ. ນັ້ນແມ່ນເນື້ອຫາທາງບັນນາທິການ ຫຼື ຂໍ້ມູນລາຍການໜັງສື, ບໍ່ແມ່ນບໍລິການສະກຸນເງິນດິຈິຕອນຂອງ Bitdoin.store.', },
  { q: 'ຂ້ອຍສາມາດຊື້ໜັງສືອອນລາຍໃນ ສປປ ລາວ ໄດ້ຢູ່ໃສ?', a: 'Bitdoin.store ມີໜັງສືແບບຮູບເຫຼັ້ມຈາກຮ້ານໜັງສືທີ່ເຂົ້າຮ່ວມທົ່ວ ສປປ ລາວ. ຜູ້ອ່ານສາມາດຄົ້ນຫາຕາມຊື່, ຜູ້ຂຽນ, ສຳນັກພິມ, ໝວດໝູ່, ພາສາ ຫຼື ISBN ແລະ ເລືອກການຈັດສົ່ງພາຍໃນປະເທດ.', },
  { q: 'Bitdoin.store ມີໜັງສືປະເພດໃດແດ່?', a: 'ລາຍການໜັງສືຄອບຄຸມນິຍາຍ, ສາລະຄະດີ, ວິທະຍາສາດ, ປະຫວັດສາດ, ທຸລະກິດ, ຊີວະປະຫວັດ, ການສຶກສາ, ການທ່ອງທ່ຽວ, ວັນນະກຳເດັກ ແລະ ສາສະໜາ. ຊື່ເລື່ອງ ແລະ ຈຳນວນສິນຄ້າຂຶ້ນກັບລາຍການປັດຈຸບັນຂອງແຕ່ລະຮ້ານ.', },
  { q: 'Bitdoin.store ຂາຍໜັງສືແບບຮູບເຫຼັ້ມ ຫຼື eBook?', a: 'ລາຍການຂອງຮ້ານໜັງສື Bitdoin.store ແມ່ນໜັງສືແບບຮູບເຫຼັ້ມ. ຢ່າຖືວ່າລາຍການໃດໜຶ່ງເປັນ eBook ຫຼື ສະບັບດາວໂຫຼດ ເວັ້ນແຕ່ໜ້າສິນຄ້າຈະລະບຸໄວ້ຢ່າງຊັດເຈນ.', },
  { q: 'ຂ້ອຍສາມາດຄົ້ນຫາໜັງສືດ້ວຍ ISBN ໄດ້ບໍ?', a: 'ໄດ້. Bitdoin.store ຮອງຮັບການຄົ້ນຫາດ້ວຍ ISBN. ໜ້າໜັງສືອາດສະແດງຜູ້ຂຽນ, ສຳນັກພິມ, ພາສາ, ໝວດໝູ່, ຈຳນວນໜ້າ ແລະ ວັນພິມ ເມື່ອມີຂໍ້ມູນ.', },
  { q: 'ຂ້ອຍສາມາດປຽບທຽບລາຄາຈາກຮ້ານໜັງສືໄດ້ບໍ?', a: 'ໄດ້. ເມື່ອມີຮ້ານໜັງສືທີ່ເຂົ້າຮ່ວມຫຼາຍກວ່າໜຶ່ງຮ້ານສະເໜີໜັງສືຫົວດຽວກັນ, Bitdoin.store ສາມາດສະແດງລາຄາທີ່ມີໃຫ້ປຽບທຽບ.', },
  { q: 'Bitdoin.store ຮອງຮັບພາສາໃດແດ່?', a: 'ໜ້າຮ້ານຮອງຮັບພາສາລາວ ແລະ ພາສາອັງກິດ. ໜັງສືແຕ່ລະຫົວຍັງຄົງສະແດງພາສາຕາມຂໍ້ມູນຂອງໜັງສືນັ້ນ.', },
  { q: 'Bitdoin.store ສະແດງລາຄາເປັນສະກຸນເງິນໃດ?', a: 'Bitdoin.store ຮອງຮັບການສະແດງລາຄາເປັນເງິນກີບລາວ (LAK) ແລະ ໂດລາສະຫະລັດ (USD).', },
  { q: 'ຂ້ອຍສາມາດຊຳລະຄຳສັ່ງຊື້ໄດ້ແນວໃດ?', a: 'ປັດຈຸບັນການຊຳລະເງິນຮອງຮັບການຈ່າຍຜ່ານ QR ແລະ ການໂອນຜ່ານທະນາຄານ. ລະບົບຂອງ Bitdoin ມີຕົວເລືອກເກັບເງິນປາຍທາງ ແຕ່ຍັງບໍ່ເປີດໃຫ້ລູກຄ້າໃຊ້ໃນຂະນະນີ້.', },
  { q: 'ການຈັດສົ່ງເຮັດວຽກແນວໃດ?', a: 'ໃນຂັ້ນຕອນສັ່ງຊື້ ລູກຄ້າເລືອກຜູ້ໃຫ້ບໍລິການ, ແຂວງ, ເມືອງ ແລະ ທີ່ຢູ່ຈັດສົ່ງ. ຜູ້ໃຫ້ບໍລິການປັດຈຸບັນມີ HAL Logistics, Unitel Logistics, Anousith Express ແລະ ຝາກລົດເມ.', },
  { q: 'ຄ່າຈັດສົ່ງລວມຢູ່ໃນລາຄາໜັງສືແລ້ວບໍ?', a: 'ຍັງບໍ່ລວມ. ຄ່າຈັດສົ່ງບໍ່ໄດ້ລວມໃນຍອດລວມຄຳສັ່ງຊື້ທີ່ສະແດງ. ລູກຄ້າຈ່າຍຄ່າສົ່ງໃຫ້ຜູ້ຈັດສົ່ງເມື່ອຮັບສິນຄ້າ.', },
  { q: 'Bitdoin.store ເປັນເຈົ້າຂອງສິນຄ້າທັງໝົດທີ່ລົງຂາຍບໍ?', a: 'ບໍ່ແມ່ນ. Bitdoin.store ດຳເນີນງານໃນຮູບແບບຕະຫຼາດ. ຮ້ານໜັງສືທີ່ເຂົ້າຮ່ວມເປັນຜູ້ເກັບສິນຄ້າ ແລະ ໃຫ້ຂໍ້ມູນລາຄາກັບຈຳນວນສິນຄ້າ.', },
  { q: 'ຄຳສັ່ງຊື້ໜຶ່ງລາຍການສາມາດມີໜັງສືຈາກຫຼາຍຮ້ານໄດ້ບໍ?', a: 'ໄດ້. Bitdoin.store ຮອງຮັບກະຕ່າສິນຄ້າຈາກຫຼາຍຮ້ານ ແລະ ສາມາດປະສານງານຄຳສັ່ງຊື້ທີ່ມີໜັງສືຈາກຮ້ານຕ່າງໆ.', },
  { q: 'Bitdoin Academy ແມ່ນຫຍັງ?', a: 'Bitdoin Academy ແມ່ນແພລດຟອມສະໝັກສະມາຊິກແຍກຕ່າງຫາກໃນບັນຊີດຽວກັນ ໂດຍມີຜູ້ຊ່ວຍຮຽນ AI, ເສັ້ນທາງການຮຽນ ແລະ ການສຳຫຼວດເສັ້ນທາງອາຊີບ. ການສະໝັກແມ່ນບໍ່ບັງຄັບ ແລະ ບໍ່ກະທົບຕໍ່ການສັ່ງໜັງສື.', },
  { q: 'ຂ້ອຍຈະຕິດຕໍ່ Bitdoin.store ໄດ້ແນວໃດ?', a: 'ລູກຄ້າສາມາດຕິດຕໍ່ Bitdoin.store ຜ່ານ WhatsApp, Messenger, ໂທລະສັບ ຫຼື ອີເມວ. ອີເມວຊ່ວຍເຫຼືອແມ່ນ bitdoin0@gmail.com.', },
]

export function Faq() {
  const { language } = useLanguage()
  const isLao = language === 'lo'
  const faqItems = isLao ? FAQ_ITEMS_LO : FAQ_ITEMS_EN

  useSeoMeta({
    title: isLao ? 'ຄຳຖາມທີ່ພົບເລື້ອຍ — Bitdoin.store' : 'Frequently Asked Questions — Bitdoin.store',
    description: isLao ? 'ຄຳຕອບກ່ຽວກັບການຊື້ໜັງສື, ການຊຳລະ ແລະ ການຈັດສົ່ງຂອງ Bitdoin.store.' : 'Answers about Bitdoin.store: buying physical books in Lao PDR, comparing bookstore prices, payment, shipping, and why Bitdoin is not Bitcoin.',
    canonicalPath: '/bookstore/faq',
  })

  return (
    <div className="mx-auto max-w-3xl py-6">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map(item => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }}
      />

      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-accent-600">{isLao ? 'ຊ່ວຍເຫຼືອ' : 'Support'}</p>
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{isLao ? 'ຄຳຖາມທີ່ພົບເລື້ອຍ' : 'Frequently asked questions'}</h1>
      <p className="mt-3 text-sm text-slate-600">
        {isLao ? 'ບໍ່ພົບຄຳຕອບທີ່ຕ້ອງການ? ' : <>Can&apos;t find your answer? </>}
        <Link to="/bookstore/contacts" className="font-semibold text-primary-700 hover:underline">
          {isLao ? 'ຕິດຕໍ່ Bitdoin.store' : 'Contact Bitdoin.store'}
        </Link>
        .
      </p>

      <dl className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {faqItems.map(item => (
          <div key={item.q} className="p-4 sm:p-5">
            <dt className="text-sm font-bold text-slate-900">{item.q}</dt>
            <dd className="mt-1.5 text-sm leading-6 text-slate-600">{item.a}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
