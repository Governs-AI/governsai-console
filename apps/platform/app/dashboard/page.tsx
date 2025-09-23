"use server"
import { redirect } from "next/navigation";
// import { auth } from "@governs-ai/auth";
import DashboardClient from "./dashboard-client";
import { PageSEO } from "@/components/page-seo"

export default async function DashboardPage() {
  // const session = await auth();
  const session = null; // TODO: Implement auth
  
  // if (!session?.user) {
  //   // Use environment variable or fallback to auth app
  //   const authUrl = process.env.NEXT_PUBLIC_AUTH_URL;
  //   redirect(authUrl);
  // }

  return (
    <>
      <PageSEO
        title="AI Governance Dashboard"
        description="Monitor your AI usage, track spending, and manage policies with complete visibility and control over your AI interactions."
        keywords={[
          "AI governance",
          "usage tracking",
          "budget control",
          "policy management",
          "AI monitoring",
          "compliance"
        ]}
        image="/og-image.png"
        type="website"
      />
      <DashboardClient user={null} />
    </>
  )
}
