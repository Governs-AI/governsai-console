import PoliciesClient from "./policies-client";
import PlatformShell from "@/components/platform-shell";

export default function PoliciesPage() {
  return (
    <PlatformShell>
      <PoliciesClient />
    </PlatformShell>
  );
}
