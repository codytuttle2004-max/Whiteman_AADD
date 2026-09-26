import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { blink } from '@/blink/client'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertOctagon,
  CarFront,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GlassWater,
  ListChecks,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  clearAllLocalSettings,
  loadDdProfile,
  loadRiderProfile,
  loadTracker,
  saveDdProfile,
  saveRiderProfile,
  type DdProfile,
  type RiderProfile,
  type TrackerData,
} from '@/lib/aadd-settings'

export const Route = createFileRoute('/app/settings/account')({
  head: () => ({
    meta: [{ title: 'Account Information · Whiteman AADD' }],
  }),
  component: () => (
    <BlinkClientBoundary fallback={<LoadingState />}>
      <AccountInformation />
    </BlinkClientBoundary>
  ),
})

function LoadingState() {
  return <div className="flex min-h-dvh items-center justify-center bg-background"><div className="size-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
}

const BASE_ZONES = ['Main Gate', 'North Housing', 'South Housing', 'Flightline'] as const

type RideStatus = 'requested' | 'assigned' | 'completed' | 'cancelled'
type RideRequest = {
  id: string
  userId: string
  location: string
  destination: string
  status: RideStatus
  createdAt: string
}

const rideRequests = blink.db.table<RideRequest>('ride_requests')

function AccountInformation() {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [riderProfile, setRiderProfile] = useState<RiderProfile>(() => loadRiderProfile())
  const [ddProfile, setDdProfile] = useState<DdProfile>(() => loadDdProfile())
  const [tracker, setTracker] = useState<TrackerData>(() => loadTracker())

  const [editingSection, setEditingSection] = useState<'rider' | 'dd' | null>(null)
  const [riderForm, setRiderForm] = useState<RiderProfile>(riderProfile)
  const [ddForm, setDdForm] = useState<DdProfile>(ddProfile)

  const [requests, setRequests] = useState<RideRequest[]>([])
  const [requestsExpanded, setRequestsExpanded] = useState(false)
  const [requestsLoading, setRequestsLoading] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => blink.auth.onAuthStateChanged((state) => {
    setUser(state.user ? { id: state.user.id } : null)
    if (!state.isLoading) setAuthLoading(false)
  }), [])

  useEffect(() => {
    if (!user) { setRequests([]); return }
    setRequestsLoading(true)
    rideRequests.list({ where: { userId: user.id }, limit: 25 })
      .then((rows) => setRequests(rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))))
      .catch(() => setRequests([]))
      .finally(() => setRequestsLoading(false))
  }, [user])

  function openRiderEdit() {
    setRiderForm(riderProfile)
    setEditingSection(editingSection === 'rider' ? null : 'rider')
  }

  function openDdEdit() {
    setDdForm(ddProfile)
    setEditingSection(editingSection === 'dd' ? null : 'dd')
  }

  function saveRider() {
    setRiderProfile(riderForm)
    saveRiderProfile(riderForm)
    setEditingSection(null)
    toast.success('Rider profile saved')
  }

  function saveDd() {
    setDdProfile(ddForm)
    saveDdProfile(ddForm)
    setEditingSection(null)
    toast.success('DD profile saved')
  }

  async function cancelRequest(id: string) {
    try {
      await rideRequests.update(id, { status: 'cancelled' })
      setRequests((rows) => rows.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)))
      toast.success('Request cancelled')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not cancel that request.')
    }
  }

  async function deleteAllData() {
    setDeleting(true)
    try {
      clearAllLocalSettings()
      if (user) {
        await Promise.allSettled(requests.map((r) => rideRequests.delete(r.id)))
      }
      setRiderProfile(loadRiderProfile())
      setDdProfile(loadDdProfile())
      setTracker(loadTracker())
      setRequests([])
      toast.success('All user data deleted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong deleting your data.')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (authLoading) return <LoadingState />

  const activeRequests = requests.filter((r) => r.status === 'requested' || r.status === 'assigned')
  const latestRequest = requests[0]

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/70 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link to="/app/settings" aria-label="Back" className="flex size-9 items-center justify-center rounded-lg hover:bg-sidebar-primary/15">
            <ChevronLeft className="size-4.5" />
          </Link>
          <div>
            <p className="font-semibold tracking-tight">Account Information</p>
            <p className="text-xs text-sidebar-foreground/60">Profiles, requests & tracker data</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-5 py-8">
        {/* Rider profile */}
        <Card className="overflow-hidden">
          <button type="button" onClick={openRiderEdit} className="flex w-full items-center gap-4 px-6 py-5 text-left">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UserRound className="size-4.5" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Rider Profile</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{riderProfile.name || riderProfile.phone ? `${riderProfile.name || 'No name'} · ${riderProfile.phone || 'No phone'}` : 'Not set — tap to add'}</p>
            </div>
            <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${editingSection === 'rider' ? 'rotate-180' : ''}`} />
          </button>
          {editingSection === 'rider' && (
            <CardContent className="space-y-4 border-t border-border/60 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="rider-name">Name</Label><Input id="rider-name" value={riderForm.name} onChange={(e) => setRiderForm((f) => ({ ...f, name: e.target.value }))} className="h-11" /></div>
                <div className="space-y-2"><Label htmlFor="rider-phone">Phone</Label><Input id="rider-phone" type="tel" value={riderForm.phone} onChange={(e) => setRiderForm((f) => ({ ...f, phone: e.target.value }))} className="h-11" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="rider-home">Usual pickup spot</Label><Input id="rider-home" value={riderForm.homeLocation} onChange={(e) => setRiderForm((f) => ({ ...f, homeLocation: e.target.value }))} placeholder="Dorm building, housing area…" className="h-11" /></div>
              <Button type="button" onClick={saveRider}>Save rider profile</Button>
            </CardContent>
          )}
        </Card>

        {/* DD profile */}
        <Card className="overflow-hidden">
          <button type="button" onClick={openDdEdit} className="flex w-full items-center gap-4 px-6 py-5 text-left">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><CarFront className="size-4.5" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">DD Profile</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{ddProfile.name || ddProfile.phone ? `${ddProfile.name || 'No name'} · ${ddProfile.zone || 'No zone'}` : 'Not set — tap to add'}</p>
            </div>
            <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${editingSection === 'dd' ? 'rotate-180' : ''}`} />
          </button>
          {editingSection === 'dd' && (
            <CardContent className="space-y-4 border-t border-border/60 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="dd-name">Name</Label><Input id="dd-name" value={ddForm.name} onChange={(e) => setDdForm((f) => ({ ...f, name: e.target.value }))} className="h-11" /></div>
                <div className="space-y-2"><Label htmlFor="dd-phone">Phone</Label><Input id="dd-phone" type="tel" value={ddForm.phone} onChange={(e) => setDdForm((f) => ({ ...f, phone: e.target.value }))} className="h-11" /></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dd-zone">Usual zone</Label>
                <select id="dd-zone" value={ddForm.zone} onChange={(e) => setDdForm((f) => ({ ...f, zone: e.target.value }))} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select a zone</option>
                  {BASE_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <Button type="button" onClick={saveDd}>Save DD profile</Button>
            </CardContent>
          )}
        </Card>

        {/* Requests */}
        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => (user ? setRequestsExpanded((v) => !v) : toast('Sign in on the home screen to view your ride requests.'))}
            className="flex w-full items-center gap-4 px-6 py-5 text-left"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ListChecks className="size-4.5" /></div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">Requests</p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {!user ? 'Sign in to view your requests' : requestsLoading ? 'Loading…' : requests.length ? `${requests.length} request${requests.length === 1 ? '' : 's'} · latest: ${latestRequest.status}` : 'No requests yet'}
              </p>
            </div>
            {user && <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${requestsExpanded ? 'rotate-180' : ''}`} />}
          </button>
          {requestsExpanded && user && (
            <CardContent className="space-y-3 border-t border-border/60 pt-5">
              {requests.length === 0 && <p className="text-sm text-muted-foreground">No ride requests yet.</p>}
              {requests.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.location} → {r.destination}</p>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">{r.status}</p>
                  </div>
                  {(r.status === 'requested' || r.status === 'assigned') && (
                    <Button type="button" variant="outline" size="sm" onClick={() => cancelRequest(r.id)}>
                      <X className="size-3.5" /> Cancel
                    </Button>
                  )}
                </div>
              ))}
              {activeRequests.length === 0 && requests.length > 0 && <p className="text-xs text-muted-foreground">No active requests.</p>}
            </CardContent>
          )}
        </Card>

        {/* Tracker */}
        <Link to="/app/settings/tracker" className="flex items-center gap-4 rounded-xl border border-border/70 bg-card px-6 py-5 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><GlassWater className="size-4.5" /></div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Tracker</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{tracker.drinkCount} of {tracker.drinkLimit} drink{tracker.drinkLimit === 1 ? '' : 's'} logged</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>

        {/* Danger zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive"><AlertOctagon className="size-4.5" /><CardTitle className="text-base text-destructive">Danger Zone</CardTitle></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Permanently deletes your rider &amp; DD profiles, ride requests, tracker data, and settings. This can't be undone.</p>
            {!confirmDelete ? (
              <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" /> Delete All User Data
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">Are you sure? This permanently deletes everything and cannot be undone.</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
                  <Button type="button" variant="destructive" onClick={deleteAllData} disabled={deleting}>{deleting ? 'Deleting…' : 'Yes, delete everything'}</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
