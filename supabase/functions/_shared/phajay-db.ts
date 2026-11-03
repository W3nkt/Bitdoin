// The database half of the PhaJay flow: each method calls one SQL function from migration 172 with the
// service role. Kept a plain one-to-one mapping so the tests can run it against the real SQL.
import type { FlowDb, PaymentTarget, Resolved, SettleResult, StoredQr } from './phajay-flow.ts'

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{
  data: unknown
  error: { message?: string } | null
}>

export function phajayDb(admin: { rpc: Rpc }): FlowDb {
  async function call<T>(name: string, args: Record<string, unknown>) {
    const { data, error } = await admin.rpc(name, args)
    if (error) throw new Error(`${name} failed: ${error.message ?? 'database error'}`)
    return data as T
  }

  function resolve(target: PaymentTarget) {
    switch (target.kind) {
      case 'shop_order':
        return call<Resolved | null>('phajay_resolve_order', { p_order_number: target.orderNumber, p_customer_phone: target.phone })
      case 'premium':
        return call<Resolved | null>('phajay_resolve_premium', { p_user_id: target.userId })
      case 'career_report':
        return call<Resolved | null>('phajay_resolve_report', { p_user_id: target.userId })
    }
  }

  return {
    resolve,
    latestQr: (kind, subjectId) => call<StoredQr | null>('phajay_latest_transaction', { p_kind: kind, p_subject_id: subjectId }),
    recordQr: ({ kind, subjectId, qr, amount }) =>
      call<boolean>('phajay_record_qr', {
        p_kind: kind,
        p_subject_id: subjectId,
        p_transaction_id: qr.transactionId,
        p_amount: amount,
        p_qr_code: qr.qrCode,
        p_link: qr.link,
      }),
    setStatus: async (transactionId, status) => {
      await call<null>('phajay_set_status', { p_transaction_id: transactionId, p_status: status })
    },
    settle: (transactionId, amount, paidAt) =>
      call<SettleResult>('phajay_settle', { p_transaction_id: transactionId, p_amount: amount, p_paid_at: paidAt }),
  }
}
