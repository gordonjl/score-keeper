import { makePersistedAdapter } from '@livestore/adapter-web'
import LiveStoreSharedWorker from '@livestore/adapter-web/shared-worker?sharedworker'
import { LiveStoreProvider } from '@livestore/react'
import { useEffect } from 'react'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ErrorBoundary } from 'react-error-boundary'
import Header from '../components/Header'
import Footer from '../components/Footer'
import LiveStoreWorker from '../livestore/livestore.worker?worker'
import { schema } from '../livestore/schema'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

const RootComponent = () => {
  const storeId = getStoreId()
  const adapter = makePersistedAdapter({
    storage: { type: 'opfs' },
    worker: LiveStoreWorker,
    sharedWorker: LiveStoreSharedWorker,
  })

  return (
    <RootDocument>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <LiveStoreProvider
          schema={schema}
          storeId={storeId}
          renderLoading={() => (
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <div className="loading loading-spinner loading-lg"></div>
                <p className="mt-4">Loading...</p>
              </div>
            </div>
          )}
          adapter={adapter}
          batchUpdates={batchUpdates}
          syncPayload={{ authToken: 'insecure-token-change-me' }}
        >
          <Outlet />
        </LiveStoreProvider>
      </ErrorBoundary>
    </RootDocument>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  // Apply theme based on system preferences
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = (e: MediaQueryListEvent | MediaQueryList) => {
      document.documentElement.setAttribute(
        'data-theme',
        e.matches ? 'pcsquash-dark' : 'pcsquash',
      )
    }
    apply(mq)
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <title>PCS Squash Score Keeper</title>
      </head>
      <body className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{
              position: 'bottom-left',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'TanStack Start Starter',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
})

const getStoreId = () => {
  if (typeof window === 'undefined') return 'unused'

  const STORE_ID_KEY = 'livestore-storeId'

  // Priority 1: Check URL query parameter (for sharing/debugging)
  const searchParams = new URLSearchParams(window.location.search)
  const urlStoreId = searchParams.get('storeId')
  if (urlStoreId !== null) {
    // Save to localStorage for persistence
    localStorage.setItem(STORE_ID_KEY, urlStoreId)
    return urlStoreId
  }

  // Priority 2: Check localStorage
  const savedStoreId = localStorage.getItem(STORE_ID_KEY)
  if (savedStoreId !== null) {
    return savedStoreId
  }

  // Priority 3: Generate new storeId and save it
  const newStoreId = crypto.randomUUID()
  localStorage.setItem(STORE_ID_KEY, newStoreId)
  return newStoreId
}
