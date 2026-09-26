import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertTriangle,
  Bell,
  BellRing,
  ChevronLeft,
  GlassWater,
  MessageCircle,
  Minus,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { buildSmsHref, loadTracker, saveTracker, type TrackerData } from '@/lib/aadd-settings'

export const Route = createFileRoute('/app/settings/tracker')({
  head: () => ({
    meta: [{ title: 'Alcohol Tracker · Whiteman AADD' }],
  }),
  component: () => (
    <BlinkClientBoundary fallback={<LoadingState />}>
      <AlcoholTracker />
    </BlinkClientBoundary>
  ),
})

function LoadingState() {
  return <div className="flex min-h-dvh items-center justify-center bg-background"><div className="size-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
}

type NotifState = 'unsupported' | NotificationPermission

function AlcoholTracker() {
  const [tracker, setTracker] = useState<TrackerData>(() => loadTracker())
  const [limitInput, setLimitInput] = useState(() => String(loadTracker().drinkLimit))
  const [contactName, setContactName] = useState(() => loadTracker().contactName)
  const [contactPhone, setContactPhone] = useState(() => loadTracker().contactPhone)
  const [notifPermission, setNotifPermission] = useState<NotifState>('default')
  const alertedForCount = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setNotifPermission('unsupported')
      return
    }
    setNotifPermission(Notification.permission)
  }, [])

  useEffect(() => {
    saveTracker(tracker)
  }, [tracker])

  const limitReached = tracker.drinkLimit > 0 && tracker.drinkCount >= tracker.drinkLimit

  useEffect(() => {
    if (!limitReached) {
      alertedForCount.current = null
      return
    }
    if (alertedForCount.current === tracker.drinkCount) return
    alertedForCount.current = tracker.drinkCount

    toast.warning("You've hit your drink limit", {
      description: 'Time to line up a safe ride home.',
    })

    if (typeof window !== 'undefined' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification('Drink limit reached', {
          body: "You've met your drink limit for tonight. Line up a safe ride.",
        })
      } catch {
        // Notifications can throw in some contexts (e.g. no service worker) — the toast still covers it.
      }
    }
  }, [limitReached, tracker.drinkCount])

  function logDrink() {
    setTracker((t) => ({ ...t, drinkCount: t.drinkCount + 1 }))
  }

  function undoDrink() {
    setTracker((t) => ({ ...t, drinkCount: Math.max(0, t.drinkCount - 1) }))
  }

  function resetCount() {
    setTracker((t) => ({ ...t, drinkCount: 0 }))
    toast.success('Counter reset')
  }

  function saveLimit() {
    const parsed = Math.max(1, Math.round(Number(limitInput) || 1))
    setLimitInput(String(parsed))
    setTracker((t) => ({ ...t, drinkLimit: parsed }))
    toast.success('Drink limit updated')
  }

  function saveContact() {
    if (contactPhone.trim() && contactPhone.replace(/\D/g, '').length < 7) {
      toast.error('Enter a valid phone number.')
      return
    }
    setTracker((t) => ({ ...t, contactName: contactName.trim(), contactPhone: contactPhone.trim() }))
    toast.success('Contact saved')
  }

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    if (permission === 'granted') toast.success('Device notifications enabled')
    else if (permission === 'denied') toast.error('Notifications blocked in browser settings.')
  }

  const smsHref = buildSmsHref(
    tracker.contactPhone,
    `Hey${tracker.contactName ? ' ' + tracker.contactName : ''}, I've hit my drink limit tonight and could use a ride.`,
  )

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/70 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link to="/app/settings" aria-label="Back" className="flex size-9 items-center justify-center rounded-lg hover:bg-sidebar-primary/15">
            <ChevronLeft className="size-4.5" />
          </Link>
          <div>
            <p className="font-semibold tracking-tight">Alcohol Tracker</p>
            <p className="text-xs text-sidebar-foreground/60">Drink count is stored on this device only</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-5 py-8">
        <Card className="overflow-hidden border-primary/15 shadow-lg">
          <CardContent className="flex flex-col items-center gap-5 pt-6 pb-7">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <GlassWater className="size-6" />
            </div>
            <div className="text-center">
              <p className="text-5xl font-semibold tabular-nums">{tracker.drinkCount}</p>
              <p className="mt-1 text-sm text-muted-foreground">of {tracker.drinkLimit} drink{tracker.drinkLimit === 1 ? '' : 's'} limit</p>
            </div>
            <div className="flex w-full max-w-xs items-center gap-2">
              <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={undoDrink} disabled={tracker.drinkCount === 0} aria-label="Remove one drink">
                <Minus className="size-4" />
              </Button>
              <Button type="button" onClick={logDrink} className="h-11 flex-1 text-sm font-semibold">Log a Drink</Button>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={resetCount} className="text-muted-foreground">
              <RotateCcw className="size-3.5" /> Reset count
            </Button>
          </CardContent>
        </Card>

        {limitReached && (
          <Card className="overflow-hidden border-amber-500/30 bg-amber-500/10 shadow-md">
            <CardContent className="space-y-4 pt-5">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold">You've met your drink limit</p>
                  <p className="mt-0.5 text-sm leading-5 text-muted-foreground">Consider requesting a DD, or reach out to your contact below.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {notifPermission === 'default' && (
                  <Button type="button" variant="outline" size="sm" onClick={enableNotifications}>
                    <Bell className="size-3.5" /> Enable device notifications
                  </Button>
                )}
                {notifPermission === 'granted' && (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <BellRing className="size-3.5" /> Device notifications on
                  </span>
                )}
                {tracker.contactPhone ? (
                  <Button asChild size="sm">
                    <a href={smsHref}><MessageCircle className="size-3.5" /> Text your contact</a>
                  </Button>
                ) : (
                  <Button type="button" size="sm" disabled>
                    <MessageCircle className="size-3.5" /> Text your contact
                  </Button>
                )}
              </div>
              {!tracker.contactPhone && <p className="text-xs text-muted-foreground">Add a designated contact below to enable one-tap texting.</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Drink limit</CardTitle>
            <CardDescription>You'll get an alert once you log this many drinks.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="drink-limit">Number of drinks</Label>
              <Input id="drink-limit" type="number" min={1} inputMode="numeric" value={limitInput} onChange={(e) => setLimitInput(e.target.value)} className="h-11" />
            </div>
            <Button type="button" onClick={saveLimit} className="h-11">Save</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Designated contact</CardTitle>
            <CardDescription>Who should we pre-fill a text to when you hit your limit?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Name</Label>
                <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Roommate, battle buddy…" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Phone number</Label>
                <Input id="contact-phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="660-62-2732" className="h-11" />
              </div>
            </div>
            <Button type="button" onClick={saveContact} className="w-full sm:w-auto">Save contact</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
