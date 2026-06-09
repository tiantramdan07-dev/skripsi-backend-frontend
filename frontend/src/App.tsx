/**
 * App.tsx — Main Router
 * PT Interskala Mandiri Indonesia — Timbangan Digital AI
 *
 * Route structure:
 * /signin            → SignIn (public)
 * /signup            → SignUp (public)
 * /                  → redirect to /dashboard
 * /dashboard         → ScaleDashboard (operator + admin)
 * /produk            → DataProduk (admin only)
 * /riwayat           → RiwayatPenimbangan (operator + admin)
 * /laporan           → LaporanPenimbangan (operator + admin)
 * /users             → UserManagement (admin only)
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Layout
import DashboardLayout from './layouts/DashboardLayout'

// Auth pages
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'

// Dashboard pages
import ScaleDashboard      from './pages/dashboard/ScaleDashboard'
import DataProduk          from './pages/dashboard/DataProduk'
import RiwayatPenimbangan  from './pages/dashboard/RiwayatPenimbangan'
import LaporanPenimbangan  from './pages/dashboard/LaporanPenimbangan'
import UserManagement      from './pages/dashboard/UserManagement'

// Route guards
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute     from './components/AdminRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Protected routes — requires login */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Root redirect */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Semua role */}
          <Route path="dashboard" element={<ScaleDashboard />} />
          <Route path="riwayat"   element={<RiwayatPenimbangan />} />
          <Route path="laporan"   element={<LaporanPenimbangan />} />

          {/* Admin only */}
          <Route 
            path="produk" 
            element={
              <AdminRoute>
                <DataProduk />
              </AdminRoute>
            } 
          />
          <Route 
            path="users" 
            element={
              <AdminRoute>
                <UserManagement />
              </AdminRoute>
            } 
          />

          {/* Fallback dalam layout */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/signin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}