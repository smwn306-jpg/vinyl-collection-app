import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../lib/useAuth'

const navItem =
  'font-mono text-xs tracking-widest uppercase px-3 py-2 border-b-2 transition-colors'

export default function Header() {
  const navigate = useNavigate()
  const { user } = useAuth()

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
            {user?.displayName || 'האוסף שלך'}
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
            אוסף
          </NavLink>
          <NavLink
            to="/want-list"
            className={({ isActive }) =>
              `${navItem} ${isActive ? 'border-mustard text-mustard' : 'border-transparent text-paper-light/60 hover:text-paper-light'}`
            }
          >
            חוסרים
          </NavLink>
          <button
            onClick={handleLogout}
            className={`${navItem} border-transparent text-paper-light/60 hover:text-rust`}
          >
            התנתקות
          </button>
        </nav>
      </div>
    </header>
  )
}
