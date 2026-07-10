# security 🧱

- **File Path**: `src/middleware/security.ts`
- **Type**: Component
- **Status**: Stable
- **Relations**: [[Vault-MOC]], [[Full-File-Inventory]]

---

## 📋 Purpose
Shared CORS allowlist — used by Express cors() and routers.

---

## 🔌 Key Exports / Props
- `rateLimiter`
- `isAllowedOrigin`
- `securityHeaders`
- `isValidYoutubeVideoId`
- `isValidYoutubeChannelId`
- `isValidYoutubePlaylistId`
- `sanitizeError`
- `errorHandler`
- `requireRole`
- `inputValidation`
- `allowlistUpdate`
- `cleanupIpMap`

---

## 🔗 Dependency Map
- **Imports**: None
- **Imported By**: [[AuthModal]], [[AuthContext]], [[security.test]], [[security.test]]
