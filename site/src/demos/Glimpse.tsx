import { lazy, Suspense, type ComponentType } from 'react'

const DEMOS: Record<string, ComponentType> = {
  'payment-tracker': lazy(() => import('./PaymentDemo')),
  cadence: lazy(() => import('./CadenceDemo')),
  lockout: lazy(() => import('./LockoutDemo')),
  collectorhub: lazy(() => import('./CollectorDemo')),
  vibeflow: lazy(() => import('./VibeDemo')),
  'light-reaction': lazy(() => import('./LightDemo')),
}

export const hasDemo = (slug: string) => slug in DEMOS

export default function Glimpse({ slug, fallback }: { slug: string; fallback: string }) {
  const Demo = DEMOS[slug]
  if (!Demo) return <div className="glimpse mono">{fallback}</div>
  return <Suspense fallback={<div className="glimpse mono">loading demo…</div>}><Demo /></Suspense>
}
