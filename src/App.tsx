import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy, type ReactNode } from 'react'
import { ThemeProvider } from './store/ThemeContext'
import { AuthProvider, useAuth } from './store/AuthContext'
import { RantProvider } from './store/RantContext'
import { NoteProvider } from './store/NoteContext'
import Layout from './components/Layout'
import ToastContainer from './components/Toast'
import AppLockManager from './components/AppLockManager'

const PairPage = lazy(() => import('./pages/PairPage'))
const FeedPage = lazy(() => import('./pages/FeedPage'))
const RecordPage = lazy(() => import('./pages/RecordPage'))
const RantDetailPage = lazy(() => import('./pages/RantDetailPage'))
const BoardPage = lazy(() => import('./pages/BoardPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const BadgesPage = lazy(() => import('./pages/BadgesPage'))

function Spinner() {
  return <div className="flex items-center justify-center min-h-dvh bg-[var(--bg)]"><span className="w-6 h-6 border-2 border-[var(--pink)] border-t-transparent rounded-full animate-spin" /></div>
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <Spinner />
  if (!user) return <Navigate to="/pair" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user, isPaired } = useAuth()

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/pair" element={isPaired ? <Navigate to="/feed" replace /> : <PairPage />} />
        <Route path="/feed" element={<ProtectedRoute><Layout><FeedPage /></Layout></ProtectedRoute>} />
        <Route path="/record" element={<ProtectedRoute><Layout><RecordPage /></Layout></ProtectedRoute>} />
        <Route path="/rant/:id" element={<ProtectedRoute><RantDetailPage /></ProtectedRoute>} />
        <Route path="/board" element={<ProtectedRoute><Layout><BoardPage /></Layout></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Layout><CalendarPage /></Layout></ProtectedRoute>} />
        <Route path="/stats" element={<ProtectedRoute><Layout><StatsPage /></Layout></ProtectedRoute>} />
        <Route path="/badges" element={<ProtectedRoute><Layout><BadgesPage /></Layout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={!user ? '/pair' : isPaired ? '/feed' : '/pair'} replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppLockManager>
            <RantProvider>
              <NoteProvider>
                <AppRoutes />
              </NoteProvider>
            </RantProvider>
            <ToastContainer />
          </AppLockManager>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
