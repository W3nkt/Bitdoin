import { LAOS_ADMIN_DIVISIONS } from '@/data/laosAdministrativeDivisions'
import type { Language } from '@/types'

type DeliveryFieldKey = 'logistics' | 'province' | 'district' | 'address'

const fieldKeys: Record<string, DeliveryFieldKey> = {
  'Logistics Company': 'logistics',
  'ບໍລິສັດຂົນສົ່ງ': 'logistics',
  Province: 'province',
  ແຂວງ: 'province',
  District: 'district',
  ເມືອງ: 'district',
  'Delivery Address': 'address',
  'ທີ່ຢູ່ຈັດສົ່ງ': 'address',
}

const fieldLabels: Record<Language, Record<DeliveryFieldKey, string>> = {
  en: {
    logistics: 'Logistics Company',
    province: 'Province',
    district: 'District',
    address: 'Delivery Address',
  },
  lo: {
    logistics: 'ບໍລິສັດຂົນສົ່ງ',
    province: 'ແຂວງ',
    district: 'ເມືອງ',
    address: 'ທີ່ຢູ່ຈັດສົ່ງ',
  },
}

const logisticsNames: Record<string, { en: string; lo: string }> = {
  'HAL Logistics': {
    en: 'HAL Logistics',
    lo: 'ຮຸ່ງອາລຸນ ຂົນສົ່ງດ່ວນ',
  },
  'Unitel Logistics': {
    en: 'Unitel Logistics',
    lo: 'ຢູນີເທວ ຂົນສົ່ງດ່ວນ',
  },
  'Anousith Express': {
    en: 'Anousith Express',
    lo: 'ອານຸສິດ ຂົນສົ່ງດ່ວນ',
  },
  Bus: {
    en: 'Bus',
    lo: 'ຝາກລົດເມ',
  },
}

export interface LocalizedDeliveryField {
  key: DeliveryFieldKey
  label: string
  value: string
}

export function localizeDeliveryAddress(rawAddress: string, language: Language) {
  const parsed = parseDeliveryAddress(rawAddress)
  const result: LocalizedDeliveryField[] = []

  for (const key of ['logistics', 'province', 'district', 'address'] as const) {
    const value = parsed[key]
    if (!value) continue
    result.push({
      key,
      label: fieldLabels[language][key],
      value: localizeValue(key, value, language),
    })
  }

  return result.length > 0
    ? result
    : [{ key: 'address' as const, label: fieldLabels[language].address, value: rawAddress }]
}

function parseDeliveryAddress(rawAddress: string) {
  const labelPattern = Object.keys(fieldKeys)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')
  const normalized = rawAddress.replace(
    new RegExp(`\\s*(${labelPattern})\\s*:`, 'g'),
    '\n$1:',
  )
  const fields: Partial<Record<DeliveryFieldKey, string>> = {}

  normalized.split('\n').forEach(line => {
    const separator = line.indexOf(':')
    if (separator < 0) return
    const label = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim()
    const key = fieldKeys[label]
    if (key && value) fields[key] = value
  })

  return fields
}

function localizeValue(key: DeliveryFieldKey, value: string, language: Language) {
  if (key === 'logistics') {
    const logistics = Object.values(logisticsNames).find(
      entry => entry.en.toLocaleLowerCase() === value.toLocaleLowerCase() || entry.lo === value,
    )
    return logistics?.[language] ?? value
  }

  if (key === 'province') {
    const province = LAOS_ADMIN_DIVISIONS.find(
      entry => entry.name_en.toLocaleLowerCase() === value.toLocaleLowerCase() || entry.name_lo === value,
    )
    return province ? language === 'lo' ? province.name_lo : province.name_en : value
  }

  if (key === 'district') {
    const district = LAOS_ADMIN_DIVISIONS
      .flatMap(province => province.districts)
      .find(entry =>
        entry.name_en.toLocaleLowerCase() === value.toLocaleLowerCase() || entry.name_lo === value
      )
    return district ? language === 'lo' ? district.name_lo : district.name_en : value
  }

  return value
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
