const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()

// Normalize to avoid accidental double slashes in generated URLs.
const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, '')

export const getApiBaseUrl = () => API_BASE_URL

export const buildApiUrl = (path) => {
  if (!API_BASE_URL) return path
  return `${API_BASE_URL}${path}`
}

export const buildWsUrl = (path) => {
  const rawWsBaseUrl = (import.meta.env.VITE_WS_BASE_URL || '').trim().replace(/\/$/, '')

  if (rawWsBaseUrl) return `${rawWsBaseUrl}${path}`

  if (API_BASE_URL) {
    const wsBase = API_BASE_URL
      .replace(/^https:/i, 'wss:')
      .replace(/^http:/i, 'ws:')
    return `${wsBase}${path}`
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${path}`
}
