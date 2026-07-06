import { forwardRef } from 'react'
import { Scissors } from 'lucide-react'
import type { Order, OrderItem } from '@/types'
import { LAOS_ADMIN_DIVISIONS } from '@/data/laosAdministrativeDivisions'
import { publicAsset } from '@/lib/assets'

interface BookstoreOrderReceiptProps {
  order: Order
  items: OrderItem[]
}

const logisticsNames: Record<string, string> = {
  'HAL Logistics': 'ຮຸ່ງອາລຸນ ຂົນສົ່ງດ່ວນ',
  'Unitel Logistics': 'ຢູນີເທວ ຂົນສົ່ງດ່ວນ',
  'Anousith Express': 'ອານຸສິດ ຂົນສົ່ງດ່ວນ',
  Bus: 'ຝາກລົດເມ',
}

const addressLabels: Record<string, string> = {
  'Logistics Company': 'logistics',
  'ບໍລິສັດຂົນສົ່ງ': 'logistics',
  Province: 'province',
  ແຂວງ: 'province',
  District: 'district',
  ເມືອງ: 'district',
  'Delivery Address': 'address',
  'ທີ່ຢູ່ຈັດສົ່ງ': 'address',
}

function laoProvinceName(value: string) {
  const province = LAOS_ADMIN_DIVISIONS.find(entry =>
    entry.name_en.toLocaleLowerCase() === value.toLocaleLowerCase()
    || entry.name_lo === value
  )
  return province?.name_lo ?? value
}

function laoDistrictName(value: string) {
  const district = LAOS_ADMIN_DIVISIONS
    .flatMap(province => province.districts)
    .find(entry =>
      entry.name_en.toLocaleLowerCase() === value.toLocaleLowerCase()
      || entry.name_lo === value
    )
  return district?.name_lo ?? value
}

function parseDeliveryAddress(rawAddress: string) {
  const labelPattern = Object.keys(addressLabels)
    .sort((a, b) => b.length - a.length)
    .map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const normalized = rawAddress.replace(
    new RegExp(`\\s*(${labelPattern})\\s*:`, 'g'),
    '\n$1:',
  )
  const fields: Record<string, string> = {}

  normalized.split('\n').forEach(line => {
    const separator = line.indexOf(':')
    if (separator < 0) return
    const label = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    const key = addressLabels[label]
    if (key && value) fields[key] = value
  })

  return {
    logistics: logisticsNames[fields.logistics] ?? fields.logistics ?? '',
    province: fields.province ? laoProvinceName(fields.province) : '',
    district: fields.district ? laoDistrictName(fields.district) : '',
    address: fields.address || rawAddress,
  }
}

export const BookstoreOrderReceipt = forwardRef<HTMLDivElement, BookstoreOrderReceiptProps>(
  ({ order, items }, ref) => {
    const delivery = parseDeliveryAddress(order.delivery_address)
    const firstItem = items[0]
    const bookstoreTotal = items.reduce(
      (sum, item) => sum + Number(item.bookstore_price) * item.quantity,
      0,
    )

    if (!firstItem) return null

    return (
      <div
        ref={ref}
        className="w-[720px] bg-white text-gray-900"
        style={{ fontFamily: '"Noto Sans Lao", "Noto Sans Thai", Inter, sans-serif' }}
      >
        <div className="flex items-center justify-between border-b-4 border-[#f59e0b] px-8 py-6">
          <div className="flex h-24 w-72 items-center">
            <img
              src={publicAsset('icons/Bitdoin-Logo.png')}
              alt="Bitdoin"
              className="h-auto w-full object-contain object-left"
              crossOrigin="anonymous"
            />
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-500">ໃບສັ່ງປຶ້ມສຳລັບຮ້ານ</p>
            <p className="mt-1 font-mono text-lg font-bold text-primary-800">
              #{order.order_number}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5 px-8 py-6">
          <ReceiptSection title="ຈາກ">
            <p className="text-lg font-bold">Bitdoin</p>
            <p className="mt-1 text-base text-gray-600">020-29862982</p>
            <p className="mt-1 text-base text-gray-600">https://bitdoin.store</p>

            <p className="mt-8 text-lg font-extrabold text-gray-700">ຜູ້ຮັບ</p>
            <p className="mt-3 text-lg font-bold">{order.customer_name}</p>
            <p className="mt-1 text-base text-gray-600">{order.customer_phone}</p>
          </ReceiptSection>

          <ReceiptSection title="ຂໍ້ມູນຈັດສົ່ງ">
            {delivery.logistics && <ReceiptLine label="ບໍລິສັດຂົນສົ່ງ" value={delivery.logistics} />}
            {delivery.province && <ReceiptLine label="ແຂວງ" value={delivery.province} />}
            {delivery.district && <ReceiptLine label="ເມືອງ" value={delivery.district} />}
            <ReceiptLine label="ທີ່ຢູ່ລະອຽດ" value={delivery.address} />
          </ReceiptSection>
        </div>

        {/* Cut line — logistics keeps everything above, store cuts away the price details below */}
        <div className="relative px-8 py-4">
          <div className="border-t-2 border-dashed border-gray-300" />
          <Scissors className="absolute left-8 top-1/2 h-5 w-5 -translate-y-1/2 -rotate-90 bg-white pr-1 text-gray-400" />
        </div>

        <div className="px-8 pb-8">
          <p className="mb-3 text-sm font-bold text-gray-500">ລາຍການປຶ້ມ</p>
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-5 rounded-2xl border border-gray-200 p-5">
                <div className="h-32 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {item.book?.cover_image_url ? (
                    <img
                      src={item.book.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-400">
                      ບໍ່ມີຮູບ
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold">{item.book?.title}</p>
                  <p className="mt-2 text-base text-gray-500">
                    ຮ້ານ: {item.bookstore?.name}
                  </p>
                  <p className="mt-3 text-lg font-bold text-primary-800">
                    ຈຳນວນ: {item.quantity}
                    <span className="ml-3 text-base font-semibold text-gray-500">
                      [ ລາຄາ: {Number(item.bookstore_price).toLocaleString('en-US')} LAK/ຫົວ ]
                    </span>
                  </p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl bg-primary-50 px-5 py-4 text-right">
              <p className="text-sm font-bold text-gray-500">ຍອດລວມທີ່ຕ້ອງຈ່າຍໃຫ້ຮ້ານ</p>
              <p className="mt-1 text-2xl font-extrabold text-primary-800">
                {bookstoreTotal.toLocaleString('en-US')} LAK
              </p>
            </div>
          </div>
        </div>

        {firstItem.bookstore?.bank_qr_code_url && (
          <div className="px-8 pb-8">
            <div className="flex items-center gap-6 rounded-2xl border border-gray-200 p-5">
              <img
                src={firstItem.bookstore.bank_qr_code_url}
                alt="Store bank QR code"
                className="h-44 w-44 flex-shrink-0 rounded-xl border border-gray-100 object-contain"
                crossOrigin="anonymous"
              />
              <div>
                <p className="text-sm font-bold text-gray-500">QR ທະນາຄານຂອງຮ້ານ</p>
                <p className="mt-2 text-lg font-bold text-gray-900">{firstItem.bookstore.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  ສະແກນ QR ເພື່ອຈ່າຍຄ່າປຶ້ມໃຫ້ຮ້ານ
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-primary-50 px-8 py-5 text-center">
          <p className="text-sm text-gray-600">
            ກະລຸນາກວດສອບປຶ້ມ ແລະ ຢືນຢັນສິນຄ້າກັບທາງ Bitdoin
          </p>
        </div>
      </div>
    )
  },
)
BookstoreOrderReceipt.displayName = 'BookstoreOrderReceipt'

function ReceiptSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-5">
      <p className="mb-3 text-lg font-extrabold text-gray-600">{title}</p>
      {children}
    </div>
  )
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <p className="text-xs font-semibold text-gray-400">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-gray-700">{value}</p>
    </div>
  )
}
