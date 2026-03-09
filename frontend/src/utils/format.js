import { format, formatDistanceToNow } from 'date-fns'

// price is stored in agorot (minor units), display in ₪
export const formatPrice = (agorot) => {
  if (agorot == null) return '—'
  return `₪${(agorot / 100).toFixed(2)}`
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return format(new Date(dateStr), 'dd MMM yyyy')
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  return format(new Date(dateStr), 'dd MMM yyyy, HH:mm')
}

export const timeAgo = (dateStr) => {
  if (!dateStr) return '—'
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
