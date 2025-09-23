# DashboardLayout Usage Example

The DashboardLayout component has been updated to be more flexible and reusable across different apps.

## Basic Usage

```tsx
import { DashboardLayout } from "@governs-ai/ui";
import { Header } from "@/components/shared/header"; // Your app's header component

function MyDashboard() {
  const user = {
    name: "John Doe",
    email: "john@example.com",
    plan: "pro",
    streakDays: 5
  };

  return (
    <DashboardLayout
      user={user}
      headerComponent={Header}
      onStreakClick={() => console.log("Streak clicked!")}
    >
      <div>Your dashboard content here</div>
    </DashboardLayout>
  );
}
```

## Without Header

If you don't need a header, simply omit the `headerComponent` prop:

```tsx
<DashboardLayout user={user}>
  <div>Your dashboard content here</div>
</DashboardLayout>
```

## Header Component Interface

Your header component should implement this interface:

```tsx
interface HeaderProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
    plan: string;
    streakDays?: number;
  };
  onStreakClick?: () => void;
  showNavigation?: boolean;
}
```

## Breaking Changes

- The Header component is no longer automatically imported
- You must pass your own Header component via the `headerComponent` prop
- The `LiveActivityEvent` type is now exported from the UI package
