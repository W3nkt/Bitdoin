import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowRight, BarChart3, BookOpen, ChevronLeft, ChevronRight, Compass, GraduationCap, Languages, Lightbulb, Moon, Sparkles, Sun, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/context/LanguageContext'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/lib/theme'
import { publicAsset } from '@/lib/assets'
import { landingCopy } from '@/components/landing/landingCopy'
import './platform-selector.css'

const bookImages = ['book-action.webp', 'book-focus.webp', 'book-language.webp']
const featureIcons = [BookOpen, Lightbulb, Compass]
const stepIcons = [BookOpen, Sparkles, BarChart3]

function PlatformLink({ platform, to, children, className }: { platform: 'bookstore' | 'academy'; to: string; children: ReactNode; className?: string }) {
  return <Link to={to} onClick={() => localStorage.setItem('bitdoin_last_platform', platform)} className={className}>{children}</Link>
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
  const bookstorePath = isAdmin ? '/admin' : '/bookstore'
  const academyPath = isAdmin ? '/academy-admin' : '/academy'

  // The header floats over the page; once the page scrolls it gets a frosted background so it stays readable.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
        <picture className="library-backdrop" aria-hidden="true">
          <source media="(max-width: 767px)" srcSet={publicAsset('images/landing/library-room-mobile.webp')} />
          <img src={publicAsset('images/landing/library-room.webp')} alt="" fetchPriority="high" />
        </picture>
        <div className="library-shade" aria-hidden="true" />
        <div className="library-header-spacer" aria-hidden="true" />
        <section id="library-main" tabIndex={-1} className="library-hero-content library-container" aria-labelledby="library-title">
          <div className="library-intro">
            <p className="library-eyebrow">{t.eyebrow}</p>
            <h1 id="library-title">{t.title}<br /><span>{t.titleSecond}</span></h1>
            <p className="library-subtitle">{t.subtitle}</p>
            <div className="library-actions">
              <PlatformLink platform="bookstore" to={bookstorePath} className="library-button library-button-orange">{t.browse}<ArrowRight size={19} aria-hidden="true" /></PlatformLink>
              <PlatformLink platform="academy" to={academyPath} className="library-button library-button-outline">{t.explore}<ArrowRight size={19} aria-hidden="true" /></PlatformLink>
            </div>
            <a href="#bookstore" className="library-discover"><BookOpen size={15} strokeWidth={1.5} aria-hidden="true" />{t.discover}</a>
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
              <div className="library-small-shelf" aria-hidden="true"><img src={publicAsset('images/landing/bookstore-shelf.webp')} alt="" width="1100" height="596" loading="lazy" /></div>
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
