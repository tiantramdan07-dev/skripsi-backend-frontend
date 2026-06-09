import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { getToken } from '../utils/api'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  return getToken() ? <>{children}</> : <Navigate to="/signin" replace />
}
