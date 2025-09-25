import { Button } from "@governs-ai/ui";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl h-14 px-6 flex items-center justify-between">
          <a href="/" className="font-semibold text-lg">GovernsAI Docs</a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="/platform" className="hover:text-foreground transition-colors">Platform</a>
            <a href="/api" className="hover:text-foreground transition-colors">API</a>
            <a href="/guides" className="hover:text-foreground transition-colors">Guides</a>
            <Button variant="outline" size="sm">Sign In</Button>
          </nav>
        </div>
      </header>
      
      <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-12 gap-8">
        <aside className="col-span-3 hidden md:block">
          <div className="sticky top-24 space-y-1">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Getting Started</h3>
              <a className="block rounded-lg px-3 py-2 hover:bg-muted text-sm" href="/docs/getting-started">
                Quick Start
              </a>
              <a className="block rounded-lg px-3 py-2 hover:bg-muted text-sm" href="/docs/installation">
                Installation
              </a>
              <a className="block rounded-lg px-3 py-2 hover:bg-muted text-sm" href="/docs/configuration">
                Configuration
              </a>
            </div>
            
            <div className="space-y-2 mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">API Reference</h3>
              <a className="block rounded-lg px-3 py-2 hover:bg-muted text-sm" href="/docs/api/authentication">
                Authentication
              </a>
              <a className="block rounded-lg px-3 py-2 hover:bg-muted text-sm" href="/docs/api/decisions">
                Decisions
              </a>
              <a className="block rounded-lg px-3 py-2 hover:bg-muted text-sm" href="/docs/api/policies">
                Policies
              </a>
              <a className="block rounded-lg px-3 py-2 hover:bg-muted text-sm" href="/docs/api/webhooks">
                Webhooks
              </a>
            </div>
            
            <div className="space-y-2 mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Guides</h3>
              <a className="block rounded-lg px-3 py-2 hover:bg-muted text-sm" href="/docs/guides/policy-creation">
                Policy Creation
              </a>
              <a className="block rounded-lg px-3 py-2 hover:bg-muted text-sm" href="/docs/guides/cost-control">
                Cost Control
              </a>
              <a className="block rounded-lg px-3 py-2 hover:bg-muted text-sm" href="/docs/guides/security">
                Security Best Practices
              </a>
            </div>
          </div>
        </aside>
        
        <main className="col-span-12 md:col-span-9 prose prose-invert:dark max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}
