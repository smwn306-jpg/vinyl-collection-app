import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'
import { useLang } from '../lib/i18n'

const navItem =
  'font-mono text-xs tracking-widest uppercase px-3 py-2 border-b-2 transition-colors'

export default function Header() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { lang, t, toggle } = useLang()

  const handleLogout = async () => {
    await signOut(auth)
    navigate('/login')
  }

  return (
    <header className="border-b border-paper-light/10 sticky top-0 bg-ink/95 backdrop-blur z-10">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl tracking-wide">CRATE</h1>
          <p className="font-mono text-[10px] text-paper-light/40 tracking-widest">
            {user?.displayName || t.tagline}
          </p>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${navItem} ${isActive ? 'border-mustard text-mustard' : 'border-transparent text-paper-light/60 hover:text-paper-light'}`
            }
          >
            {t.tabCollection}
          </NavLink>
          <NavLink
            to="/want-list"
            className={({ isActive }) =>
              `${navItem} ${isActive ? 'border-mustard text-mustard' : 'border-transparent text-paper-light/60 hover:text-paper-light'}`
            }
          >
            {t.tabWantlist}
          </NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex rounded-full overflow-hidden border border-paper-light/20">
            <button
              onClick={() => lang !== 'he' && toggle()}
              className={`font-mono text-[10px] tracking-widest px-2.5 py-1.5 transition-colors ${
                lang === 'he' ? 'bg-mustard text-ink' : 'text-paper-light/60'
              }`}
            >
              עברית
            </button>
            <button
              onClick={() => lang !== 'en' && toggle()}
              className={`font-mono text-[10px] tracking-widest px-2.5 py-1.5 transition-colors ${
                lang === 'en' ? 'bg-mustard text-ink' : 'text-paper-light/60'
              }`}
            >
              EN
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="font-mono text-xs tracking-widest uppercase text-paper-light/60 hover:text-rust transition-colors"
          >
            {t.logout}
          </button>
        </div>
      </div>
    </header>
  )
}
