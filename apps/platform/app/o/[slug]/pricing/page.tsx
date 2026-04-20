import { PricingPageClient } from './pricing-page-client';

export default async function OrganizationPricingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <PricingPageClient slug={slug} />;
}
