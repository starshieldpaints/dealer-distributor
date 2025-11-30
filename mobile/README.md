# DDMS Field App (React Native Outline)

This folder documents the planned mobile application for field sales reps and supervisors. The implementation will be a React Native (Expo) app that mirrors the backend services already built in `/backend`.

## Goals
- Offline-first capture of orders, secondary sales, and visit notes.
- Geo-tagged check-ins/check-outs with beat plan guidance.
- Push notifications for reminders (credit holds, schemes, tasks).
- Sync with the existing Node.js API once connectivity is restored.

## Tech Stack
- React Native + Expo (TypeScript)
- State: Zustand or Redux Toolkit Query for offline caching
- Networking: axios + queue (e.g., react-native-offline)
- Storage: SQLite/WatermelonDB for offline records
- Location services: `expo-location` or native modules
- Notifications: Expo Notifications / FCM

## Folder Structure (planned)
```
mobile/
  app/                  # Expo router or navigation stack
  src/
    api/                # API client mirroring backend endpoints
    store/              # Zustand slices for auth, visits, sales
    features/
      visits/           # Start/complete visit screens
      orders/           # Mobile order capture
      secondarySales/   # Sell-out capture
      notifications/    # Inbox and push handling
    offline/            # Queue + sync workers
  README.md             # (this file)
```

## Offline Strategy
- Queue mutations (orders, visits, sales) in local SQLite with status flags.
- Background task attempts sync when network is restored.
- Conflict resolution: server wins; stale local data re-fetched after sync.

## Next Steps
1. Initialize Expo project (`npx create-expo-app mobile-app`).
2. Share TypeScript types between backend/frontend/mobile (via `packages/`).
3. Implement auth screen hitting `/auth/login` + token storage.
4. Build visit capture screen using `/visits` + offline queue.
5. Add push notification integration for reminders using Expo Notifications/FCM.

PRs welcome once the project scaffold is created. Keep parity with backend endpoints documented in `../backend/README.md`.
