# Design System Specifications (shadcn-ui)

## 1. Typography

Configure `next/font` to load **Inter Variable** (sans-serif). Update `tailwind.config.ts` to set Inter as the default font family.

**Font Family:** `Inter Variable`

### Type Scale (Desktop)

| Role              | Size  | Line Height | Letter Spacing | Weight       | Usage           |
| :---------------- | :---- | :---------- | :------------- | :----------- | :-------------- |
| **Heading Large** | 24px  | 115%        | -1%            | Bold (700)   | Page Titles     |
| **Heading Small** | 18px  | 135%        | -1%            | Bold (700)   | Section Headers |
| **Subheading**    | 16px  | 150%        | -1%            | Bold (700)   | Card Titles     |
| **Body Regular**  | 14px  | 145%        | 0%             | Regular (400)| Default Text    |
| **Body Small**    | 12px  | 150%        | 0%             | Regular (400)| Metadata/Hints  |
| **Button Text**   | 14px  | 100%        | 0%             | Bold (700)   | Actions         |

---

## 2. Color Palette & Theming

Update `app/globals.css`. Use strict **HSL space-separated values** (e.g., `0 0% 100%`) to allow Tailwind opacity modifiers.

### Base Colors

| Color                        | Hex       | Description                              |
| :--------------------------- | :-------- | :--------------------------------------- |
| Gray 900 (Primary Text)      | `#1F1F1F` | Darkest Gray                             |
| Gray 700 (Secondary Text)    | `#616161` |                                          |
| Gray 500 (Borders/Disabled)  | `#9E9E9E` |                                          |
| Gray 75 (Surface Secondary)  | `#FAFAFA` |                                          |
| Primary Brand (Slate/Indigo) | `#2E405E` | Approximate from "Primary" swatch        |
| Critical (Red)               | `#D32F2F` | Red 600                                  |

### Semantic Mapping (`app/globals.css`)

```css
:root {
  /* BACKGROUNDS */
  --background: 0 0% 100%;       /* White */
  --foreground: 0 0% 12%;        /* Gray 900 #1F1F1F */

  /* CARDS & SURFACES */
  --card: 0 0% 100%;
  --card-foreground: 0 0% 12%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 12%;

  /* PRIMARY BRAND */
  --primary: 218 34% 27%;        /* Dark Slate/Indigo #2E405E */
  --primary-foreground: 0 0% 100%;

  /* SECONDARY (Gray 75 Surface) */
  --secondary: 0 0% 98%;         /* #FAFAFA */
  --secondary-foreground: 0 0% 12%;

  /* MUTED (Disabled/Subdued) */
  --muted: 0 0% 96%;             /* Approx Gray 100 */
  --muted-foreground: 0 0% 38%;  /* Gray 700 */

  /* ACCENT (Hover States) */
  --accent: 0 0% 96%;
  --accent-foreground: 0 0% 12%;

  /* SEMANTIC STATES (Color Groups) */
  --destructive: 0 65% 51%;      /* Critical (Red 600) */
  --destructive-foreground: 0 0% 100%;
  --success: 142 71% 45%;        /* Positive (Green 600) */
  --warning: 32 95% 44%;         /* Warning (Orange/Brown) */
  --info: 221 83% 53%;           /* Informative (Blue) */

  /* BORDERS & INPUTS */
  --border: 0 0% 88%;            /* Light dividers */
  --input: 0 0% 62%;             /* Gray 500 #9E9E9E (Significant contrast) */
  --ring: 218 34% 27%;           /* Focus ring matches Primary */

  /* RADIUS */
  --radius: 0.25rem;             /* 4px (Radius M) */
}
```

---

## 3. Styling Rules & Tokens

### Border Radius

| Token        | Value  | Usage                    |
| :----------- | :----- | :----------------------- |
| `radius-sm`  | 3px    | Checkboxes, Tags         |
| `radius-md`  | 4px    | Buttons, Inputs, Cards   |
| `radius-lg`  | 8px    | Containers, Modals       |
| `rounded`    | 999px  | Pills, Avatars           |

### Shadows (Elevation)

| Level          | Class       | Usage                      |
| :------------- | :---------- | :------------------------- |
| Level 1        | `shadow-sm` | Elevation 100 (Low emphasis) |
| Level 2        | `shadow`    | Elevation 200 (Overlaid elements, Cards) |
| Level 3        | `shadow-md` | Elevation 300 (Popovers)   |
| Level 4        | `shadow-xl` | Elevation 900 (Modals)     |

### Spacing Scale

Follows 4px grid:

| Value   | Rem      |
| :------ | :------- |
| 4px     | 0.25rem  |
| 8px     | 0.5rem   |
| 12px    | 0.75rem  |
| 16px    | 1rem     |
| 24px    | 1.5rem   |
| 32px    | 2rem     |

---

## 4. Component Specifications

### Buttons

**Variants:**

| Variant     | Background         | Text               | Border                    |
| :---------- | :----------------- | :----------------- | :------------------------ |
| Primary     | `--primary`        | White              | None                      |
| Secondary   | White              | `--foreground`     | 1px solid `--input`       |
| Critical    | `--destructive`    | White              | None                      |

**Sizes:**

| Size   | Height         |
| :----- | :------------- |
| Small  | `h-8` (32px)   |
| Medium | `h-10` (40px)  |
| Large  | `h-12` (48px)  |

**States:**
- Loading: Replaces content with spinner

### Inputs & Text Fields

| State    | Background       | Border                | Additional                          |
| :------- | :--------------- | :-------------------- | :---------------------------------- |
| Default  | White            | `--input` (Gray 500)  |                                     |
| Focus    | White            | `--primary`           | Ring width 2px                      |
| Error    | White            | `--destructive`       | Error text (Body Small) below input |
| Disabled | Gray 100/Muted   | —                     | Text Gray 500                       |

**Label:** Top-aligned. Overflow behavior: Wrap text if too long.

### Selection Controls

**Checkbox:**
- Radius: 3px (`radius-sm`)
- Checked: Solid `--primary` background, White icon
- Indeterminate: Solid `--primary` background, White dash

**Radio Group:**
- Unchecked: Hollow circle, Border `--input`
- Checked: Border `--primary`, solid dot

**Switch:**
- Off: Gray pill
- On: `--primary` pill

### Select / Dropdown

**Trigger:** Matches Input styling (Gray 500 border)

**Menu Items:**
- Hover: `--accent` (Light Gray)
- Selected: `--accent` + Checkmark
