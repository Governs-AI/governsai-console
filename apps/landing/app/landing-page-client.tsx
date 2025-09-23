"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Shield,
  Eye,
  DollarSign,
  Lock,
  BarChart3,
  Zap,
  CheckCircle,
  Users,
  Globe,
  Settings,
  FileText,
} from "lucide-react";
import Link from "next/link";

export default function LandingPageClient() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-800">
              The AI Governance OS
            </Badge>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Secure Control Plane for
              <span className="text-blue-600"> AI Interactions</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Monitor, control, and govern your AI usage with complete visibility, 
              budget enforcement, and compliance. The intelligent gateway between 
              your applications and AI models.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Complete AI Governance
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to secure, monitor, and control your AI interactions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold ml-3">AI Proxy Gateway</h3>
              </div>
              <p className="text-gray-600">
                Route all AI requests through our secure gateway for complete control and monitoring.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Eye className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold ml-3">Usage Tracking</h3>
              </div>
              <p className="text-gray-600">
                Monitor token usage, costs, and performance across all AI providers in real-time.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Lock className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold ml-3">PII Detection</h3>
              </div>
              <p className="text-gray-600">
                Automatically detect and protect sensitive data before it reaches AI models.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold ml-3">Budget Control</h3>
              </div>
              <p className="text-gray-600">
                Set spending limits and get alerts when approaching budget thresholds.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold ml-3">Audit Logs</h3>
              </div>
              <p className="text-gray-600">
                Complete audit trail of all AI interactions for compliance and security.
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Settings className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold ml-3">Policy Management</h3>
              </div>
              <p className="text-gray-600">
                Define and enforce policies for AI usage across your organization.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get started with GovernsAI in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Add API Keys</h3>
              <p className="text-gray-600">
                Connect your OpenAI, Anthropic, and other AI provider API keys to GovernsAI.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Configure Proxy</h3>
              <p className="text-gray-600">
                Update your applications to route AI requests through GovernsAI's proxy endpoint.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Monitor & Control</h3>
              <p className="text-gray-600">
                Monitor usage, set budgets, and enforce policies from your GovernsAI dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Secure Your AI Interactions?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join organizations already using GovernsAI to govern their AI usage
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600">
              Contact Sales
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}