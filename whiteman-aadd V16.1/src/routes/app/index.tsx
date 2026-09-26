import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { blink } from '@/blink/client'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  AlertTriangle,
  CarFront,
  Check,
  ChevronRight,
  Clock3,
  Crosshair,
  MapPin,
  Navigation,
  Radio,
  Settings as SettingsIcon,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/')({
  head: () => ({
    meta: [
      { title: 'Whiteman AADD · On-base rides, coordinated' },
      { name: 'description', content: 'Request a safe, designated-driver pickup on your USAF base.' },
    ],
  }),
  component: () => (
    <BlinkClientBoundary fallback={<LoadingState />}>
      <RideRequestApp />
    </BlinkClientBoundary>
  ),
})

type RideStatus = 'requested' | 'assigned' | 'completed' | 'cancelled'

const BASE_ZONES = ['Main Gate', 'North Housing', 'South Housing', 'Flightline'] as const
type BaseZone = (typeof BASE_ZONES)[number]
type RideZone = BaseZone
const DEFAULT_ZONE: BaseZone = 'Main Gate'

type RideRequest = {
  id: string
  userId: string
  location: string
  destination: string
  zone: RideZone
  status: RideStatus
  assignedDriverName?: string | null
  createdAt: string
}

type Driver = {
  id: string
  displayName: string
  title: string
  zone: string
  isAvailable: string | number
}

const HOW_IT_WORKS_STEPS = [
  { number: '01', title: 'Share your spot', description: 'Use GPS or a recognizable landmark.' },
  { number: '02', title: 'DD gets the details', description: 'The closest available DD is notified.' },
  { number: '03', title: 'Meet safely', description: 'Keep an eye on your request status.' },
] as const

const rideRequests = blink.db.table<RideRequest>('ride_requests')
const drivers = blink.db.table<Driver>('driver_profiles')

function LoadingState() {
  return <div className="flex min-h-dvh items-center justify-center bg-background"><div className="size-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
}

function RideRequestApp() {
  const [user, setUser] = useState<{ id: string; displayName?: string | null } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [location, setLocation] = useState('')
  const [destination, setDestination] = useState('')
  const [zone, setZone] = useState<BaseZone>(DEFAULT_ZONE)
  const [request, setRequest] = useState<RideRequest | null>(null)
  const [nearbyDrivers, setNearbyDrivers] = useState<Driver[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => blink.auth.onAuthStateChanged((state) => {
    setUser(state.user ? { id: state.user.id, displayName: state.user.displayName } : null)
    if (!state.isLoading) setAuthLoading(false)
  }), [])

  useEffect(() => {
    drivers.list({ where: { zone, isAvailable: '1' }, limit: 4 }).then(setNearbyDrivers).catch(() => setNearbyDrivers([]))
  }, [zone])

  const greeting = useMemo(() => user?.displayName?.split(' ')[0] || 'Airman', [user?.displayName])

  function useCurrentLocation() {
    if (!navigator.geolocation) return toast.error('Location services are not available in this browser.')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation(`Current position · ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`)
        toast.success('Current location added')
      },
      () => toast.error('Could not access your location. Enter a landmark instead.'),
    )
  }

  async function requestRide() {
    if (!user) return blink.auth.login(window.location.href)
    if (!location.trim() || !destination.trim()) return toast.error('Add your pickup point and destination first.')
    setSubmitting(true)
    try {
      const created = await rideRequests.create({
        userId: user.id,
        location: location.trim(),
        destination: destination.trim(),
        zone,
        status: 'requested',
        assignedDriverName: nearbyDrivers[0]?.displayName || 'Dispatch queue',
      })
      setRequest(created)
      toast.success('Ride request sent', { description: 'Your request is now visible to an available DD.' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send ride request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) return <LoadingState />

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/70 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"><CarFront className="size-5" /></div>
            <div><p className="font-semibold tracking-tight">Whiteman AADD</p><p className="text-xs text-sidebar-foreground/60">On-base mobility, coordinated</p></div>
          </div>
          <div className="flex items-center gap-3 text-xs text-sidebar-foreground/70"><span className="hidden items-center gap-1.5 sm:flex"><span className="size-2 rounded-full bg-emerald-400" /> Base operations online</span><span className="rounded-full border border-sidebar-border px-3 py-1.5">{user ? greeting : 'Guest access'}</span><Button asChild variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-primary/15 hover:text-sidebar-foreground"><Link to="/app/settings" aria-label="Settings"><SettingsIcon className="size-4.5" /></Link></Button></div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1fr_360px] lg:px-8 lg:py-12">
        <section className="space-y-7">
          <div className="max-w-2xl space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/40 px-3 py-1.5 text-xs font-semibold text-accent-foreground"><ShieldCheck className="size-3.5" /> Trusted rides for the base community</div>
            <h1 className="font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">Get where you need to go.<br /><span className="text-primary">Stay connected.</span></h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">Tell us where you are on base and a designated driver will receive your pickup details. No guesswork, no waiting by the curb.</p>
          </div>

          {request ? <RequestStatus request={request} onNew={() => setRequest(null)} /> : <RequestForm location={location} destination={destination} zone={zone} setLocation={setLocation} setDestination={setDestination} setZone={setZone} onLocation={useCurrentLocation} onSubmit={requestRide} submitting={submitting} />}

          <div className="grid gap-3 sm:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map(({ number, title, description }) => <div key={number} className="rounded-xl border border-border/70 bg-card/50 p-4 transition-transform hover:-translate-y-1"><span className="font-mono text-xs text-primary">{number}</span><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>)}
          </div>
        </section>

        <aside className="space-y-4 lg:pt-24">
          <Card className="overflow-hidden border-sidebar/10 shadow-md">
            <CardHeader className="bg-sidebar pb-5 text-sidebar-foreground"><div className="flex items-center justify-between"><div><CardTitle className="text-base">DD network</CardTitle><CardDescription className="mt-1 text-sidebar-foreground/60">Available around {zone}</CardDescription></div><div className="rounded-lg bg-sidebar-primary/15 p-2 text-sidebar-primary"><Radio className="size-4" /></div></div></CardHeader>
            <CardContent className="space-y-3 pt-5">{nearbyDrivers.length ? nearbyDrivers.map((driver) => <div key={driver.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3"><div className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><UserRound className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{driver.displayName}</p><p className="text-xs text-muted-foreground">{driver.title} · {driver.zone}</p></div><span className="size-2 rounded-full bg-emerald-500" /></div>) : <div className="rounded-lg bg-muted/70 p-4 text-sm text-muted-foreground">No DDs are showing for this zone yet. Your request will enter dispatch.</div>}<div className="flex items-center gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground"><Users className="size-3.5" /> {nearbyDrivers.length} DD{nearbyDrivers.length === 1 ? '' : 's'} available in this zone</div></CardContent>
          </Card>
          <div className="rounded-xl border border-accent/50 bg-accent/20 p-4"><div className="flex gap-3"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-accent-foreground" /><p className="text-xs leading-5 text-accent-foreground"><strong>Not an emergency service.</strong> For urgent situations, call 911 or your base emergency number.</p></div></div>
        </aside>
      </main>
    </div>
  )
}

interface RequestFormProps {
  location: string
  destination: string
  zone: BaseZone
  setLocation: (v: string) => void
  setDestination: (v: string) => void
  setZone: (v: BaseZone) => void
  onLocation: () => void
  onSubmit: () => void
  submitting: boolean
}

function RequestForm({ location, destination, zone, setLocation, setDestination, setZone, onLocation, onSubmit, submitting }: RequestFormProps) {
  return <Card className="max-w-2xl border-primary/15 shadow-lg"><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="text-xl">Request a ride</CardTitle><CardDescription className="mt-1">Pickup details are shared only with Whiteman AADD dispatch.</CardDescription></div><div className="rounded-xl bg-primary/10 p-3 text-primary"><Navigation className="size-5" /></div></div></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><label htmlFor="pickup" className="text-sm font-medium">Pickup location</label><div className="flex gap-2"><div className="relative flex-1"><MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="pickup" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Building, lot, or landmark" className="h-11 pl-9" /></div><Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={onLocation} aria-label="Use current location"><Crosshair className="size-4" /></Button></div><p className="text-xs text-muted-foreground">Tap the crosshair to use your phone or browser location.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="destination" className="text-sm font-medium">Where are you going?</label><Input id="destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Dorms, gym, gate…" className="h-11" /></div><div className="space-y-2"><label htmlFor="zone" className="text-sm font-medium">Base zone</label><select id="zone" value={zone} onChange={(e) => setZone(e.target.value as BaseZone)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">{BASE_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}</select></div></div><Button type="button" onClick={onSubmit} disabled={submitting} className="h-12 w-full text-sm font-semibold shadow-md transition-transform hover:-translate-y-0.5">{submitting ? 'Sending to dispatch…' : <>Request my ride <ChevronRight className="size-4" /></>}</Button></CardContent></Card>
}

function RequestStatus({ request, onNew }: { request: RideRequest; onNew: () => void }) {
  return <Card className="max-w-2xl overflow-hidden border-emerald-500/25 shadow-lg"><div className="bg-emerald-500/10 px-6 py-5"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-emerald-500 text-emerald-950"><Check className="size-5" /></div><div><p className="font-semibold">Request sent to dispatch</p><p className="text-sm text-muted-foreground">A DD has your pickup details.</p></div></div></div><CardContent className="space-y-4 pt-6"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Pickup</p><p className="mt-1 text-sm font-medium">{request.location}</p></div><div className="rounded-lg bg-muted/60 p-3"><p className="text-xs text-muted-foreground">Destination</p><p className="mt-1 text-sm font-medium">{request.destination}</p></div></div><div className="flex items-center gap-3 rounded-lg border border-border/70 p-3"><Clock3 className="size-4 text-primary" /><div><p className="text-sm font-medium">Finding your DD</p><p className="text-xs text-muted-foreground">{request.assignedDriverName || 'Dispatch is assigning the nearest available driver.'}</p></div><span className="ml-auto size-2 animate-pulse rounded-full bg-amber-500" /></div><Button type="button" variant="outline" onClick={onNew} className="w-full">Make another request</Button></CardContent></Card>
}
