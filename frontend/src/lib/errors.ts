import axios from 'axios'

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (Array.isArray(detail)) {
      return detail
        .map((item) => (typeof item?.msg === 'string' ? item.msg : null))
        .filter(Boolean)
        .join(' | ')
    }
    if (typeof detail === 'string') {
      return detail
    }
    return error.message || fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}
