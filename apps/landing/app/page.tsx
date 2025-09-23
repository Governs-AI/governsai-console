import { redirect } from "next/navigation";
import LandingPageClient from "./landing-page-client";
import { getDashboardUrl } from "../lib/navigation";

export default async function LandingPage() {
  // For now, always show landing page
  // TODO: Add authentication check when auth is implemented
  return <LandingPageClient />;
}
