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

The application uses three main Zustand stores with localStorage persistence:

1. **projectStore** (`src/stores/projectStore.ts`)
   - Manages projects and their stage-specific tasks
   - Each project has a `stages` record keyed by stage ID containing `ProjectStageData` (tasks entered when project reaches that stage)
   - Key action: `moveProjectToStage(projectId, stageId)` - enforces gate logic (all tasks in current stage must be complete before advancing)
   - Tasks are instantiated from workflow templates when a project enters a stage for the first time
   - Storage key: `project-storage-v2`

2. **workflowStore** (`src/stores/workflowStore.ts`)
   - Manages the global workflow definition (stages and task templates)
   - Task templates define tasks that will be created when projects enter a stage
   - Storage key: `workflow-storage-v2`

3. **displayStore** & **filterStore**
   - Handle view settings (list/board, grouping, ordering) and filtering (stage, priority, owner, search)

### Key Architecture Patterns

**Project-Stage-Task Hierarchy:**
- Projects move through workflow stages sequentially
- Each project maintains a `stages: Record<string, ProjectStageData>` object
- When a project enters a stage, tasks are instantiated from the workflow's task templates for that stage
- Gate logic prevents advancement if incomplete tasks exist in current stage

**Stage Task Instantiation:**
- Workflow defines stages with task templates (`Stage.taskTemplates: TaskTemplate[]`)
- When `moveProjectToStage()` is called, if the project hasn't entered that stage before, tasks are created from templates
- See `projectStore.ts:69-84` for template instantiation logic

**Drag & Drop:**
- Uses `@dnd-kit/core` and `@dnd-kit/sortable` for project board interactions
- `ProjectBoard.tsx` handles drag events and calls `moveProjectToStage()` with gate validation
- Failed moves (incomplete tasks) show toast notifications

**Store Initialization:**
- `src/lib/initializeStores.ts` seeds stores with default data on first load
- Includes migration logic for data structure changes (e.g., task `name` → `title`)
- Called from `main.tsx` before React renders

**Keyboard Shortcuts:**
- Custom hook `useKeyboardShortcuts` supports both single keys and sequences
- Global shortcuts: `g+p` (projects page), `g+w` (workflow page)
- Context shortcuts: `0-4` (set priority), `n` (new project), `/` (search), `?` (help)

### Component Organization

```
components/
├── layout/          # AppShell, Header, Sidebar, LoadingScreen
├── projects/        # Project views (List, Board, Card, Detail, Filters)
├── tasks/           # Task management (TaskList, TaskItem, TaskDetail)
├── workflow/        # Workflow editor (StageCard, StageEditor)
└── ui/              # shadcn/ui components
```

### Types & Constants

- **src/lib/types.ts** - Core types: `Project`, `Task`, `Stage`, `Workflow`, `Priority` (0-4), `TaskStatus`
- **src/lib/constants.ts** - Priority labels/colors, task status labels
- Priority scale: 0=On Hold, 1=Urgent, 2=High, 3=Medium, 4=Low

### Testing

- Test files in `tests/` mirror `src/` structure
- Setup: `tests/setup.ts` (imported by `vitest.config.ts`)
- Store tests cover state mutations and persistence
- Use Vitest with jsdom environment

## Important Implementation Details

**Gate Logic (src/stores/projectStore.ts:52-107):**
When moving a project to a new stage, all tasks in the current stage must have `status: 'complete'`. If not, `moveProjectToStage` returns `false` and the UI shows an error toast.

**Task Template Pattern:**
Workflow stages define templates. When a project enters a stage, templates become actual tasks with IDs, assignees, due dates, and status tracking. Templates are read-only definitions; tasks are mutable instances.

**Path Aliases:**
`@/` resolves to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`)

**Hydration Pattern:**
App shows a loading screen for 300ms on mount to ensure Zustand persistence has hydrated from localStorage before rendering content.

## Key Files for Understanding the System

- `src/stores/projectStore.ts` - Project state and stage transition logic
- `src/stores/workflowStore.ts` - Workflow/stage/template management
- `src/lib/initializeStores.ts` - Seed data and migrations
- `src/lib/types.ts` - Type definitions
- `src/components/projects/ProjectBoard.tsx` - Board view with drag-drop
- `src/pages/Projects.tsx` - Main project page with keyboard shortcuts
