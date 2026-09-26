/**
 * Local, on-device storage for the Settings area (Alcohol Tracker + rider/DD
 * profile summaries). Deliberately kept in localStorage rather than the Blink
 * DB: the tracker and profile summaries need to work immediately for guests
 * too, and none of this needs to sync across devices.
 */

export type TrackerData = {
  drinkCount: number
  drinkLimit: number
  contactName: string
  contactPhone: string
}

export type RiderProfile = {
  name: string
  phone: string
  homeLocation: string
}

export type DdProfile = {
  name: string
  phone: string
  zone: string
}

const TRACKER_KEY = 'aadd_tracker_v1'
const RIDER_KEY = 'aadd_rider_profile_v1'
const DD_KEY = 'aadd_dd_profile_v1'

const DEFAULT_TRACKER: TrackerData = { drinkCount: 0, drinkLimit: 4, contactName: '', contactPhone: '' }
const DEFAULT_RIDER: RiderProfile = { name: '', phone: '', homeLocation: '' }
const DEFAULT_DD: DdProfile = { name: '', phone: '', zone: '' }

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) }
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can fail in private-browsing contexts — settings simply won't persist.
  }
}

export const loadTracker = () => readJson(TRACKER_KEY, DEFAULT_TRACKER)
export const saveTracker = (data: TrackerData) => writeJson(TRACKER_KEY, data)

export const loadRiderProfile = () => readJson(RIDER_KEY, DEFAULT_RIDER)
export const saveRiderProfile = (data: RiderProfile) => writeJson(RIDER_KEY, data)

export const loadDdProfile = () => readJson(DD_KEY, DEFAULT_DD)
export const saveDdProfile = (data: DdProfile) => writeJson(DD_KEY, data)

/** Wipes every locally-stored setting. Does not touch synced (Blink DB) data. */
export function clearAllLocalSettings() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(TRACKER_KEY)
    window.localStorage.removeItem(RIDER_KEY)
    window.localStorage.removeItem(DD_KEY)
  } catch {
    // Nothing else we can do — surfaced to the user by the caller if needed.
  }
}

/**
 * Builds a `sms:` link that opens the device's native SMS compose screen with
 * a pre-filled body. Web apps can't send a text on the user's behalf, so this
 * is a "ready to send, one tap to confirm" link rather than a silent send.
 * iOS Safari expects `&body=`, everything else expects `?body=`.
 */
export function buildSmsHref(phone: string, body: string): string {
  const digitsOnly = phone.replace(/[^\d+]/g, '')
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
  const separator = isIOS ? '&' : '?'
  return `sms:${digitsOnly}${separator}body=${encodeURIComponent(body)}`
}
