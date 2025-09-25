import DocsLayout from "@/components/docs-layout";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@governs-ai/ui";

export default function DocsHomePage() {
  return (
    <DocsLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">GovernsAI Documentation</h1>
          <p className="text-lg text-muted-foreground mt-4">
            Everything you need to integrate GovernsAI into your AI applications and workflows.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="interactive-card">
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Get up and running with GovernsAI in under 5 minutes. Perfect for new users.
              </p>
              <Button variant="outline" size="sm">
                Start Here →
              </Button>
            </CardContent>
          </Card>

          <Card className="interactive-card">
            <CardHeader>
              <CardTitle>API Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Complete API documentation with examples and interactive testing.
              </p>
              <Button variant="outline" size="sm">
                Browse API →
              </Button>
            </CardContent>
          </Card>

          <Card className="interactive-card">
            <CardHeader>
              <CardTitle>Guides</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Step-by-step guides for common use cases and best practices.
              </p>
              <Button variant="outline" size="sm">
                Read Guides →
              </Button>
            </CardContent>
          </Card>

          <Card className="interactive-card">
            <CardHeader>
              <CardTitle>SDKs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Official SDKs for Python, Node.js, and other popular languages.
              </p>
              <Button variant="outline" size="sm">
                View SDKs →
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="border-t border-border pt-8">
          <h2 className="text-2xl font-semibold mb-4">Popular Topics</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium">Authentication</h3>
              <p className="text-sm text-muted-foreground">
                Learn how to authenticate with the GovernsAI API using API keys and JWT tokens.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Policy Engine</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage policies to control AI usage, costs, and security.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Webhooks</h3>
              <p className="text-sm text-muted-foreground">
                Set up real-time notifications for policy decisions and events.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DocsLayout>
  );
}