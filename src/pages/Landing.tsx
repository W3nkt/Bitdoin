import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, Check, ChevronRight, Crown, GraduationCap, Globe2 } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { publicAsset } from '@/lib/assets'

export function Landing() {
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-primary-950 via-primary-900 to-primary-950">
      {/* ── Decorative glow ── */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-[100px]" />
      <div className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-amber-400/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-primary-500/10 blur-[100px]" />

      <div className="relative flex min-h-screen flex-col">
        {/* ── Header ── */}
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
          <img
            src={publicAsset('icons/Bitdoin-Logo.png')}
            alt={t('appName')}
            className="h-9 w-24 object-contain object-left brightness-0 invert sm:h-10 sm:w-28"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage(language === 'lo' ? 'en' : 'lo')}
              className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10"
            >
              <Globe2 className="h-3.5 w-3.5" />
              {language === 'lo' ? 'EN' : 'ລາວ'}
            </button>
            <Link
              to="/auth"
              className="rounded-xl border border-white/15 px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10"
            >
              {t('nav.signIn')}
            </Link>
          </div>
        </header>

        {/* ── Hero ── */}
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-5 pb-16 pt-6 sm:px-8">
          <div className="max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-300">
              {t('landing.eyebrow')}
            </span>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">
              {t('landing.title')}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-primary-200 sm:text-base">
              {t('landing.subtitle')}
            </p>
          </div>

          {/* ── Platform cards ── */}
          <div className="mt-12 grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:gap-7">
            {/* Bookstore */}
            <Link
              to="/bookstore/books"
              className="group relative flex flex-col overflow-hidden rounded-[2rem] bg-white p-7 shadow-book transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_-12px_rgba(0,0,0,0.5)] sm:p-8"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-100/60 blur-2xl transition-opacity group-hover:opacity-80" />

              <span className="relative inline-flex w-fit items-center gap-1 rounded-full bg-accent-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-accent-700">
                {t('landing.bookstore.badge')}
              </span>

              <div className="relative mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-md">
                <BookOpen className="h-7 w-7" />
              </div>

              <h2 className="relative mt-5 text-2xl font-extrabold text-slate-900">
                {t('landing.bookstore.title')}
              </h2>
              <p className="relative mt-2 text-sm leading-6 text-slate-600">
                {t('landing.bookstore.description')}
              </p>

              <ul className="relative mt-5 space-y-2.5">
                {(['feature1', 'feature2', 'feature3'] as const).map(key => (
                  <li key={key} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-600">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t(`landing.bookstore.${key}`)}
                  </li>
                ))}
              </ul>

              <div className="relative mt-7 flex items-center justify-between gap-3 rounded-2xl bg-accent-500 px-5 py-3.5 text-sm font-bold text-white transition-colors group-hover:bg-accent-600">
                {t('landing.bookstore.cta')}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            {/* Premium */}
            <Link
              to="/academy"
              className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-amber-300/25 bg-gradient-to-br from-primary-900 to-primary-950 p-7 shadow-book transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_70px_-12px_rgba(0,0,0,0.6)] sm:p-8"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/15 blur-2xl transition-opacity group-hover:opacity-80" />

              <span className="relative inline-flex w-fit items-center gap-1 rounded-full bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-300 ring-1 ring-amber-300/30">
                <Crown className="h-3 w-3" />
                {t('landing.premium.badge')}
              </span>

              <div className="relative mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-primary-950 shadow-md">
                <GraduationCap className="h-7 w-7" />
              </div>

              <h2 className="relative mt-5 text-2xl font-extrabold text-white">
                {t('landing.premium.title')}
              </h2>
              <p className="relative mt-2 text-sm leading-6 text-primary-200">
                {t('landing.premium.description')}
              </p>

              <ul className="relative mt-5 space-y-2.5">
                {(['feature1', 'feature2', 'feature3'] as const).map(key => (
                  <li key={key} className="flex items-center gap-2.5 text-sm text-primary-100">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    {t(`landing.premium.${key}`)}
                  </li>
                ))}
              </ul>

              <div className="relative mt-7 flex items-center justify-between gap-3 rounded-2xl bg-amber-400 px-5 py-3.5 text-sm font-bold text-primary-950 transition-colors group-hover:bg-amber-300">
                {t('landing.premium.cta')}
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </div>

          <p className="mt-10 text-center text-xs text-primary-300">
            {t('landing.footerNote')}
          </p>
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-white/10 py-5 text-center text-[11px] text-primary-400">
          © {new Date().getFullYear()} Bitdoin. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
