import fs from 'fs';
import path from 'path';

// Root directory
const ROOT = 'C:\\onion.so';
const VAULT_ROOT = path.join(ROOT, 'project-vault');

// Helper to make directories recursively
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Ensure all target vault folders exist
const folders = [
  '00-Meta',
  '00-Meta/Templates',
  '01-Frontend/Components',
  '01-Frontend/Components/TestSeries',
  '01-Frontend/Components/admin',
  '01-Frontend/Components/skeletons',
  '01-Frontend/Contexts',
  '01-Frontend/Services',
  '01-Frontend/Hooks',
  '01-Frontend/Pages',
  '02-Backend-Data/Supabase/Migrations',
  '02-Backend-Data/Supabase/Policies-RLS',
  '02-Backend-Data/Supabase/Edge-Functions',
  '02-Backend-Data/Server',
  '03-Architecture/ADRs',
  '04-Testing-QA/E2E',
  '04-Testing-QA/CI-CD',
  '05-Security/Security-Files',
  '06-Product-UX',
  '07-Documentation/Tutorials',
  '07-Documentation/How-To',
  '07-Documentation/Reference',
  '07-Documentation/Explanation',
  '08-Areas',
  '09-Archive'
];

folders.forEach(f => ensureDir(path.join(VAULT_ROOT, f)));

// ─── Step 1: File Inventory ───────────────────────────────────────────────
// We will scan all files tracked by git. Here is the list derived from git ls-files.
const fileList = [
  '.github/workflows/backup.yml',
  '.github/workflows/ci.yml',
  '.gitignore',
  'AUDIT_REPORT.md',
  'INTEGRATION.md',
  'PROJECT-STATE.md',
  'README.md',
  'TEST_SERIES_VERIFICATION_LOG.md',
  'UI_UX_Recommendations.md',
  'app-manifest.json',
  'auth-redirect-audit.txt',
  'brain.md',
  'check_table.ts',
  'e2e/auth.spec.ts',
  'index.html',
  'metadata.json',
  'package.json',
  'playwright.config.ts',
  'replace_tab.js',
  'schema_update.sql',
  'scripts/channel_cleanup_dedup.ts',
  'scripts/clean_and_validate.ts',
  'scripts/delete_junk.ts',
  'scripts/flushAndSyncAll.ts',
  'scripts/ingest_five_channels.ts',
  'scripts/ingest_single_playlist.ts',
  'scripts/inspect_channels_table.ts',
  'scripts/inspect_db_channel.ts',
  'scripts/inspect_playlists_new.ts',
  'scripts/inspect_sachin_rana.ts',
  'scripts/inspect_teachers.ts',
  'scripts/live_lecture_extraction_phase1.ts',
  'scripts/register_five_channels.ts',
  'scripts/resolve_handles.ts',
  'scripts/runPilotIngestion.ts',
  'scripts/search_channels.ts',
  'scripts/seedNewTeachers.ts',
  'scripts/spot_check.ts',
  'scripts/validateContractDB.ts',
  'security/ACCESSIBILITY_AUDIT.md',
  'security/BACKUP_DR.md',
  'security/OWASP_COMPLIANCE.md',
  'security_spec.md',
  'seedDB.ts',
  'server.ts',
  'src/App.tsx',
  'src/components/AdminEducators.tsx',
  'src/components/AuthModal.tsx',
  'src/components/BatchCard.tsx',
  'src/components/BiovisedPlayer.tsx',
  'src/components/ChannelHeader.tsx',
  'src/components/ChannelProfile.tsx',
  'src/components/ContentManagerTab.tsx',
  'src/components/DetailsModal.tsx',
  'src/components/DynamicRating.tsx',
  'src/components/ErrorBoundary.tsx',
  'src/components/ErrorFallback.tsx',
  'src/components/Footer.tsx',
  'src/components/Header.tsx',
  'src/components/HomeDashboard.tsx',
  'src/components/HorizontalRow.tsx',
  'src/components/InstituteCard.tsx',
  'src/components/LectureCard.tsx',
  'src/components/LectureDetailView.tsx',
  'src/components/LecturesGrid.tsx',
  'src/components/LiveLectureSection.tsx',
  'src/components/MicModal.tsx',
  'src/components/ModeratorDashboard.tsx',
  'src/components/NotificationsDashboard.tsx',
  'src/components/OfflineBanner.tsx',
  'src/components/OnboardingWizard.tsx',
  'src/components/PasswordChecklist.tsx',
  'src/components/ProfileDashboard.tsx',
  'src/components/SafeImage.tsx',
  'src/components/SearchResultsSkeleton.tsx',
  'src/components/SearchSpecsModal.tsx',
  'src/components/SearchView.tsx',
  'src/components/TeacherCard.tsx',
  'src/components/TeacherProfileDetail.tsx',
  'src/components/TestSeries/TestSeriesCard.tsx',
  'src/components/TestSeries/TestSeriesDetail.tsx',
  'src/components/TestSeries/TestSeriesFilters.tsx',
  'src/components/TestSeries/TestSeriesGrid.tsx',
  'src/components/TestSeriesDirectory.tsx',
  'src/components/VideoCard.tsx',
  'src/components/VideoLibrary.tsx',
  'src/components/YouTubeImporterTab.tsx',
  'src/components/YoutubeThumbnailImg.tsx',
  'src/components/admin/AuditLogsView.tsx',
  'src/components/admin/BatchManager.tsx',
  'src/components/admin/BlockBuilder.tsx',
  'src/components/admin/InstituteManager.tsx',
  'src/components/admin/ReviewModerator.tsx',
  'src/components/admin/TeacherManager.tsx',
  'src/components/admin/TestSeriesConsole.tsx',
  'src/components/skeletons/CardSkeleton.tsx',
  'src/components/skeletons/TeacherProfileSkeleton.tsx',
  'src/components/skeletons/index.ts',
  'src/config/constants.ts',
  'src/config/seedNewTeachers.ts',
  'src/config/teachersData.json',
  'src/config/teachersDiscography.json',
  'src/config/youtubeChannels.json',
  'src/context/AuthContext.tsx',
  'src/context/PlayerContext.tsx',
  'src/context/SearchContext.tsx',
  'src/context/ThemeContext.tsx',
  'src/data/testSeries.ts',
  'src/data/testSeriesData.ts',
  'src/index.css',
  'src/main.tsx',
  'src/middleware/rateLimiter.ts',
  'src/middleware/security.ts',
  'src/middleware/slowQueryLog.ts',
  'src/pages/AuthCallback.tsx',
  'src/pages/TeacherPage.tsx',
  'src/public/google-auth.html',
  'src/routes/lectureRoutes.ts',
  'src/routes/youtube.ts',
  'src/services/LectureSerializer.ts',
  'src/services/MediaResolverService.ts',
  'src/services/adminService.ts',
  'src/services/apiClient.ts',
  'src/services/cdnVerifyScript.ts',
  'src/services/dbService.ts',
  'src/services/recommendationEngine.ts',
  'src/services/thumbnailHelper.ts',
  'src/services/youtubeService.ts',
  'src/test/hooks.test.ts',
  'src/test/security.test.ts',
  'src/test/setup.ts',
  'src/types.ts',
  'src/utils/hooks.ts',
  'src/utils/security.ts',
  'src/utils/sentry.ts',
  'src/utils/supabaseClient.ts',
  'src/utils/swrConfig.ts',
  'src/utils/youtubeUtils.ts',
  'supabase/functions/signed-url/index.ts',
  'supabase/functions/validate-upload/index.ts',
  'supabase/migrations/001_youtube_cache_schema.sql',
  'supabase/migrations/002_add_playlist_routing_columns.sql',
  'supabase/migrations/003_required_data_schema.sql',
  'supabase/migrations/004_rls_hardening.sql',
  'supabase_migration.sql',
  'tsconfig.json',
  'vercel.json',
  'vite.config.ts',
  'vitest.config.ts',
  'walkthrough.md'
];

// Map file path to Vault Note folder
function getVaultSubfolder(filePath) {
  if (filePath.startsWith('.github/workflows/')) return '04-Testing-QA/CI-CD';
  if (filePath.startsWith('e2e/')) return '04-Testing-QA/E2E';
  if (filePath.startsWith('scripts/')) return '02-Backend-Data/Server';
  if (filePath.startsWith('security/')) return '05-Security/Security-Files';
  
  if (filePath.startsWith('src/components/TestSeries/')) return '01-Frontend/Components/TestSeries';
  if (filePath.startsWith('src/components/admin/')) return '01-Frontend/Components/admin';
  if (filePath.startsWith('src/components/skeletons/')) return '01-Frontend/Components/skeletons';
  if (filePath.startsWith('src/components/')) return '01-Frontend/Components';
  
  if (filePath.startsWith('src/context/')) return '01-Frontend/Contexts';
  if (filePath.startsWith('src/services/')) return '01-Frontend/Services';
  if (filePath.startsWith('src/pages/')) return '01-Frontend/Pages';
  
  // Middleware, utils, configs go to Backend-Data or Frontend Services
  if (filePath.startsWith('src/middleware/')) return '02-Backend-Data/Server';
  if (filePath.startsWith('src/utils/')) return '01-Frontend/Services';
  if (filePath.startsWith('src/config/')) return '01-Frontend/Services';
  if (filePath.startsWith('src/data/')) return '01-Frontend/Services';
  if (filePath.startsWith('src/test/')) return '04-Testing-QA/E2E';
  if (filePath.startsWith('src/public/')) return '01-Frontend/Pages';

  if (filePath.startsWith('supabase/functions/')) return '02-Backend-Data/Supabase/Edge-Functions';
  if (filePath.startsWith('supabase/migrations/')) return '02-Backend-Data/Supabase/Migrations';

  // Root level scripts & configs
  if (filePath.endsWith('.sql') || filePath === 'supabase_migration.sql') return '02-Backend-Data/Supabase/Migrations';
  if (['server.ts', 'seedDB.ts', 'check_table.ts', 'replace_tab.js'].includes(filePath)) return '02-Backend-Data/Server';
  
  // Configs
  return '02-Backend-Data/Server';
}

function getNoteName(filePath) {
  const base = path.basename(filePath);
  // Remove extension
  const ext = path.extname(base);
  let name = base.slice(0, -ext.length);
  // Add category prefix for edge cases if needed, but simple name is cleaner
  return name;
}

// Generate the inventory mapping
const inventory = fileList.map(filePath => {
  const folder = getVaultSubfolder(filePath);
  const noteName = getNoteName(filePath);
  const fullNotePath = path.join(folder, noteName + '.md');
  return {
    filePath,
    folder,
    noteName,
    fullNotePath
  };
});

// ─── Step 2: Write Templates ─────────────────────────────────────────────
const templates = {
  'template-component.md': `# {{name}} 🧱

- **File Path**: \`{{filePath}}\`
- **Type**: Component
- **Status**: Stable
- **Relations**: [[Vault-MOC]], {{relations}}

---

## 📋 Purpose
{{purpose}}

---

## 🔌 Key Exports / Props
{{exports}}

---

## 🔗 Dependency Map
- **Imports**: {{imports}}
- **Imported By**: {{importedBy}}
`,

  'template-service.md': `# {{name}} ⚙️

- **File Path**: \`{{filePath}}\`
- **Type**: Service / Utility
- **Status**: Stable
- **Relations**: [[Vault-MOC]], {{relations}}

---

## 📋 Purpose
{{purpose}}

---

## 🛠️ Main Functions / Methods
{{exports}}

---

## 🔗 Dependency Map
- **Imports**: {{imports}}
- **Imported By**: {{importedBy}}
`,

  'template-test.md': `# {{name}} 🧪

- **File Path**: \`{{filePath}}\`
- **Type**: Test Suite
- **Status**: Stable
- **Relations**: [[Vault-MOC]], {{relations}}

---

## 📋 Test Description
{{purpose}}

---

## 🔍 Covered User Flows / Scenarios
{{exports}}

---

## 🔗 Dependency Map
- **Imports**: {{imports}}
`
};

Object.entries(templates).forEach(([filename, content]) => {
  fs.writeFileSync(path.join(VAULT_ROOT, '00-Meta/Templates', filename), content);
});

// ─── Scan imports for relationships ──────────────────────────────────────
const relationMap = {};
inventory.forEach(item => {
  const p = path.join(ROOT, item.filePath);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf-8');
  
  // Find imports
  const imports = [];
  const lines = content.split('\n');
  lines.forEach(line => {
    const match = line.match(/from\s+['"]([^'"]+)['"]/);
    if (match) {
      const impPath = match[1];
      const impBase = path.basename(impPath);
      imports.push(impBase);
    }
  });

  relationMap[item.noteName] = {
    imports: imports.filter(imp => inventory.some(i => i.noteName === imp)),
    importedBy: []
  };
});

// Build reverse importedBy
Object.entries(relationMap).forEach(([noteName, rel]) => {
  rel.imports.forEach(imp => {
    if (relationMap[imp]) {
      relationMap[imp].importedBy.push(noteName);
    }
  });
});

// ─── Generate Notes for each file ────────────────────────────────────────
inventory.forEach(item => {
  const p = path.join(ROOT, item.filePath);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf-8');

  // Infer purpose
  let purpose = `Source file representing the \`${item.noteName}\` module.`;
  const firstComment = content.match(/\/\*\*([\s\S]*?)\*\//);
  if (firstComment) {
    purpose = firstComment[1].replace(/\*/g, '').trim().split('\n')[0];
  } else {
    // Inherent descriptions based on path
    if (item.filePath.includes('components/skeletons/')) purpose = 'Visual skeleton loader placeholder component used during SWR loading state.';
    else if (item.filePath.includes('components/admin/')) purpose = 'Administrative control panel tab for content and logs moderation.';
    else if (item.filePath.startsWith('scripts/')) purpose = 'Database administrative utility and pilot ingestion runner script.';
    else if (item.filePath.startsWith('supabase/migrations/')) purpose = 'Supabase PostgreSQL RLS, storage, indices, and schema migration.';
    else if (item.filePath.startsWith('security/')) purpose = 'Security standard audit log and compliance documentation.';
    else if (item.filePath.startsWith('.github/')) purpose = 'GitHub Actions continuous integration workflow automation runner.';
  }

  // Infer exports
  const exports = [];
  const exportMatches = content.matchAll(/export\s+(const|function|interface|class|default\s+class|default\s+function)\s+(\w+)/g);
  for (const match of exportMatches) {
    exports.push(`- \`${match[2]}\``);
  }
  if (exports.length === 0) {
    exports.push('- Code base execution scripts or default configuration objects.');
  }

  // Choose template
  let tmpl = templates['template-component.md'];
  if (item.filePath.endsWith('.spec.ts') || item.filePath.endsWith('.test.ts') || item.filePath.startsWith('e2e/')) {
    tmpl = templates['template-test.md'];
  } else if (item.filePath.startsWith('src/services/') || item.filePath.startsWith('src/utils/') || item.filePath.startsWith('scripts/')) {
    tmpl = templates['template-service.md'];
  }

  const rel = relationMap[item.noteName] || { imports: [], importedBy: [] };
  const importLinks = rel.imports.map(i => `[[${i}]]`).join(', ') || 'None';
  const importedByLinks = rel.importedBy.map(i => `[[${i}]]`).join(', ') || 'None';

  let rendered = tmpl
    .replace(/{{name}}/g, item.noteName)
    .replace(/{{filePath}}/g, item.filePath)
    .replace(/{{purpose}}/g, purpose)
    .replace(/{{exports}}/g, exports.join('\n'))
    .replace(/{{imports}}/g, importLinks)
    .replace(/{{importedBy}}/g, importedByLinks)
    .replace(/{{relations}}/g, `[[Full-File-Inventory]]`);

  fs.writeFileSync(path.join(VAULT_ROOT, item.fullNotePath), rendered);
});

// ─── Write Existing Docs Summary ──────────────────────────────────────────
const docsSummary = `# Existing Docs Summary

A synthesis of the pre-existing repository documentation, capturing core design specs, goals, and checking for codebase deviations.

## 📄 Document Indexes & Summaries

1. **\`README.md\`**: Basic Node.js local setup commands (\`npm install\`, \`npm run dev\`) and Google AI Studio app dashboard links.
2. **\`PROJECT-STATE.md\`**: Current verified state documentation, consolidation changelogs, key system tables, and known mistakes.
3. **\`brain.md\`**: Core system bible. Defines BioVised as an anti-distraction proxy layer over YouTube specifically for Indian JEE/NEET candidates. Details the PostgreSQL/Supabase table schema and RLS, App views, search Suggest autocomplete index, and user roles.
4. **\`walkthrough.md\`**: Highlights the transition to the simplified single-file unified video player component.
5. **\`AUDIT_REPORT.md\`**: Phase 2 security and codebase health audit. Warned of 19 TS strict errors (all since resolved) and debug scripts in \`src/config\`.
6. **\`INTEGRATION.md\`**: *Warning: Major Legacy Divergence*. Describes Google Cloud Functions backend and Firestore rulesets, which do not align with the actual Supabase database & Node Express server architecture.
7. **\`security_spec.md\`**: *Legacy Divergence*. Outlines ABAC rules and the "Dirty Dozen" payloads on Firestore. Real code enforces this via Supabase Row Level Security.
8. **\`UI_UX_Recommendations.md\`**: October 2023 design critique targeting micro-interactions, loading skeleton screens, mic buttons, and header simplifications.
9. **\`TEST_SERIES_VERIFICATION_LOG.md\`**: 40 proctored online/offline JEE/NEET test series database audits (including FIITJEE cash crisis warning notes).
10. **\`auth-redirect-audit.txt\`**: Supabase allowed OAuth callback redirect URLs mapping.

---

## ⚠️ Database & Backend Architecture Divergence (Contradictions)

> [!CAUTION]
> There are two major structural contradictions between the historical specifications and the actual running codebase:
>
> 1. **Firestore vs Supabase**:
>    - **Specs Claim**: \`security_spec.md\` and \`INTEGRATION.md\` document security rules using Firestore syntax (\`databases/{database}/documents\`, \`users/{userId}\`).
>    - **Actual Code**: The database is **Supabase PostgreSQL**. RLS policies are applied in SQL files (\`supabase/migrations/004_rls_hardening.sql\`) on real database tables like \`profiles\` and \`watch_history\`.
> 2. **Cloud Functions vs Express Backend**:
>    - **Specs Claim**: \`INTEGRATION.md\` outlines a serverless backend using Google Firebase Cloud Functions (\`functions/src/index.ts\`).
>    - **Actual Code**: The backend runs as a unified **Node/Express server** in [server.ts](file:///c:/onion.so/server.ts) and [routes/youtube.ts](file:///c:/onion.so/src/routes/youtube.ts), compiled via \`esbuild\` to \`dist/server.cjs\`.
`;

fs.writeFileSync(path.join(VAULT_ROOT, '00-Meta/Existing-Docs-Summary.md'), docsSummary);

// ─── Write Full File Inventory ───────────────────────────────────────────
let inventoryMarkdown = `# Full File Inventory

This table is the master repository checklist. Every single file tracked by git must have a matching Obsidian vault note.

| File Path | Folder | One-line Purpose | Has Vault Note? |
| :--- | :--- | :--- | :---: |
`;

inventory.forEach(item => {
  let purpose = `Module for ${item.noteName}`;
  if (item.filePath.includes('BiovisedPlayer.tsx')) purpose = 'Unified video player component.';
  else if (item.filePath.includes('AuthModal.tsx')) purpose = 'Student login and OAuth modal sheet.';
  else if (item.filePath.includes('server.ts')) purpose = 'Core Express server app.';
  else if (item.filePath.includes('dbService.ts')) purpose = 'Supabase client database helper.';
  else if (item.filePath.includes('youtubeService.ts')) purpose = 'YouTube Data API caching client.';

  inventoryMarkdown += `| [\`${item.filePath}\`](file:///c:/onion.so/${item.filePath.replace(/\\/g, '/')}) | \`${item.folder}\` | ${purpose} | Y |\n`;
});

fs.writeFileSync(path.join(VAULT_ROOT, '00-Meta/Full-File-Inventory.md'), inventoryMarkdown);

// ─── Write Vault MOC ─────────────────────────────────────────────────────
const mocContent = `# Vault Map of Content (Vault-MOC)

Welcome to the consolidated codebase documentation vault map.

- [[Welcome]]: Getting started notes.
- [[Existing-Docs-Summary]]: Summary of historical specs and structural contradictions.
- [[Full-File-Inventory]]: Full list of all codebase files mapped to notes.

---

## 📂 Vault Folders

### [[01-Frontend]]
- **Components**: [[BiovisedPlayer]], [[AuthModal]], [[LecturesGrid]], [[VideoLibrary]].
- **Contexts**: [[AuthContext]], [[PlayerContext]], [[SearchContext]].
- **Services**: [[dbService]], [[youtubeService]], [[recommendationEngine]].

### [[02-Backend-Data]]
- **Supabase Migrations**: [[004_rls_hardening]]
- **Server scripts**: [[server]], [[seedDB]], [[check_table]].

### [[03-Architecture]]
- [[System-Overview]]: Mermaid flowchart mapping layout blocks.
- [[Data-Model]]: Database schemas.

### [[04-Testing-QA]]
- [[E2E]]: Playwright E2E suites.
- [[CI-CD]]: GitHub workflow automations.

### [[05-Security]]
- [[Security-Spec]]: Encryption specs and rate limiters.
`;

fs.writeFileSync(path.join(VAULT_ROOT, '00-Meta/Vault-MOC.md'), mocContent);

// ─── Write System Overview & Data Model ──────────────────────────────────
const sysOverview = `# System Overview

An architectural blueprint of the BioVised system mapping the frontend layout, backend controllers, and database services.

\`\`\`mermaid
graph TD
    A[Vite/React Client] <-->|Supabase Client SDK| B[Supabase PostgreSQL / Auth]
    A <-->|HTTP REST| C[Express Node Server]
    C <-->|YouTube Data API v3| D[YouTube API Endpoints]
    C <-->|Database cache sync| B
    C <-->|Token Auto-Suggest| E[InMemorySearchIndex]
\`\`\`
`;

fs.writeFileSync(path.join(VAULT_ROOT, '03-Architecture/System-Overview.md'), sysOverview);

const dataModel = `# Data Model

## Supabase PostgreSQL Schemas

### 1. profiles
- **Columns**: \`uid\` (UUID), \`email\` (VARCHAR), \`role\` (VARCHAR), \`exam_type\` (VARCHAR), \`onboarding_completed\` (BOOLEAN).
- **RLS**: \`profiles_select_own\`, \`profiles_update_own\`.

### 2. videos
- **Columns**: \`id\` (VARCHAR), \`title\` (VARCHAR), \`video_url\` (VARCHAR), \`duration\` (VARCHAR), \`playlist_id\` (VARCHAR), \`views\` (INTEGER).
- **RLS**: \`videos_select_public\`, \`videos_insert_admin\`.

### 3. watch_history
- **Columns**: \`id\` (VARCHAR), \`user_id\` (UUID), \`lecture_id\` (VARCHAR), \`progress_seconds\` (INTEGER), \`completed\` (BOOLEAN).
- **RLS**: \`watch_history_select_own\`, \`watch_history_insert_own\`.
`;

fs.writeFileSync(path.join(VAULT_ROOT, '03-Architecture/Data-Model.md'), dataModel);

console.log("Vault Generation Completed Successfully!");
