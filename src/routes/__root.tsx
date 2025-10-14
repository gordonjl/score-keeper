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
import { Auth0Provider } from '@auth0/auth0-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import { UpdateNotification } from '../components/support/UpdateNotification'
import { DevStoreReset } from '../components/support/DevStoreReset'
import LiveStoreWorker from '../livestore/livestore.worker?worker'
import { schema } from '../livestore/schema'
import { AuthProvider } from '../contexts/AuthContext'
import { useSyncAuthToLiveStore } from '../hooks/useSyncAuthToLiveStore'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'
import type { QueryClient } from '@tanstack/react-query'

type MyRouterContext = {
  queryClient: QueryClient
}

// Component that runs inside LiveStoreProvider to sync auth state
const LiveStoreContent = () => {
  useSyncAuthToLiveStore()

  return (
    <>
      <Header />
      <Outlet />
      {import.meta.env.DEV && <DevStoreReset />}
    </>
  )
}

const RootComponent = () => {
  const storeId = getStoreId()
  const adapter = makePersistedAdapter({
    storage: { type: 'opfs' },
    worker: LiveStoreWorker,
    sharedWorker: LiveStoreSharedWorker,
  })

  // If no valid store ID found, show error page
  if (!storeId) {
    return (
      <RootDocument>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md px-4">
            <h1 className="text-4xl font-bold mb-4">Address Not Found</h1>
            <p className="text-lg mb-6">
              Sorry, we couldn't find the address you were looking for.
            </p>
            <p className="text-sm text-gray-600">
              Please check the URL and try again. Make sure you're accessing the
              site with a valid subdomain.
            </p>
          </div>
        </div>
      </RootDocument>
    )
  }

  const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined
  const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID as
    | string
    | undefined

  if (!auth0Domain || !auth0ClientId) {
    console.error(
      'Auth0 configuration missing. Please set environment variables.',
    )
    return (
      <RootDocument>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md px-4">
            <h1 className="text-4xl font-bold mb-4">Configuration Error</h1>
            <p className="text-lg mb-6">
              Auth0 is not configured. Please set VITE_AUTH0_DOMAIN and
              VITE_AUTH0_CLIENT_ID environment variables.
            </p>
          </div>
        </div>
      </RootDocument>
    )
  }

  return (
    <RootDocument>
      <Auth0Provider
        domain={auth0Domain}
        clientId={auth0ClientId}
        authorizationParams={{
          redirect_uri:
            typeof window !== 'undefined' ? window.location.origin : undefined,
        }}
        cacheLocation="localstorage"
        useRefreshTokens={true}
      >
        <AuthProvider>
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
              syncPayload={{ storeId }}
            >
              <LiveStoreContent />
            </LiveStoreProvider>
          </ErrorBoundary>
        </AuthProvider>
      </Auth0Provider>
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
        <main className="flex-1">{children}</main>
        <Footer />
        <UpdateNotification />
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
const getStoreId = (): string | null => {
  if (typeof window === 'undefined') return 'unused'

  const hostname = window.location.hostname
  const parts = hostname.split('.')

  // Handle different hostname patterns:
  // - pcs.localhost -> 'pcs'
  // - pcs.score-keeper.gordonjl.com -> 'pcs'
  // - localhost -> no valid subdomain, return null
  // - score-keeper.gordonjl.com -> no valid subdomain, return null

  if (parts.length > 1) {
    const potentialSubdomain = parts[0]

    // Exclude 'www', 'localhost', and 'score-keeper' as valid store IDs
    if (
      potentialSubdomain !== 'www' &&
      potentialSubdomain !== 'localhost' &&
      potentialSubdomain !== 'score-keeper'
    ) {
      return potentialSubdomain
    }
  }

  // No valid subdomain found
  return null
}
