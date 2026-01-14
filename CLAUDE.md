# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React-based project management application for tracking projects through workflow stages with customizable task templates. Built with TypeScript, Vite, Zustand for state management, and shadcn/ui components.

## Development Commands

```bash
# Development server
npm run dev

# Build
npm run build

# Type checking (via build)
tsc -b

# Linting
npm run lint

# Testing
npm run test

# Preview production build
npm run preview
```

## Architecture

### State Management (Zustand with Persistence)

The application uses several Zustand stores with localStorage persistence:

1. **projectStore** (`src/stores/projectStore.ts`)
   - Manages projects and their stage-specific tasks
   - Each project has a `stages` record keyed by stage ID containing `ProjectStageData` (tasks entered when project reaches that stage)
   - Key action: `moveProjectToStage(projectId, stageId)` - enforces gate logic (all tasks in current stage must be complete before advancing)
   - Tasks are instantiated from workflow templates when a project enters a stage for the first time
   - Includes permission checks on all CRUD operations via `resolvePermissions()`
   - Storage key: `project-storage-v2`

2. **workflowStore** (`src/stores/workflowStore.ts`)
   - Manages the global workflow definition (stages and task templates)
   - Task templates define tasks that will be created when projects enter a stage
   - Storage key: `workflow-storage-v2`

3. **userStore** (`src/stores/userStore.ts`)
   - Manages users, groups, custom roles, and permission overrides
   - Handles authentication state (`currentUser`)
   - Provides role-based access control (RBAC) with group-level permission overrides
   - Used by other stores to enforce permissions via `resolvePermissions()` helper
   - Storage key: `user-storage`

4. **documentStore** (`src/stores/documentStore.ts`)
   - Manages document metadata with versioning support
   - File blobs stored in IndexedDB (via `src/lib/db.ts`), metadata in localStorage
   - Supports document status workflow: draft, review, approved, rejected
   - Features: version control, comments (document-level and location-anchored), drawings, document locking
   - Admins can bypass locks; only document owner or admin can unlock
   - Automatic image-to-PDF conversion for image uploads
   - Permission-based CRUD with cascade delete to clean up project/task attachments
   - Storage key: `document-storage-v1`

5. **designStore** (`src/stores/designStore.ts`)
   - Manages design file metadata with versioning (similar to documents)
   - File blobs stored in IndexedDB, metadata in localStorage
   - Features: version control, location-based comments, resolution tracking
   - Permission checks: only creator or admin can update/delete
   - Storage key: `design-storage`

6. **financialStore** (`src/stores/financialStore.ts`)
   - Manages financial models linked to projects (one model per project)
   - Stores inputs (capacity, PPA price, CapEx/OpEx items, financing parameters) and cached calculation results
   - Supports detailed cost line items for CapEx and OpEx with margin calculations
   - Permission checks: admins can update/delete any, users only their own models
   - Storage key: `financial-storage`

7. **componentStore** (`src/stores/componentStore.ts`)
   - Manages PV module and inverter specifications library
   - Tracks component specs (electrical, physical, temperature coefficients)
   - Links components to designs with quantities
   - Permission checks: admins can update/delete any, users only their own
   - Storage key: `component-storage`

8. **displayStore** & **filterStore** & **userFilterStore**
   - Handle view settings (list/board, grouping, ordering) and filtering (stage, priority, owner, search, user filters)

### Key Architecture Patterns

**Project-Stage-Task Hierarchy:**
- Projects move through workflow stages sequentially
- Each project maintains a `stages: Record<string, ProjectStageData>` object
- When a project enters a stage, tasks are instantiated from the workflow's task templates for that stage
- Gate logic prevents advancement if incomplete tasks exist in current stage

**Stage Task Instantiation:**
- Workflow defines stages with task templates (`Stage.taskTemplates: TaskTemplate[]`)
- When `moveProjectToStage()` is called, if the project hasn't entered that stage before, tasks are created from templates
- Template instantiation creates new tasks with unique IDs, default status, and empty assignee/dates (see `moveProjectToStage` in `projectStore.ts`)

**Drag & Drop:**
- Uses `@dnd-kit/core` and `@dnd-kit/sortable` for project board interactions
- `ProjectBoard.tsx` handles drag events and calls `moveProjectToStage()` with gate validation
- Failed moves (incomplete tasks) show toast notifications

**Store Initialization:**
- `src/lib/initializeStores.ts` seeds stores with default data on first load
- Includes migration logic for data structure changes (e.g., task `name` → `title`)
- Called from `main.tsx` before React renders

**Dual Storage Architecture (Documents & Designs):**
- Metadata stored in Zustand/localStorage for fast access and persistence
- File blobs stored in IndexedDB via Dexie (`src/lib/db.ts`) to handle large binary files
- Database schema includes: `documentVersions`, `designVersions`, `documentComments`, `designComments`, `drawings`, `workflowEvents`, `blobs`
- Utility functions: `storeBlob()`, `getBlob()`, `deleteBlob()`, `getStorageUsage()`
- Versioning: Each upload creates a new version with metadata (versionNumber, uploadedBy, uploadedAt, fileSize)
- Comments can be anchored to specific locations (x, y coordinates) or document-level

**DXF Parsing & Component Extraction:**
- DXF files (AutoCAD designs) are parsed via `src/lib/dxf/parser.ts`
- PV-specific layer detection in `src/lib/dxf/pvLayerDetection.ts` identifies panels, inverters, electrical equipment
- Component extraction (`src/lib/dxf/componentExtractor.ts`) extracts module counts, dimensions, and inverter counts from parsed DXF data
- Designs can be linked to components in the component library with quantities

**PVsyst File Import (PAN/OND):**
- PAN files (module parameters) parsed via `src/lib/pan/parser.ts`
- OND files (inverter parameters) parsed via `src/lib/ond/parser.ts`
- Extracts manufacturer, model, and full specifications from PVsyst parameter files
- Import flow: FileImportDialog → parse file → preview extracted data → ComponentDialog with prefilled specs

**Keyboard Shortcuts:**
- Custom hook `useKeyboardShortcuts` supports both single keys and sequences
- Global shortcuts: `g+p` (projects page), `g+w` (workflow page)
- Context shortcuts: `0-4` (set priority), `n` (new project), `/` (search), `?` (help)

**Permission System:**
- Role-based access control (RBAC) via `userStore` with custom roles and group overrides
- All CRUD operations in `projectStore` check permissions via `resolvePermissions()` helper
- Permission structure: `{ create, read, update, delete }` booleans per resource type
- Users must be logged in (`currentUser` set) to perform most operations
- Failed permission checks show toast error notifications
- See `src/lib/permissions/permissionResolver.ts` for resolution logic

### Component Organization

```
components/
├── layout/          # AppShell, Header, Sidebar, LoadingScreen
├── projects/        # Project views (List, Board, Card, Detail, Filters)
├── tasks/           # Task management (TaskList, TaskItem, TaskDetail)
├── workflow/        # Workflow editor (StageCard, StageEditor)
├── documents/       # Document viewer, upload, comments, version control
├── designs/         # Design viewer, upload, comments, version control
├── components/      # PV component library (ComponentDialog, FileImportDialog)
├── financials/      # Financial model editor, charts, reports
└── ui/              # shadcn/ui components
```

### Types & Constants

- **src/lib/types.ts** - Core types: `Project`, `Task`, `Stage`, `Workflow`, `Priority` (0-4), `TaskStatus`, `Document`, `Design`
- **src/lib/types/document.ts** - Document types: `DocumentVersion`, `DocumentComment`, `Drawing`, `WorkflowEvent`, `LocationAnchor`, `DocumentStatus`
- **src/lib/types/financial.ts** - Financial types: `FinancialModel`, `FinancialInputs`, `ProjectResults`, `CostLineItem`
- **src/lib/types/component.ts** - Component types: `Component`, `ModuleSpecs`, `InverterSpecs`, `DesignUsage`
- **src/lib/constants.ts** - Priority labels/colors, task status labels
- Priority scale: 0=On Hold, 1=Urgent, 2=High, 3=Medium, 4=Low
- Document statuses: `draft`, `review`, `approved`, `rejected`

### Testing

- Test files in `tests/` mirror `src/` structure (e.g., `tests/stores/projectStore.test.ts` mirrors `src/stores/projectStore.ts`)
- Setup: `tests/setup.ts` (imported via `vite.config.ts` test configuration)
- Store tests cover state mutations and persistence
- Uses Vitest with jsdom environment and globals enabled
- Test configuration is in `vite.config.ts` under the `test` property (not a separate vitest config file)

## Important Implementation Details

**Gate Logic:**
When moving a project to a new stage via `moveProjectToStage()`, all tasks in the current stage must have `status: 'complete'`. If not, the function returns `false` and the UI shows an error toast. This ensures projects cannot skip stages or advance with incomplete work.

**Task Template Pattern:**
Workflow stages define templates. When a project enters a stage, templates become actual tasks with IDs, assignees, due dates, and status tracking. Templates are read-only definitions; tasks are mutable instances.

**Document Locking:**
Documents can be locked by users to prevent concurrent edits. Only the user who locked the document or an admin can unlock it. Admins can upload new versions to locked documents, but other users cannot.

**Path Aliases:**
`@/` resolves to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`)

**Hydration Pattern:**
App shows a loading screen for 300ms on mount to ensure Zustand persistence has hydrated from localStorage before rendering content.

## Key Files for Understanding the System

- `src/stores/projectStore.ts` - Project state, stage transition logic, and permission checks
- `src/stores/workflowStore.ts` - Workflow/stage/template management
- `src/stores/userStore.ts` - User/group/role management and authentication
- `src/stores/documentStore.ts` - Document versioning, comments, locking, and permissions
- `src/stores/designStore.ts` - Design versioning and comments
- `src/lib/db.ts` - IndexedDB schema and blob storage utilities (Dexie)
- `src/lib/permissions/permissionResolver.ts` - RBAC permission resolution logic
- `src/lib/permissions/documentPermissions.ts` - Document-specific permission logic
- `src/lib/initializeStores.ts` - Seed data and migrations
- `src/lib/types.ts` - Type definitions
- `src/components/projects/ProjectBoard.tsx` - Board view with drag-drop
- `src/pages/Projects.tsx` - Main project page with keyboard shortcuts
- `src/pages/DocumentViewerPage.tsx` - Document viewer with annotations
- `src/pages/DesignDetailPage.tsx` - Design viewer with comments
- `src/stores/financialStore.ts` - Financial model state and calculations
- `src/stores/componentStore.ts` - PV module and inverter library
- `src/lib/types/financial.ts` - Financial types and defaults
- `src/lib/types/component.ts` - Module and inverter spec types
- `src/lib/dxf/componentExtractor.ts` - Extract component data from DXF designs
- `src/lib/pan/parser.ts` - PVsyst PAN file parser (modules)
- `src/lib/ond/parser.ts` - PVsyst OND file parser (inverters)
- `vite.config.ts` - Vite and Vitest configuration with path aliases
