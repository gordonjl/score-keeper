# Update Notification System

## Overview

This app uses a simple version check system to notify users when a new version is deployed to Netlify. The system periodically checks a `version.json` file and prompts users to reload when a new version is detected.

## How It Works

1. **Version File Generation**: During build, a `version.json` file is created with a timestamp
2. **Periodic Checking**: The app checks this file every 60 seconds
3. **Version Comparison**: If the version changes, a notification appears
4. **Manual Reload**: Users can click "Reload" to update immediately, or "Later" to dismiss

## Implementation Details

### Files Created/Modified

- **`vite.config.ts`**: Added `vite-plugin-version-mark` to generate `version.json` during build
- **`src/hooks/useVersionCheck.ts`**: Custom hook that checks for version updates
- **`src/components/support/UpdateNotification.tsx`**: React component that displays the update prompt
- **`src/routes/__root.tsx`**: Integrated the UpdateNotification component

### Dependencies

- **`vite-plugin-version-mark`**: Battle-tested Vite plugin for version management

### How It Works

1. **Build Time**: The `vite-plugin-version-mark` generates `dist/client/version.json` with:
   ```json
   {
     "version": "b03d4c0",
     "timestamp": "2025-10-12T17:11:00.414Z"
   }
   ```
   The version is the **git commit SHA** (short form), making it easy to track exactly which code is deployed.

2. **Runtime**: The `useVersionCheck` hook:
   - Fetches `/version.json` on mount
   - Stores the current version
   - Checks every 60 seconds for changes
   - Notifies when a new version is detected

3. **User Action**: When notified, users can:
   - Click "Reload" to refresh immediately
   - Click "Later" to dismiss the notification

## Testing

### Local Development

1. Build the app: `pnpm build`
2. Check that `dist/client/version.json` was created
3. Serve the build: `pnpm serve`
4. Open in browser
5. Make a code change and rebuild
6. The update notification should appear within 60 seconds

### Production (Netlify)

1. Deploy to Netlify
2. Make a code change and deploy again
3. Users with the old version open will see the update notification within 60 seconds

## User Experience

When a new version is available:

```
┌─────────────────────────────────────┐
│ New version available!              │
│                                     │
│ A new version of the app is ready. │
│ Reload to get the latest features  │
│ and fixes.                          │
│                                     │
│ [Reload]  [Later]                   │
└─────────────────────────────────────┘
```

## Benefits

- ✅ **Simple**: No service worker complexity
- ✅ **Reliable**: Works with TanStack Start's build process
- ✅ **User control**: Users decide when to update
- ✅ **Lightweight**: Minimal code and no extra dependencies
- ✅ **Framework agnostic**: Works with any deployment platform

## Customization

### Change Check Interval

Modify the interval in `UpdateNotification.tsx`:

```typescript
const { hasUpdate, reload } = useVersionCheck(60_000) // milliseconds
```

### Change Notification Styling

Edit the Tailwind classes in `UpdateNotification.tsx`.

### Use Git Hash Instead of Timestamp

Modify `versionPlugin()` in `vite.config.ts` to use git commit hash:

```typescript
import { execSync } from 'node:child_process'

function versionPlugin(): Plugin {
  return {
    name: 'version-plugin',
    closeBundle() {
      const gitHash = execSync('git rev-parse --short HEAD').toString().trim()
      const version = {
        version: gitHash,
        timestamp: new Date().toISOString(),
      }
      // ... rest of code
    },
  }
}
```
