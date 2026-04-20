'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, Building2, Check, ShieldCheck, Zap } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@governs-ai/ui';
import { ENTERPRISE_PLAN, SELF_SERVE_BILLING_PLANS, type SelfServeBillingTier } from '@/lib/billing';
import { useUser } from '@/lib/user-context';

type Notice = {
  tone: 'success' | 'warning' | 'error';
  text: string;
};

const toneClasses: Record<Notice['tone'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
};

export function PricingPageClient({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const { activeOrg, organizations, loading, refetch, switchActiveOrg } = useUser();
  const [submittingTier, setSubmittingTier] = useState<SelfServeBillingTier | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    const checkoutState = searchParams.get('checkout');
    const billingState = searchParams.get('billing');

    if (checkoutState === 'success') {
      setNotice({
        tone: 'success',
        text: 'Checkout completed. Stripe is finishing the subscription handshake now.',
      });
      void refetch();
      return;
    }

    if (checkoutState === 'canceled') {
      setNotice({
        tone: 'warning',
        text: 'Checkout was canceled. Your organization plan was not changed.',
      });
      return;
    }

    if (billingState === 'restricted') {
      setNotice({
        tone: 'warning',
        text: 'This organization is restricted until billing is restored. Use this page to reactivate service.',
      });
    }
  }, [refetch, searchParams]);

  const orgFromList = organizations.find((organization) => organization.slug === slug) || null;
  const currentOrg = activeOrg?.slug === slug ? activeOrg : orgFromList;
  const currentTier = currentOrg?.billingTier || 'free';
  const currentStatus = currentOrg?.billingStatus || 'inactive';
  const selfServePlans = Object.values(SELF_SERVE_BILLING_PLANS);

  async function startCheckout(tier: SelfServeBillingTier) {
    setNotice(null);

    try {
      setSubmittingTier(tier);

      if (!activeOrg || activeOrg.slug !== slug) {
        const switched = await switchActiveOrg(slug);
        if (!switched) {
          throw new Error('Failed to switch to the selected organization');
        }
      }

      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier, seats: 1 }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.assign('/auth/login');
        return;
      }

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to start checkout');
      }

      window.location.assign(data.url);
    } catch (error) {
      setNotice({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Failed to start checkout',
      });
    } finally {
      setSubmittingTier(null);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(36,209,181,0.18),_transparent_36%),linear-gradient(180deg,_#f7fbfb_0%,_#eef4f7_100%)]">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-16 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-6">
            <Badge variant="secondary" className="w-fit border border-brand/20 bg-brand/10 text-foreground">
              Self-serve billing
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-primary sm:text-5xl">
                Pick the governance tier that matches your rollout pace.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                Starter and Growth launch immediately through Stripe Checkout. Enterprise stays
                sales-led for security review, rollout planning, and procurement.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5">
                <ShieldCheck className="h-4 w-4 text-brand" />
                Governance controls included
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5">
                <Zap className="h-4 w-4 text-brand" />
                Monthly subscriptions, billed in Stripe
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-enterprise-md backdrop-blur">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 text-brand" />
              {loading
                ? 'Loading organization context...'
                : currentOrg
                  ? `Viewing org: ${currentOrg.name}`
                  : `Organization not found for slug "${slug}".`}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current tier</p>
                <p className="mt-2 text-2xl font-semibold text-primary">{currentTier}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Subscription status</p>
                <p className="mt-2 text-2xl font-semibold text-primary">{currentStatus}</p>
              </div>
            </div>
          </div>
        </div>

        {notice ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm shadow-enterprise-sm ${toneClasses[notice.tone]}`}>
            {notice.text}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          {selfServePlans.map((plan) => {
            const isCurrentPlan = currentTier === plan.tier && currentStatus === 'active';
            const isBusy = submittingTier === plan.tier;

            return (
              <Card
                key={plan.tier}
                className={`relative overflow-hidden border-white/70 bg-white/85 shadow-enterprise-md backdrop-blur ${
                  plan.tier === 'growth' ? 'ring-2 ring-brand/70' : ''
                }`}
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand/0 via-brand to-primary/60" />
                <CardHeader className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-3xl text-primary">{plan.name}</CardTitle>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                    </div>
                    {plan.tier === 'growth' ? <Badge>Most coverage</Badge> : null}
                  </div>
                  <div>
                    <div className="text-4xl font-semibold tracking-tight text-primary">{plan.priceMonthly}</div>
                    <p className="mt-2 text-sm text-muted-foreground">Billed monthly through Stripe Checkout.</p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3 text-sm text-foreground">
                    {plan.highlights.map((highlight) => (
                      <li key={highlight} className="flex items-start gap-3">
                        <span className="mt-0.5 rounded-full bg-brand/15 p-1 text-brand">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.tier === 'growth' ? 'brand' : 'default'}
                    disabled={isBusy || isCurrentPlan || !currentOrg}
                    onClick={() => startCheckout(plan.tier)}
                  >
                    {isCurrentPlan ? 'Current plan' : isBusy ? 'Redirecting...' : 'Start now'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          <Card className="relative overflow-hidden border-primary/15 bg-primary text-primary-foreground shadow-enterprise-lg">
            <div className="absolute right-0 top-0 h-36 w-36 -translate-y-8 translate-x-8 rounded-full bg-brand/20 blur-3xl" />
            <CardHeader className="space-y-5">
              <Badge className="w-fit bg-white/10 text-primary-foreground hover:bg-white/10">
                Enterprise
              </Badge>
              <div>
                <CardTitle className="text-3xl">{ENTERPRISE_PLAN.name}</CardTitle>
                <p className="mt-2 text-sm leading-6 text-primary-foreground/75">
                  {ENTERPRISE_PLAN.description}
                </p>
              </div>
              <div className="text-4xl font-semibold tracking-tight">{ENTERPRISE_PLAN.priceMonthly}</div>
            </CardHeader>
            <CardContent className="space-y-6">
              <ul className="space-y-3 text-sm text-primary-foreground">
                {ENTERPRISE_PLAN.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-full bg-white/10 p-1 text-brand">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <Button asChild variant="secondary" className="w-full bg-white text-primary hover:bg-white/90">
                <Link href="mailto:sales@governsai.com?subject=Enterprise%20Plan%20Inquiry">
                  Talk to sales
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
