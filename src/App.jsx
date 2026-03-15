import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Feed from './components/Feed'
import Library from './pages/Library'
import Confessions from './pages/Confessions'
import Polls from './pages/Polls'
import Events from './pages/Events'
import Profile from './pages/Profile'
import VideoMeetings from './pages/VideoMeetings'
import NotificationBell from './components/NotificationBell'
import StudyGroups from './pages/StudyGroups/StudyGroups'
import GroupDetail from './pages/StudyGroups/GroupDetail'
import Marketplace from './pages/Marketplace/Marketplace'
import PostItem from './pages/Marketplace/PostItem'
import ItemDetail from './pages/Marketplace/ItemDetail'
import { Menu, X } from 'lucide-react'
import './App.css'

function Home() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    getUser()
  }, [])

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profile)
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setMobileMenuOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0033A0]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-[#0033A0] text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and brand */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-[#FFD100] rounded-lg flex items-center justify-center text-[#0033A0] font-bold text-xl shadow-md">
                VU
              </div>
              <Link to="/" className="text-2xl font-bold tracking-tight hover:text-[#FFD100]" onClick={() => setMobileMenuOpen(false)}>
                Campus Life VU
              </Link>
            </div>

            {/* Desktop Navigation (hidden on mobile) */}
            {user && (
              <div className="hidden md:flex items-center space-x-6">
                <Link to="/" className="text-white hover:text-[#FFD100] transition text-lg">Home</Link>
                <Link to="/library" className="text-white hover:text-[#FFD100] transition text-lg">Library</Link>
                <Link to="/confessions" className="text-white hover:text-[#FFD100] transition text-lg">Confessions</Link>
                <Link to="/polls" className="text-white hover:text-[#FFD100] transition text-lg">Polls</Link>
                <Link to="/events" className="text-white hover:text-[#FFD100] transition text-lg">Events</Link>
                <Link to="/video" className="text-white hover:text-[#FFD100] transition text-lg">Video</Link>
                <Link to="/groups" className="text-white hover:text-[#FFD100] transition text-lg">Groups</Link>
                <Link to="/marketplace" className="text-white hover:text-[#FFD100] transition text-lg">Marketplace</Link>
                <NotificationBell user={user} />
                <Link to={`/profile/${user.id}`} className="flex items-center gap-2 text-white hover:text-[#FFD100] transition">
                  <div className="w-8 h-8 bg-[#FFD100] rounded-full flex items-center justify-center text-[#0033A0] font-bold">
                    {profile?.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden lg:inline">{profile?.full_name || 'Profile'}</span>
                </Link>
                <button onClick={handleLogout} className="bg-[#FFD100] text-[#0033A0] px-4 py-2 rounded-full hover:bg-yellow-400 transition font-semibold text-sm shadow">
                  Logout
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            {user && (
              <div className="md:hidden flex items-center space-x-2">
                <NotificationBell user={user} />
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-white hover:text-[#FFD100] transition"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            )}

            {/* Login button for non-authenticated (desktop) */}
            {!user && (
              <button onClick={() => window.location.href = '/login'} className="bg-[#FFD100] text-[#0033A0] px-4 py-2 rounded-full hover:bg-yellow-400 transition font-semibold text-sm shadow">
                Login
              </button>
            )}
          </div>

          {/* Mobile Navigation Dropdown */}
          {user && mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-[#FFD100]/30 space-y-2">
              <Link to="/" className="block py-2 text-white hover:text-[#FFD100] transition" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/library" className="block py-2 text-white hover:text-[#FFD100] transition" onClick={() => setMobileMenuOpen(false)}>Library</Link>
              <Link to="/confessions" className="block py-2 text-white hover:text-[#FFD100] transition" onClick={() => setMobileMenuOpen(false)}>Confessions</Link>
              <Link to="/polls" className="block py-2 text-white hover:text-[#FFD100] transition" onClick={() => setMobileMenuOpen(false)}>Polls</Link>
              <Link to="/events" className="block py-2 text-white hover:text-[#FFD100] transition" onClick={() => setMobileMenuOpen(false)}>Events</Link>
              <Link to="/video" className="block py-2 text-white hover:text-[#FFD100] transition" onClick={() => setMobileMenuOpen(false)}>Video</Link>
              <Link to="/groups" className="block py-2 text-white hover:text-[#FFD100] transition" onClick={() => setMobileMenuOpen(false)}>Groups</Link>
              <Link to="/marketplace" className="block py-2 text-white hover:text-[#FFD100] transition" onClick={() => setMobileMenuOpen(false)}>Marketplace</Link>
              <Link to={`/profile/${user.id}`} className="block py-2 text-white hover:text-[#FFD100] transition" onClick={() => setMobileMenuOpen(false)}>
                Profile ({profile?.full_name || user.email?.split('@')[0]})
              </Link>
              <button onClick={handleLogout} className="w-full text-left py-2 text-white hover:text-[#FFD100] transition">Logout</button>
            </div>
          )}
        </div>
      </nav>

      <main className="flex justify-center w-full px-4 py-6">
        <Routes>
          <Route path="/" element={
            user ? <Feed user={user} profile={profile} /> : (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm p-8 max-w-4xl w-full">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome to <span className="text-[#0033A0]">Campus Life VU</span></h2>
                <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">The social platform built for Victoria University students</p>
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-gray-50 p-6 rounded-xl"><div className="text-4xl mb-3">📱</div><h3 className="font-bold text-lg mb-2">Connect</h3><p className="text-gray-600">Chat with students across all faculties</p></div>
                  <div className="bg-gray-50 p-6 rounded-xl"><div className="text-4xl mb-3">📚</div><h3 className="font-bold text-lg mb-2">Study</h3><p className="text-gray-600">Form study groups and share notes</p></div>
                  <div className="bg-gray-50 p-6 rounded-xl"><div className="text-4xl mb-3">🎉</div><h3 className="font-bold text-lg mb-2">Socialize</h3><p className="text-gray-600">Discover campus events and parties</p></div>
                </div>
                <button onClick={() => window.location.href = '/signup'} className="bg-[#0033A0] text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-[#002277] transition shadow-lg">Join Now</button>
              </div>
            )
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          {user && (
            <>
              <Route path="/library" element={<Library user={user} profile={profile} />} />
              <Route path="/confessions" element={<Confessions user={user} profile={profile} />} />
              <Route path="/polls" element={<Polls user={user} profile={profile} />} />
              <Route path="/events" element={<Events user={user} profile={profile} />} />
              <Route path="/video" element={<VideoMeetings user={user} profile={profile} />} />
              <Route path="/profile/:id" element={<Profile user={user} />} />
              <Route path="/groups" element={<StudyGroups user={user} profile={profile} />} />
              <Route path="/groups/:id" element={<GroupDetail user={user} />} />
              <Route path="/marketplace" element={<Marketplace user={user} />} />
              <Route path="/marketplace/post" element={<PostItem user={user} />} />
              <Route path="/marketplace/:id" element={<ItemDetail user={user} />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ style: { background: '#0033A0', color: '#fff', borderRadius: '9999px' } }} />
      <Routes><Route path="/*" element={<Home />} /></Routes>
    </BrowserRouter>
  )
}

export default App