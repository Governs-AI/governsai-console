'use client';

import { useState, useEffect } from 'react';
import { Button, Card, CardContent } from '@governs-ai/ui';
import { 
  Shield, 
  DollarSign, 
  Eye, 
  CheckCircle, 
  ArrowRight, 
  Star,
  Users,
  Zap,
  Lock,
  BarChart3,
  Play,
  ChevronRight
} from 'lucide-react';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Policy Enforcement",
      description: "Real-time policy validation with custom rules and compliance checks."
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: "Cost Control",
      description: "Predictable AI spending with budget enforcement and usage analytics."
    },
    {
      icon: <Eye className="h-6 w-6" />,
      title: "Complete Visibility",
      description: "Monitor every AI interaction with detailed logs and real-time dashboards."
    },
    {
      icon: <Lock className="h-6 w-6" />,
      title: "Security First",
      description: "PII detection, data protection, and enterprise-grade security controls."
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Analytics & Insights",
      description: "Comprehensive reporting and analytics to optimize your AI usage."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "High Performance",
      description: "Sub-100ms latency with 99.9% uptime for mission-critical applications."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "CTO, TechCorp",
      content: "GovernsAI has transformed how we manage AI costs. We've reduced spending by 40% while improving security.",
      rating: 5
    },
    {
      name: "Michael Rodriguez",
      role: "Head of AI, InnovateLab",
      content: "The policy engine is incredibly powerful. We can now enforce compliance across all our AI applications.",
      rating: 5
    },
    {
      name: "Emily Watson",
      role: "VP Engineering, DataFlow",
      content: "The visibility into our AI usage is game-changing. We finally understand what's happening under the hood.",
      rating: 5
    }
  ];

  const stats = [
    { label: "Decisions Processed", value: "10M+" },
    { label: "Cost Savings", value: "40%" },
    { label: "Uptime", value: "99.9%" },
    { label: "Customers", value: "500+" }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-150 ease-pleasant ${
        scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border' : 'bg-transparent'
      }`}>
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center">
                <span className="text-brand-foreground font-bold text-sm">G</span>
              </div>
              <span className="text-xl font-bold">GovernsAI</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium hover:text-brand transition-colors">Features</a>
              <a href="#pricing" className="text-sm font-medium hover:text-brand transition-colors">Pricing</a>
              <a href="#docs" className="text-sm font-medium hover:text-brand transition-colors">Docs</a>
              <a href="#contact" className="text-sm font-medium hover:text-brand transition-colors">Contact</a>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
              <Button size="sm">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Governance for AI you can{' '}
                <span className="text-brand">trust</span>.
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                A secure control plane for costs, policies, and audit—without slowing teams down.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-base">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" className="text-base">
                  <Play className="mr-2 h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-success" />
                  No credit card required
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-success" />
                  Setup in 5 minutes
                </div>
              </div>
            </div>
            <div className="relative">
              <Card className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 shadow-enterprise-lg">
                <div className="aspect-video rounded-xl bg-gradient-to-br from-brand/20 to-accent/10 flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-full bg-brand/20 flex items-center justify-center mx-auto mb-4">
                      <Shield className="h-8 w-8 text-brand" />
                    </div>
                    <p className="text-sm text-muted-foreground">Product Demo</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl font-bold text-brand">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything you need to govern AI
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Comprehensive tools to control costs, enforce policies, and maintain security across all your AI applications.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="rounded-2xl border border-border bg-card p-6 shadow-enterprise-sm hover:shadow-enterprise-md transition-shadow duration-150 ease-pleasant">
                <div className="text-brand mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight">
              Trusted by leading companies
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              See what our customers are saying about GovernsAI.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="rounded-2xl border border-border bg-card p-6 shadow-enterprise-sm">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join hundreds of companies already using GovernsAI to control their AI infrastructure.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="text-base">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center">
                  <span className="text-brand-foreground font-bold text-sm">G</span>
                </div>
                <span className="text-xl font-bold">GovernsAI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The secure control plane for AI governance.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; 2024 GovernsAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}