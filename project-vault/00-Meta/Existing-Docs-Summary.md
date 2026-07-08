# Existing Docs Summary

A synthesis of the pre-existing repository documentation, capturing core design specs, goals, and checking for codebase deviations.

## 📄 Document Indexes & Summaries

1. **`README.md`**: Basic Node.js local setup commands (`npm install`, `npm run dev`) and Google AI Studio app dashboard links.
2. **`PROJECT-STATE.md`**: Current verified state documentation, consolidation changelogs, key system tables, and known mistakes.
3. **`brain.md`**: Core system bible. Defines BioVised as an anti-distraction proxy layer over YouTube specifically for Indian JEE/NEET candidates. Details the PostgreSQL/Supabase table schema and RLS, App views, search Suggest autocomplete index, and user roles.
4. **`walkthrough.md`**: Highlights the transition to the simplified single-file unified video player component.
5. **`AUDIT_REPORT.md`**: Phase 2 security and codebase health audit. Warned of 19 TS strict errors (all since resolved) and debug scripts in `src/config`.
6. **`INTEGRATION.md`**: *Warning: Major Legacy Divergence*. Describes Google Cloud Functions backend and Firestore rulesets, which do not align with the actual Supabase database & Node Express server architecture.
7. **`security_spec.md`**: *Legacy Divergence*. Outlines ABAC rules and the "Dirty Dozen" payloads on Firestore. Real code enforces this via Supabase Row Level Security.
8. **`UI_UX_Recommendations.md`**: October 2023 design critique targeting micro-interactions, loading skeleton screens, mic buttons, and header simplifications.
9. **`TEST_SERIES_VERIFICATION_LOG.md`**: 40 proctored online/offline JEE/NEET test series database audits (including FIITJEE cash crisis warning notes).
10. **`auth-redirect-audit.txt`**: Supabase allowed OAuth callback redirect URLs mapping.

---

## ⚠️ Database & Backend Architecture Divergence (Contradictions)

> [!CAUTION]
> There are two major structural contradictions between the historical specifications and the actual running codebase:
>
> 1. **Firestore vs Supabase**:
>    - **Specs Claim**: `security_spec.md` and `INTEGRATION.md` document security rules using Firestore syntax (`databases/{database}/documents`, `users/{userId}`).
>    - **Actual Code**: The database is **Supabase PostgreSQL**. RLS policies are applied in SQL files (`supabase/migrations/004_rls_hardening.sql`) on real database tables like `profiles` and `watch_history`.
> 2. **Cloud Functions vs Express Backend**:
>    - **Specs Claim**: `INTEGRATION.md` outlines a serverless backend using Google Firebase Cloud Functions (`functions/src/index.ts`).
>    - **Actual Code**: The backend runs as a unified **Node/Express server** in [server.ts](file:///c:/onion.so/server.ts) and [routes/youtube.ts](file:///c:/onion.so/src/routes/youtube.ts), compiled via `esbuild` to `dist/server.cjs`.
