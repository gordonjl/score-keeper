# Subdomain-Based Store ID Setup

## Overview

The application uses subdomain slugs as store IDs. This allows different organizations/clubs to have their own isolated data stores.

## How It Works

The `getStoreId()` function extracts the subdomain from the hostname:

**Priority order:**
1. **Subdomain slug** - Extracted from hostname
2. **localStorage** - Previously saved store ID
3. **Generated UUID** - Fallback if none of the above exist

## Supported Hostname Patterns

### Local Development
- `pcs.localhost:3000` → store ID: `pcs`
- `club1.localhost:3000` → store ID: `club1`
- `localhost:3000` → fallback to localStorage/UUID

### Production (score-keeper.gordonjl.com)
- `pcs.score-keeper.gordonjl.com` → store ID: `pcs`
- `anotherclub.score-keeper.gordonjl.com` → store ID: `anotherclub`
- `score-keeper.gordonjl.com` → fallback to localStorage/UUID

## Excluded Subdomains

The following subdomains are **not** used as store IDs and will fall back to localStorage/UUID:
- `www`
- `localhost`
- `score-keeper`

## Local Development Setup

### Using subdomain.localhost

Modern browsers support `*.localhost` subdomains natively.

1. **Start the dev server:**
   ```bash
   pnpm dev
   ```

2. **Access via subdomain:**
   - Navigate to `http://pcs.localhost:3000` in your browser
   - The store ID will automatically be set to `pcs`

3. **Test multiple stores:**
   - Open `http://club1.localhost:3000` in one tab
   - Open `http://club2.localhost:3000` in another tab
   - Each will have independent data stores

### Notes

- The dev server is configured with `host: true` in `vite.config.ts` to accept requests from any hostname
- Each subdomain maintains its own isolated data store in browser storage

## Production Deployment

The application is hosted at `score-keeper.gordonjl.com` and supports nested subdomains:
- `pcs.score-keeper.gordonjl.com` → store ID: `pcs`
- `club2.score-keeper.gordonjl.com` → store ID: `club2`

Make sure your DNS is configured with a wildcard record (`*.score-keeper.gordonjl.com`) to route all subdomains to your application.
