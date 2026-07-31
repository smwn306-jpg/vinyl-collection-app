import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'
import OfflineBanner from './components/OfflineBanner'
import Collection from './pages/Collection'
import WantList from './pages/WantList'
import Sets from './pages/Sets'
import Messages from './pages/Messages'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { useAuth } from './lib/useAuth'

export default function App() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
      <OfflineBanner />
      {user && <Header />}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Collection />
              </ProtectedRoute>
            }
          />
          <Route
            path="/want-list"
            element={
              <ProtectedRoute>
                <WantList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sets"
            element={
              <ProtectedRoute>
                <Sets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </main>
    </div>
  )
}
