# LegalEase Component Catalog & Design System

Component reference guide and usage conventions for LegalEase frontend.

## 🎨 UI Primitives (`src/components/ui/`)

### `Button`
Standardized button component supporting multiple variants, sizes, icon slots, and loading spinners.
```tsx
import { Button } from './components/ui/Button';

<Button variant="primary" size="md" isLoading={false} iconLeft={<Plus />}>
  Upload Contract
</Button>
```
- **Variants**: `primary`, `secondary`, `outline`, `ghost`, `danger`
- **Sizes**: `xs`, `sm`, `md`, `lg`

### `PageHeader`
Reusable header for pages with title, subtitle, breadcrumb links, and action buttons.
```tsx
import { PageHeader } from './components/ui/PageHeader';

<PageHeader
  title="Platform Analytics"
  subtitle="Overview of contract throughput and risk distribution."
  breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Admin', href: '/admin' }]}
  action={<Button>Export</Button>}
/>
```

### `EmptyState`
Consistent zero-data fallback card with customizable Lucide icon, title, description, and CTA handler.
```tsx
import { EmptyState } from './components/ui/EmptyState';
import { FileX } from 'lucide-react';

<EmptyState
  icon={FileX}
  title="No contracts found"
  description="Try adjusting your filters or upload a new contract."
  actionLabel="Upload Contract"
  actionHref="/upload"
/>
```

### `ErrorState` & `ApiErrorFallback`
Standardized error displays for boundary catches and failed TanStack Query network operations.

### Skeletons (`Skeleton`, `SkeletonGrid`, `SkeletonList`, `SkeletonDetail`)
Shimmer loading placeholders for dark and light modes.
- `SkeletonGrid`: Cards layout loading state.
- `SkeletonList`: List rows loading state.
- `SkeletonDetail`: Full document / analytics page loading skeleton.

---

## 📊 Admin Components (`src/components/admin/`)

### `StatCard`
Animated count-up KPI stat card with trend indicator badge and hover lift effect.

### `ChartCard`
Wrapper for Chart.js canvases, handles responsive layout, titles, and skeleton loading state.

### `ActivityTable`
Paginated audit log table displaying user avatars, action badges, and relative timestamps.
