import { Navigate, Route, Routes } from 'react-router'
import Layout from './components/Layout'
import { useAuth } from './lib/auth'
import { ConfigProvider } from './lib/config'
import AuditPage from './pages/AuditPage'
import ClosingPage from './pages/ClosingPage'
import HouseholdFormPage from './pages/HouseholdFormPage'
import HouseholdPage from './pages/HouseholdPage'
import LightTypesPage from './pages/LightTypesPage'
import LoginPage from './pages/LoginPage'
import MemberPage from './pages/MemberPage'
import OrderPage from './pages/OrderPage'
import PrintPage from './pages/PrintPage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import UsersPage from './pages/UsersPage'
import CardsPrint from './pages/print/CardsPrint'
import NameListPrint from './pages/print/NameListPrint'

export default function App() {
  const { me, loading } = useAuth()
  if (loading) return <div className="page muted">載入中…</div>
  if (!me) return <LoginPage />
  return (
    <ConfigProvider>
      <Routes>
        <Route path="/print/name-list" element={<NameListPrint />} />
        <Route path="/print/cards" element={<CardsPrint />} />
        <Route element={<Layout />}>
          <Route path="/" element={<SearchPage />} />
          <Route path="/households/new" element={<HouseholdFormPage />} />
          <Route path="/households/:id" element={<HouseholdPage />} />
          <Route path="/households/:id/edit" element={<HouseholdFormPage />} />
          <Route path="/members/:id" element={<MemberPage />} />
          <Route path="/orders/:id" element={<OrderPage />} />
          <Route path="/closing" element={<ClosingPage />} />
          <Route path="/print" element={<PrintPage />} />
          <Route path="/light-types" element={<LightTypesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/users" element={me.role === 'ADMIN' ? <UsersPage /> : <Navigate to="/" replace />} />
          <Route path="/audit" element={me.role === 'ADMIN' ? <AuditPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ConfigProvider>
  )
}
