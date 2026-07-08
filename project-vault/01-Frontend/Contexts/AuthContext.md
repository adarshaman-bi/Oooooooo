# AuthContext 🧱

- **File Path**: `src/context/AuthContext.tsx`
- **Type**: Component
- **Status**: Stable
- **Relations**: [[Vault-MOC]], [[Full-File-Inventory]]

---

## 📋 Purpose
Safely read and parse a JSON value from localStorage. Returns `fallback` on any error.

---

## 🔌 Key Exports / Props
- `AuthProvider`
- `useAuth`

---

## 🔗 Dependency Map
- **Imports**: [[supabaseClient]], [[dbService]], [[types]], [[constants]], [[security]]
- **Imported By**: [[App]], [[AuthModal]], [[ChannelProfile]], [[DetailsModal]], [[Header]], [[LectureDetailView]], [[ModeratorDashboard]], [[NotificationsDashboard]], [[OnboardingWizard]], [[ProfileDashboard]], [[VideoLibrary]], [[BatchManager]], [[BlockBuilder]], [[InstituteManager]], [[ReviewModerator]], [[TeacherManager]], [[TestSeriesConsole]], [[TeacherPage]]
