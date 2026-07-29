import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import ProtectedRoute from './components/ProtectedRoute'
import Collection from './pages/Collection'
import WantList from './pages/WantList'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { useAuth } from './lib/useAuth'

export default function App() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
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
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </main>
    </div>
  )
}
