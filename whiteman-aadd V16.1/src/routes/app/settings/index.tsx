import { createFileRoute, Link } from '@tanstack/react-router'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { ChevronLeft, ChevronRight, GlassWater, UserCog } from 'lucide-react'

export const Route = createFileRoute('/app/settings/')({
  head: () => ({
    meta: [{ title: 'Settings · Whiteman AADD' }],
  }),
  component: () => (
    <BlinkClientBoundary fallback={<LoadingState />}>
      <SettingsHome />
    </BlinkClientBoundary>
  ),
})

function LoadingState() {
  return <div className="flex min-h-dvh items-center justify-center bg-background"><div className="size-9 animate-spin rounded-full border-4 border-primary/20 border-t-primary" /></div>
}

const SETTINGS_OPTIONS = [
  {
    to: '/app/settings/tracker' as const,
    icon: GlassWater,
    title: 'Alcohol Tracker',
    description: 'Log drinks, set a limit, and line up a safe ride when you hit it.',
  },
  {
    to: '/app/settings/account' as const,
    icon: UserCog,
    title: 'Account Information',
    description: 'Rider & DD profiles, ride requests, tracker data — and where to delete it all.',
  },
]

function SettingsHome() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/70 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Link to="/app" aria-label="Back" className="flex size-9 items-center justify-center rounded-lg hover:bg-sidebar-primary/15">
            <ChevronLeft className="size-4.5" />
          </Link>
          <div>
            <p className="font-semibold tracking-tight">Settings</p>
            <p className="text-xs text-sidebar-foreground/60">Whiteman AADD</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-3 px-5 py-8">
        {SETTINGS_OPTIONS.map(({ to, icon: Icon, title, description }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{title}</p>
              <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </main>
    </div>
  )
}
