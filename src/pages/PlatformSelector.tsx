import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, BarChart3, ChevronLeft, ChevronRight, Compass, GraduationCap, Languages, Lightbulb, Moon, Sparkles, Sun, UserRound } from 'lucide-react'
import { OpenBook } from '@/components/ui/OpenBook'
import { Link, useNavigate } from 'react-router-dom'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/lib/theme'
import { publicAsset } from '@/lib/assets'
import { flyToPage } from '@/lib/pageTransition'
import { landingCopy } from '@/components/landing/landingCopy'
import './platform-selector.css'

// The middle entry is the book shown in front when the page loads (activeBook starts at 1).
const bookImages = ['book-bitcoin.webp', 'book-richdad.webp', 'book-pm.webp']
const featureIcons = [OpenBook, Lightbulb, Compass]
const stepIcons = [OpenBook, Sparkles, BarChart3]

// The page each platform link opens, loaded on hover / touch / focus so it is usually ready by the time of the click.
const pageImports: Record<string, () => Promise<unknown>> = {
  '/bookstore': () => import('@/pages/customer/Home'),
  '/admin': () => import('@/pages/admin/Dashboard'),
  '/academy': () => import('@/pages/academy/AcademyLanding'),
  '/academy-admin': () => import('@/pages/premium/AdminDashboard'),
}
const pageLoads = new Map<string, Promise<unknown>>()
function preloadPage(to: string) {
  if (!pageLoads.has(to)) pageLoads.set(to, pageImports[to]?.() ?? Promise.resolve())
  return pageLoads.get(to)!
}

function PlatformLink({ platform, to, children, className }: { platform: 'bookstore' | 'academy'; to: string; children: ReactNode; className?: string }) {
  const navigate = useNavigate()
  const preload = () => { void preloadPage(to) }
  return <Link to={to} className={className} onPointerEnter={preload} onTouchStart={preload} onFocus={preload}
    onClick={event => {
      localStorage.setItem('bitdoin_last_platform', platform)
      // New-tab and modified clicks keep the browser's normal behaviour.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      // Into the bookstore: fade. To the academy: the button bursts into confetti, then the pages fade.
      void flyToPage({
        flight: platform === 'bookstore' ? 'fade' : 'celebrate',
        from: event.currentTarget,
        navigate: () => navigate(to),
        leftPage: () => !document.querySelector('.living-library'),
        ready: preloadPage(to),
      })
    }}>{children}</Link>
}

export function PlatformSelector() {
  const { profile } = useAuth()
  const { language, setLanguage } = useLanguage()
  const dark = useTheme(state => state.theme) === 'dark'
  const toggleTheme = useTheme(state => state.toggleTheme)
  const t = landingCopy[language]
  const isAdmin = profile?.role !== undefined && profile.role !== 'CUSTOMER'
  const [activeBook, setActiveBook] = useState(1)
  const [scrolled, setScrolled] = useState(false)
  const touchStart = useRef<number | null>(null)
  // Set when the theme is toggled on this page, to play the sunrise / sunset once. The id restarts the animation on quick re-toggles.
  const [skyChange, setSkyChange] = useState<{ rise: boolean; id: number } | null>(null)
  const lastDark = useRef(dark)
  const bookstorePath = isAdmin ? '/admin' : '/bookstore'
  const academyPath = isAdmin ? '/academy-admin' : '/academy'

  // The header floats over the page; once the page scrolls it gets a frosted background so it stays readable.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (lastDark.current === dark) return
    lastDark.current = dark
    setSkyChange(change => ({ rise: !dark, id: (change?.id ?? 0) + 1 }))
  }, [dark])

  function moveBook(direction: number) {
    setActiveBook(current => (current + direction + bookImages.length) % bookImages.length)
  }

  return (
    <div className="living-library" lang={language}>
      <a className="library-skip" href="#library-main">{t.skip}</a>
      <div className="library-topbar" data-scrolled={scrolled}>
        <header className="library-header library-container">
          <Link to="/" className="library-brand" aria-label="Bitdoin">
            <span className="library-logo"><img src={publicAsset('icons/Bitdoin-Mark.png')} alt="" width="64" height="64" /></span>
            <span><strong>Bitdoin</strong><small>{t.tagline}</small></span>
          </Link>
          <nav className="library-nav" aria-label={t.navigation}>
            <a href="#bookstore">{t.bookstore}</a><a href="#academy">{t.academy}</a>
          </nav>
          <div className="library-account">
            <button type="button" onClick={toggleTheme} className="library-theme" aria-label={dark ? (language === 'lo' ? 'ປ່ຽນເປັນໂໝດສະຫວ່າງ' : 'Switch to light mode') : (language === 'lo' ? 'ປ່ຽນເປັນໂໝດມືດ' : 'Switch to dark mode')}>
              {dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
            </button>
            <button type="button" onClick={() => setLanguage(language === 'en' ? 'lo' : 'en')} aria-label={t.changeLanguage} className="library-language">
              <Languages size={17} aria-hidden="true" /><span>{language === 'en' ? 'EN' : 'ລາວ'}</span><span className="language-divider" aria-hidden="true">/</span><span>{language === 'en' ? 'ລາວ' : 'EN'}</span>
            </button>
            <Link to={profile ? (isAdmin ? '/admin' : '/bookstore/profile') : '/auth'} className={profile ? 'library-signin library-signin-account' : 'library-signin'}>
              <UserRound size={15} aria-hidden="true" /><span>{profile ? t.account : t.signIn}</span>
            </Link>
          </div>
        </header>
      </div>
      <div className="library-hero">
        {/* Light mode shows the room by day, dark mode the same room at night. Both photos stay mounted (the hidden one
            loads at low priority) so the day photo can fade over the night one while the sun rises or sets. */}
        <div className="library-backdrop" data-sky={dark ? 'night' : 'day'} aria-hidden="true">
          {(['night', 'day'] as const).map(time => {
            const file = `images/landing/library-room${time === 'day' ? '-day' : ''}`
            return <picture key={time} className={`library-backdrop-${time}`}>
              <source media="(max-width: 767px)" srcSet={publicAsset(`${file}-mobile.webp`)} />
              <img src={publicAsset(`${file}.webp`)} alt="" fetchPriority={(time === 'night') === dark ? 'high' : 'low'} />
            </picture>
          })}
          {skyChange && <div key={skyChange.id} className={`library-sky-change library-sky-${skyChange.rise ? 'rise' : 'set'}`}
            onAnimationEnd={event => { if (event.animationName.startsWith('library-sky-tint')) setSkyChange(null) }}>
            {/* Drawn in the photo's own pixels (1920×1000) and cropped like object-fit: cover, so the sun lines up with the
                window. The clip is the sky in the main window pane above the mountain ridge: the ridge, the window frame
                and the ceiling beam hide the sun as it rises past the top edge or sinks behind the peak. */}
            <svg viewBox="0 0 1920 1000" preserveAspectRatio="xMidYMid slice">
              <defs>
                <clipPath id="library-sky-clip"><path d="M160 -10H780L918 32V370L902 372 883 365 864 358 845 355 826 343 816 336 801 332 787 336 768 334 749 335 730 340 710 337 701 333 691 333 672 338 653 345 634 353 614 360 595 370 576 380 557 384 538 390 518 395 480 393 384 395 288 400 192 405 160 405Z" /></clipPath>
                <radialGradient id="library-sun-glow">
                  <stop offset="0" stopColor="#fffef5" /><stop offset=".19" stopColor="#fff4c8" /><stop offset=".23" stopColor="#ffd98a" />
                  <stop offset=".25" stopColor="#ffc46b" stopOpacity=".6" /><stop offset=".45" stopColor="#ff9e50" stopOpacity=".24" /><stop offset="1" stopColor="#ff8a40" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g clipPath="url(#library-sky-clip)"><circle className="library-sun" cx="758" cy="374" r="150" fill="url(#library-sun-glow)" /></g>
            </svg>
          </div>}
        </div>
        <div className="library-shade" aria-hidden="true" />
        <div className="library-header-spacer" aria-hidden="true" />
        <section id="library-main" tabIndex={-1} className="library-hero-content library-container" aria-labelledby="library-title">
          <div className="library-intro">
            <p className="library-eyebrow">{t.eyebrow}</p>
            <h1 id="library-title">{t.title}<br /><span>{t.titleSecond}</span></h1>
            <p className="library-subtitle">{t.subtitle}</p>
            <div className="library-actions">
              <PlatformLink platform="bookstore" to={bookstorePath} className="library-button library-button-orange"><span className="library-button-label"><OpenBook size={19} aria-hidden="true" />{t.browse}</span><ArrowRight size={19} aria-hidden="true" /></PlatformLink>
              <PlatformLink platform="academy" to={academyPath} className="library-button library-button-outline"><span className="library-button-label"><GraduationCap size={19} aria-hidden="true" />{t.explore}</span><ArrowRight size={19} aria-hidden="true" /></PlatformLink>
            </div>
            <a href="#bookstore" className="library-discover"><OpenBook size={15} strokeWidth={1.5} aria-hidden="true" />{t.discover}</a>
          </div>
          <section className="library-showcase" aria-roledescription="carousel" aria-label={t.shelfLabel}
            onKeyDown={event => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                event.preventDefault()
                moveBook(event.key === 'ArrowRight' ? 1 : -1)
              }
            }}
            onTouchStart={event => { touchStart.current = event.touches[0].clientX }}
            onTouchEnd={event => {
              if (touchStart.current === null) return
              const distance = event.changedTouches[0].clientX - touchStart.current
              if (Math.abs(distance) > 45) moveBook(distance < 0 ? 1 : -1)
              touchStart.current = null
            }}
            onTouchCancel={() => { touchStart.current = null }}
          >
            <div className="library-books">
              {bookImages.map((file, index) => {
                const position = (index - activeBook + 3) % 3
                return <button key={file} type="button"
                  className={`library-book library-book-${position === 0 ? 'center' : position === 1 ? 'right' : 'left'}`}
                  onClick={() => setActiveBook(index)} aria-label={`${t.selectIdea}: ${t.ideas[index].title}`} aria-pressed={index === activeBook}
                ><img src={publicAsset(`images/landing/${file}`)} alt="" width="600" height="900" draggable="false" /></button>
              })}
              <button type="button" className="library-carousel-arrow library-carousel-prev" onClick={() => moveBook(-1)} aria-label={t.previous}><ChevronLeft size={25} aria-hidden="true" /></button>
              <button type="button" className="library-carousel-arrow library-carousel-next" onClick={() => moveBook(1)} aria-label={t.next}><ChevronRight size={25} aria-hidden="true" /></button>
            </div>
            <div className="library-shelf-controls">
              <div className="library-dots" aria-label={t.chooseIdea}>
                {t.ideas.map((idea, index) => <button key={idea.title} type="button" onClick={() => setActiveBook(index)} aria-label={`${t.selectIdea}: ${idea.title}`} aria-pressed={activeBook === index}><span /></button>)}
              </div>
              <div className="library-shelf-caption" aria-live="polite" aria-atomic="true"><p>{t.ideas[activeBook].title}<span aria-hidden="true"> · </span><span>{t.ideas[activeBook].description}</span></p></div>
              <span className="library-shelf-note">{t.shelfNote}</span>
            </div>
          </section>
        </section>
      </div>
      <main>
        <section className="library-benefits" aria-label={t.whyBitdoin}>
          <div className="library-container library-benefits-grid">
            {t.benefits.map((benefit, index) => {
              const Icon = featureIcons[index]
              return <div className="library-benefit" key={benefit.title}><Icon size={36} strokeWidth={1.4} aria-hidden="true" /><div><h2>{benefit.title}</h2><p>{benefit.description}</p></div></div>
            })}
          </div>
        </section>
        <section className="library-destinations" aria-label={t.platforms}>
          <div className="library-container library-destinations-grid">
            <section id="bookstore" className="library-bookstore" aria-labelledby="bookstore-title">
              <p className="library-eyebrow">{t.bookstoreEyebrow}</p>
              <h2 id="bookstore-title">{t.bookstoreTitle}</h2>
              <p className="library-section-description">{t.bookstoreDescription}</p>
              <div className="library-small-shelf" aria-hidden="true"><img src={publicAsset('images/landing/bookstore-shelf-covers.webp')} alt="" width="1100" height="596" loading="lazy" /></div>
              <PlatformLink platform="bookstore" to={bookstorePath} className="library-text-link">{t.browseStore}<ArrowRight size={20} aria-hidden="true" /></PlatformLink>
            </section>
            <section id="academy" className="library-academy" aria-labelledby="academy-title">
              <div className="library-academy-heading"><p className="library-eyebrow">Bitdoin Academy</p><span className="library-academy-icon"><GraduationCap size={32} strokeWidth={1.5} aria-hidden="true" /></span></div>
              <h2 id="academy-title">{t.academyTitle}</h2>
              <p className="library-section-description">{t.academyDescription}</p>
              <ol className="library-learning-steps">{t.steps.map((step, index) => {
                const Icon = stepIcons[index]
                return <li key={step.title}>
                  <div className="library-step-symbol"><span><Icon size={25} strokeWidth={1.4} aria-hidden="true" /></span>{index < 2 && <ArrowRight className="library-step-arrow" size={20} strokeWidth={1.3} aria-hidden="true" />}</div>
                  <h3>{index + 1}. {step.title}</h3><p>{step.description}</p>
                </li>
              })}</ol>
              <PlatformLink platform="academy" to={academyPath} className="library-button library-button-gold">{t.explore}<ArrowRight size={20} aria-hidden="true" /></PlatformLink>
            </section>
          </div>
        </section>
      </main>
      <footer className="library-footer"><div className="library-container"><span>© {new Date().getFullYear()} Bitdoin</span><p>{t.footer}</p><a href="#library-title">{t.backTop}<ArrowRight size={14} aria-hidden="true" /></a></div></footer>
    </div>
  )
}
