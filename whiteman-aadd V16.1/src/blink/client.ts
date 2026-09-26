import { createClient } from '@blinkdotnew/sdk'

export const blink = createClient({
  projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'base-ride-connect-j2ybf74r',
  publishableKey: import.meta.env.VITE_BLINK_PUBLISHABLE_KEY || 'blnk_pk_fbaJexiKi7CchEoZ8SCTH9ek1g6RvfI7',
  authRequired: false,
  auth: { mode: 'managed' },
})
