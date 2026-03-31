# Optimize Change Detection — InfoBhoomi Frontend

Add `ChangeDetectionStrategy.OnPush` to all Angular components to prevent unnecessary re-renders.

## Why This Matters

InfoBhoomi renders an OpenLayers map, a resizable side panel, and 23 modal dialogs. With the default change detection strategy, Angular checks every component on every browser event (mouse moves, map interactions, etc.). With `OnPush`, components only re-render when:
- Their `@Input()` reference changes
- An Observable they subscribe to with `async` pipe emits
- `markForCheck()` or `detectChanges()` is called manually

## How to Apply

### Step 1 — Find all components missing OnPush
```bash
grep -rL "ChangeDetectionStrategy.OnPush" src/app --include="*.component.ts"
```

### Step 2 — For each component, apply the pattern:

```typescript
// BEFORE
import { Component } from '@angular/core';

@Component({
  selector: 'app-side-panel',
  templateUrl: './side-panel.component.html',
})
export class SidePanelComponent { }

// AFTER
import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-side-panel',
  templateUrl: './side-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidePanelComponent { }
```

### Step 3 — Fix any broken bindings

OnPush requires Observable + async pipe or explicit `markForCheck()`. If a component mutates state directly without signals or observables, you must:

**Option A** — Use Angular Signals (preferred for new code):
```typescript
// Already used in side-panel — replicate this pattern
myData = signal<MyType | null>(null);
```

**Option B** — Use async pipe with BehaviorSubject:
```typescript
// In template: {{ myData$ | async }}
myData$ = this.myService.data$;
```

**Option C** — Inject `ChangeDetectorRef` and call `markForCheck()` after mutations:
```typescript
constructor(private cdr: ChangeDetectorRef) {}

loadData() {
  this.service.getData().subscribe(data => {
    this.data = data;
    this.cdr.markForCheck(); // trigger re-render
  });
}
```

## Priority Components to Fix First

These are the highest-impact components (most re-renders):

1. `src/app/components/main/main.component.ts` — map container
2. `src/app/components/side-panel/side-panel.component.ts` — already uses Signals ✓ (just add OnPush)
3. `src/app/components/side-panel/land-info-panel/` — Signals-based ✓
4. `src/app/components/side-panel/building-info-panel/` — Signals-based ✓
5. `src/app/components/header/header.component.ts`
6. `src/app/components/layer-panel/` components

## After Applying

```bash
npm run format          # Prettier format
npm run build           # Ensure no build errors
npm test                # Run Jasmine tests
```

Watch for `ExpressionChangedAfterItHasBeenCheckedError` in the console — it means a component is mutating state after render. Fix by moving mutation into a signal or using `markForCheck()`.
