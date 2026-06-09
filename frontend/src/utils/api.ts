// Ubah ke IP server Flask Anda
export const API_URL = import.meta.env.VITE_API_URL || 'http://10.230.93.82:4000'

export function getToken(): string | null {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

export function clearToken() {
  localStorage.removeItem('token')
  sessionStorage.removeItem('token')
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (res.status === 401) {
    clearToken()
    window.location.href = '/signin'
  }
  return res
}
