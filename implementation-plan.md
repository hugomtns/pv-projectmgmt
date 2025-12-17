# PV Project Workflow Prototype — Implementation Plan

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Vite + React 18 | Fast dev server, no SSR needed |
| Language | TypeScript (strict) | Type safety, better DX |
| Styling | Tailwind CSS | Utility-first, pairs with shadcn |
| UI Components | shadcn/ui | Copy-paste primitives, consistent dark theme |
| State | Zustand + persist middleware | Lightweight, built-in localStorage sync |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | Modern, accessible, shadcn-compatible |
| Forms | React Hook Form + Zod | Validation, controlled inputs |
| Icons | Lucide React | Ships with shadcn |
| Testing | Vitest + React Testing Library | Fast, Jest-compatible API |
| Date handling | date-fns | Lightweight, tree-shakeable |

---

## Project Structure

```
pv-workflow-prototype/
├── src/
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── AppShell.tsx
│   │   ├── projects/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectBoard.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectRow.tsx
│   │   │   ├── ProjectDetail.tsx
│   │   │   ├── CreateProjectDialog.tsx
│   │   │   └── PriorityBadge.tsx
│   │   ├── workflow/
│   │   │   ├── WorkflowBuilder.tsx
│   │   │   ├── StageCard.tsx
│   │   │   └── TaskTemplateEditor.tsx
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   └── CommentThread.tsx
│   │   ├── filters/
│   │   │   ├── FilterBar.tsx
│   │   │   ├── FilterPopover.tsx
│   │   │   └── SearchInput.tsx
│   │   └── display/
│   │       ├── DisplayPopover.tsx
│   │       └── PropertyToggle.tsx
│   ├── stores/
│   │   ├── workflowStore.ts
│   │   ├── projectStore.ts
│   │   ├── displayStore.ts
│   │   └── filterStore.ts
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts
│   │   ├── useProjectFilters.ts
│   │   └── useGateCheck.ts
│   ├── lib/
│   │   ├── utils.ts             # cn() helper, etc.
│   │   ├── constants.ts         # priorities, default workflow
│   │   └── types.ts             # shared TypeScript types
│   ├── data/
│   │   └── seedData.ts          # default workflow + mock projects
│   ├── pages/
│   │   ├── Projects.tsx
│   │   └── WorkflowSettings.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/
│   ├── components/
│   ├── stores/
│   └── setup.ts
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Data Types

```typescript
// lib/types.ts

export type Priority = 0 | 1 | 2 | 3 | 4;
// 0 = On Hold, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low

export type TaskStatus = 'not_started' | 'in_progress' | 'complete';

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string; // ISO timestamp
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  dueDate: string | null;
  status: TaskStatus;
  comments: Comment[];
}

export interface TaskTemplate {
  id: string;
  title: string;
  description: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
  taskTemplates: TaskTemplate[];
}

export interface Workflow {
  stages: Stage[];
}

export interface ProjectStageData {
  enteredAt: string;
  tasks: Task[];
}

export interface Project {
  id: string;
  name: string;
  location: string;
  priority: Priority;
  owner: string;
  currentStageId: string;
  createdAt: string;
  updatedAt: string;
  stages: Record<string, ProjectStageData>;
}

export type ViewType = 'list' | 'board';
export type GroupingOption = 'none' | 'stage' | 'priority' | 'owner';
export type BoardColumns = 'stage' | 'priority';
export type BoardRows = 'none' | 'priority' | 'owner';

export interface ListDisplaySettings {
  grouping: GroupingOption;
  ordering: { field: string; direction: 'asc' | 'desc' };
  showEmptyGroups: boolean;
  properties: string[];
}

export interface BoardDisplaySettings {
  columns: BoardColumns;
  rows: BoardRows;
  ordering: { field: string; direction: 'asc' | 'desc' };
  showEmptyColumns: boolean;
  properties: string[];
}

export interface DisplaySettings {
  view: ViewType;
  list: ListDisplaySettings;
  board: BoardDisplaySettings;
}

export interface Filters {
  stages: string[];
  priorities: Priority[];
  owner: string;
  search: string;
}
```

---

## Zustand Stores

### workflowStore.ts
```typescript
interface WorkflowState {
  workflow: Workflow;
  // Actions
  addStage: (stage: Omit<Stage, 'id'>) => void;
  updateStage: (id: string, updates: Partial<Stage>) => void;
  removeStage: (id: string) => void;
  reorderStages: (fromIndex: number, toIndex: number) => void;
  addTaskTemplate: (stageId: string, template: Omit<TaskTemplate, 'id'>) => void;
  updateTaskTemplate: (stageId: string, templateId: string, updates: Partial<TaskTemplate>) => void;
  removeTaskTemplate: (stageId: string, templateId: string) => void;
  resetToDefault: () => void;
}
```

### projectStore.ts
```typescript
interface ProjectState {
  projects: Project[];
  selectedProjectId: string | null;
  // Actions
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stages'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  moveProjectToStage: (projectId: string, stageId: string) => boolean; // returns false if gate blocks
  // Task actions
  addTask: (projectId: string, stageId: string, task: Omit<Task, 'id'>) => void;
  updateTask: (projectId: string, stageId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (projectId: string, stageId: string, taskId: string) => void;
  addComment: (projectId: string, stageId: string, taskId: string, comment: Omit<Comment, 'id' | 'createdAt'>) => void;
  // Selection
  selectProject: (id: string | null) => void;
}
```

### displayStore.ts
```typescript
interface DisplayState {
  settings: DisplaySettings;
  // Actions
  setView: (view: ViewType) => void;
  updateListSettings: (updates: Partial<ListDisplaySettings>) => void;
  updateBoardSettings: (updates: Partial<BoardDisplaySettings>) => void;
  toggleProperty: (property: string) => void;
}
```

### filterStore.ts
```typescript
interface FilterState {
  filters: Filters;
  // Actions
  setStageFilter: (stages: string[]) => void;
  setPriorityFilter: (priorities: Priority[]) => void;
  setOwnerFilter: (owner: string) => void;
  setSearch: (search: string) => void;
  clearFilters: () => void;
}
```

---

## Implementation Phases

### Phase 0: Project Setup
**Effort:** ~1 hour

**Stories:**
1. **P0-1: Initialize Vite project**
   - `npm create vite@latest pv-workflow-prototype -- --template react-ts`
   - Configure `tsconfig.json` with strict mode
   - Set up path aliases (`@/`)

2. **P0-2: Install and configure Tailwind**
   - Install Tailwind, PostCSS, autoprefixer
   - Configure dark theme as default
   - Set up CSS variables for theme tokens

3. **P0-3: Initialize shadcn/ui**
   - Run `npx shadcn@latest init`
   - Select dark theme, zinc base color
   - Install initial components: Button, Dialog, Popover, DropdownMenu, Input, Badge, Checkbox, Tabs, Sheet, Command, Tooltip, Table

4. **P0-4: Set up Zustand stores (empty shells)**
   - Create store files with initial types
   - Configure persist middleware with localStorage

5. **P0-5: Set up testing infrastructure**
   - Install Vitest, @testing-library/react, jsdom
   - Create test setup file
   - Add test script to package.json

**Acceptance:** Project runs with `npm run dev`, empty dark-themed page renders.

---

### Phase 1: Core Data & Seed Data
**Effort:** ~2 hours

**Stories:**
1. **P1-1: Implement workflowStore**
   - Full CRUD for stages and task templates
   - Persist to localStorage
   - Unit tests for all actions

2. **P1-2: Implement projectStore**
   - Full CRUD for projects
   - Task management within projects
   - Gate check logic (all tasks complete before advancing)
   - Unit tests for gate logic

3. **P1-3: Create seed data**
   - Default 8-stage PV workflow with task templates
   - 4-6 mock projects at various stages
   - Auto-seed on first load (check localStorage empty)

4. **P1-4: Implement displayStore and filterStore**
   - Default display settings
   - Filter state management
   - Persist display settings only (not filters)

**Acceptance:** Stores work correctly, seed data loads on fresh browser, data persists across refresh.

---

### Phase 2: App Shell & Navigation
**Effort:** ~2 hours

**Stories:**
1. **P2-1: Build AppShell layout**
   - Sidebar (collapsible) + main content area
   - Dark theme styling
   - Responsive breakpoints

2. **P2-2: Build Sidebar navigation**
   - Projects link (active state)
   - Workflow Settings link
   - Logo/brand placeholder

3. **P2-3: Implement routing**
   - React Router (or simple state-based routing)
   - `/` → Projects
   - `/workflow` → Workflow Settings

4. **P2-4: Build Header component**
   - Page title
   - Slot for filter bar and display popover

**Acceptance:** Can navigate between Projects and Workflow Settings pages, layout renders correctly.

---

### Phase 3: Project List View
**Effort:** ~4 hours

**Stories:**
1. **P3-1: Build ProjectList component**
   - Fetch projects from store
   - Apply filters and sorting
   - Render table structure

2. **P3-2: Build ProjectRow component**
   - Display: name, stage badge, priority, owner, location, updated, task progress
   - Click to select (opens detail)
   - Hover states

3. **P3-3: Build PriorityBadge component**
   - Icon + color for each priority level
   - Inline dropdown on click to change priority
   - Keyboard shortcut support (0-4)

4. **P3-4: Implement grouping**
   - Group by none/stage/priority/owner
   - Collapsible group headers
   - Show/hide empty groups toggle

5. **P3-5: Implement sorting**
   - Sort by name, priority, updated
   - Ascending/descending toggle
   - Click column header to sort

**Acceptance:** List view displays projects with all columns, grouping/sorting works.

**Tests:**
- ProjectList renders correct number of rows
- Grouping by stage creates correct groups
- Sorting by priority orders correctly
- Priority change updates store

---

### Phase 4: Project Board View
**Effort:** ~5 hours

**Stories:**
1. **P4-1: Build ProjectBoard component**
   - Columns based on display settings (stage or priority)
   - Horizontal scroll for many columns

2. **P4-2: Build ProjectCard component**
   - Compact card with name, priority, owner
   - Task progress indicator (e.g., "4/7")
   - Configurable visible properties

3. **P4-3: Implement drag-and-drop**
   - Use @dnd-kit with sortable
   - Drag cards between columns
   - Visual feedback during drag

4. **P4-4: Implement gate enforcement on drag**
   - Check if forward move is allowed (all tasks complete)
   - Block drop with visual feedback if gate fails
   - Allow backward moves unconditionally
   - Toast notification on blocked move

5. **P4-5: Implement swim lanes (rows)**
   - Optional grouping by priority or owner
   - Grid layout: columns × rows
   - Handle empty cells

**Acceptance:** Board view displays, cards can be dragged, gates block forward moves correctly.

**Tests:**
- Board renders correct columns for stages
- Drag forward blocked when tasks incomplete
- Drag backward always succeeds
- Swim lanes render when enabled

---

### Phase 5: Display Popover & Filters
**Effort:** ~3 hours

**Stories:**
1. **P5-1: Build DisplayPopover component**
   - Tab toggle: List | Board
   - Conditional options based on view type
   - Property toggles as chips

2. **P5-2: Build FilterBar component**
   - Filter button with dropdown
   - Stage multi-select
   - Priority multi-select
   - Owner text input

3. **P5-3: Build SearchInput component**
   - Fuzzy search across name and location
   - Debounced input
   - Clear button

4. **P5-4: Implement active filter chips**
   - Show active filters as dismissible badges
   - "Clear all" option

5. **P5-5: Connect filters to list/board**
   - useProjectFilters hook
   - Filter projects before render
   - Update counts in filter options

**Acceptance:** Display options change view behavior, filters narrow down visible projects.

**Tests:**
- View toggle switches between list and board
- Stage filter shows only matching projects
- Search filters by name and location
- Clear filters resets all

---

### Phase 6: Create Project
**Effort:** ~2 hours

**Stories:**
1. **P6-1: Build CreateProjectDialog component**
   - Form: name, location, priority, owner
   - Validation with Zod
   - Submit creates project and closes dialog

2. **P6-2: Auto-populate initial stage tasks**
   - On create, instantiate tasks from first stage template
   - Initialize all tasks as not_started

3. **P6-3: Add "New Project" button to header**
   - Keyboard shortcut: N
   - Opens CreateProjectDialog

**Acceptance:** Can create new projects, they appear in list/board with initial tasks.

**Tests:**
- Form validation prevents empty name
- Created project has correct initial stage
- Initial tasks match stage template

---

### Phase 7: Project Detail View
**Effort:** ~4 hours

**Stories:**
1. **P7-1: Build ProjectDetail as Sheet (slide-over)**
   - Opens when project selected
   - Header: name (editable), priority, stage, owner
   - Close button

2. **P7-2: Build stage progress stepper**
   - Visual indicator of all stages
   - Current stage highlighted
   - Completed stages marked
   - Click stage to view its tasks

3. **P7-3: Build current stage task section**
   - List tasks for current stage
   - Task completion progress

4. **P7-4: Implement stage advancement controls**
   - "Advance to Next Stage" button
   - Disabled if gate not satisfied
   - "Move Back" dropdown for previous stages
   - Confirmation on move back

5. **P7-5: Instantiate tasks on stage entry**
   - When advancing to new stage, copy task templates
   - Preserve tasks if returning to previously visited stage

**Acceptance:** Can view project details, see task progress, advance/retreat through stages.

**Tests:**
- Detail sheet opens on project select
- Advance button disabled when tasks incomplete
- Move back works without restriction
- Tasks instantiated on first stage entry

---

### Phase 8: Task Management
**Effort:** ~4 hours

**Stories:**
1. **P8-1: Build TaskList component**
   - List tasks for a stage
   - Checkbox for completion
   - Status indicator (not started / in progress / complete)

2. **P8-2: Build TaskItem component**
   - Title, status, assignee, due date
   - Click to expand/open detail
   - Inline status toggle

3. **P8-3: Build TaskDetail component (expandable or modal)**
   - Full task editing: title, description, assignee, due date, status
   - Delete task option

4. **P8-4: Implement add task**
   - "Add task" button in task list
   - Inline form or modal
   - Task added to current stage

5. **P8-5: Build CommentThread component**
   - List comments with author and timestamp
   - Add comment form
   - Author field (free text)

**Acceptance:** Full task CRUD works, comments can be added.

**Tests:**
- Task status change persists
- Add task creates new task in correct stage
- Delete task removes from list
- Comments appear in order

---

### Phase 9: Workflow Settings
**Effort:** ~4 hours

**Stories:**
1. **P9-1: Build WorkflowSettings page**
   - List all stages
   - Visual workflow diagram (vertical or horizontal)

2. **P9-2: Build StageCard component**
   - Stage name, color indicator
   - Task template count
   - Edit/delete actions

3. **P9-3: Implement stage reordering**
   - Drag-and-drop stages
   - Update order in store

4. **P9-4: Build stage editor (modal or inline)**
   - Edit name, color
   - Add/edit/remove task templates

5. **P9-5: Implement add stage**
   - "Add Stage" button
   - New stage form
   - Insert at end or at position

6. **P9-6: Implement "Reset to Default" option**
   - Confirmation dialog
   - Resets workflow to seed data
   - Warning: affects only new projects

**Acceptance:** Can fully configure workflow stages and task templates.

**Tests:**
- Add stage increases stage count
- Reorder stages updates order
- Edit stage name persists
- Delete stage removes from workflow

---

### Phase 10: Keyboard Shortcuts
**Effort:** ~1.5 hours

**Stories:**
1. **P10-1: Build useKeyboardShortcuts hook**
   - Global listener for shortcuts
   - Context-aware (different shortcuts in different views)

2. **P10-2: Implement priority shortcuts (0-4)**
   - Works on hovered or selected project
   - Updates priority immediately

3. **P10-3: Implement navigation shortcuts**
   - N: New project
   - /: Focus search
   - G then P: Go to Projects
   - G then W: Go to Workflow Settings

4. **P10-4: Add keyboard shortcut hints**
   - Tooltip on relevant buttons
   - Optional shortcut cheat sheet (? to open)

**Acceptance:** All documented shortcuts work correctly.

**Tests:**
- Priority shortcut changes project priority
- N opens create dialog
- / focuses search input

---

### Phase 11: Polish & Edge Cases
**Effort:** ~2 hours

**Stories:**
1. **P11-1: Empty states**
   - No projects: prompt to create first project
   - No stages: prompt to configure workflow
   - No tasks in stage: helpful message

2. **P11-2: Loading states**
   - Initial load from localStorage
   - Skeleton placeholders (if noticeable delay)

3. **P11-3: Error handling**
   - Toast notifications for errors
   - Graceful degradation if localStorage fails

4. **P11-4: Animations and transitions**
   - View switch transitions
   - Dialog open/close
   - Drag feedback
   - Toast animations

5. **P11-5: Responsive adjustments**
   - Mobile: collapse sidebar, stack views
   - Tablet: condensed layout
   - Desktop: full layout

**Acceptance:** App feels polished, handles edge cases gracefully.

---

## Testing Strategy

### Unit Tests (Vitest)
- All Zustand store actions
- Gate logic (can/cannot advance)
- Filter/sort logic
- Utility functions

### Component Tests (React Testing Library)
- Key components render correctly with props
- User interactions trigger correct store actions
- Form validation works
- Drag-and-drop behavior (mock dnd-kit)

### Manual Testing Checklist
- [ ] Create project flow
- [ ] Task completion and gate blocking
- [ ] Stage advancement and retreat
- [ ] Board drag-and-drop with gates
- [ ] All filter combinations
- [ ] All display options
- [ ] Keyboard shortcuts
- [ ] Workflow configuration
- [ ] Data persistence across refresh
- [ ] Empty states
- [ ] Dark theme consistency

---

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x",
    "zustand": "^4.x",
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^8.x",
    "@dnd-kit/utilities": "^3.x",
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",
    "date-fns": "^3.x",
    "lucide-react": "^0.x",
    "clsx": "^2.x",
    "tailwind-merge": "^2.x",
    "sonner": "^1.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "tailwindcss": "^3.x",
    "postcss": "^8.x",
    "autoprefixer": "^10.x",
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "jsdom": "^24.x"
  }
}
```

---

## Estimated Total Effort

| Phase | Description | Estimate |
|-------|-------------|----------|
| 0 | Project Setup | 1 hr |
| 1 | Core Data & Seed | 2 hrs |
| 2 | App Shell & Nav | 2 hrs |
| 3 | List View | 4 hrs |
| 4 | Board View | 5 hrs |
| 5 | Display & Filters | 3 hrs |
| 6 | Create Project | 2 hrs |
| 7 | Project Detail | 4 hrs |
| 8 | Task Management | 4 hrs |
| 9 | Workflow Settings | 4 hrs |
| 10 | Keyboard Shortcuts | 1.5 hrs |
| 11 | Polish | 2 hrs |
| **Total** | | **~34.5 hrs** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| dnd-kit complexity with gates | Spike board drag-drop early in Phase 4; simplify if needed |
| localStorage size limits | Monitor storage usage; compress data if >5MB |
| Scope creep on task features | Stick to MVP task structure; defer attachments |
| Dark theme inconsistency | Use shadcn/ui theme tokens consistently; test all components |

---

## Definition of Done (per story)

- [ ] Feature implemented as specified
- [ ] TypeScript types complete, no `any`
- [ ] Component tests pass (where applicable)
- [ ] Manual testing confirms behavior
- [ ] Dark theme styling correct
- [ ] No console errors/warnings
- [ ] Code reviewed / self-reviewed
