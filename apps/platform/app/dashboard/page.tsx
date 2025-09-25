import { 
  KpiCard, 
  PageHeader, 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  DataTable,
  DataTableHeader,
  DataTableBody,
  DataTableRow,
  DataTableHead,
  DataTableCell
} from "@governs-ai/ui";
import PlatformShell from "@/components/platform-shell";

export default function DashboardPage() {
  return (
    <PlatformShell>
      <div className="space-y-6">
        <PageHeader
          title="AI Governance Dashboard"
          subtitle="Monitor your AI usage, track spending, and manage policies with complete visibility and control."
          actions={
            <div className="flex gap-2">
              <Button variant="outline">Export</Button>
              <Button>Refresh</Button>
            </div>
          }
        />
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard label="Total Decisions" value="1,204,332" delta="+3.1%" />
          <KpiCard label="Allow Rate" value="92.4%" delta="+0.7%" />
          <KpiCard label="Avg Latency" value="178 ms" delta="-12 ms" />
          <KpiCard label="Spend (MTD)" value="$4,230" delta="+$120" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="interactive-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Decision Log</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Monitor AI governance decisions in real-time</p>
              <Button variant="outline" size="sm" className="w-full">
                View Decisions →
              </Button>
            </CardContent>
          </Card>
          
          <Card className="interactive-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Manage your API keys and access controls</p>
              <Button variant="outline" size="sm" className="w-full">
                Manage Keys →
              </Button>
            </CardContent>
          </Card>
          
          <Card className="interactive-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Policies</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Configure AI governance policies and rules</p>
              <Button variant="outline" size="sm" className="w-full">
                Manage Policies →
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Recent Decisions</h2>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">Filters</Button>
              <Button variant="ghost" size="sm">View All</Button>
            </div>
          </div>
          
          <DataTable>
            <DataTableHeader>
              <DataTableRow>
                <DataTableHead>Timestamp</DataTableHead>
                <DataTableHead>Model</DataTableHead>
                <DataTableHead>Decision</DataTableHead>
                <DataTableHead>Cost</DataTableHead>
                <DataTableHead>Status</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              <DataTableRow>
                <DataTableCell className="text-sm text-muted-foreground">2 min ago</DataTableCell>
                <DataTableCell>gpt-4</DataTableCell>
                <DataTableCell>ALLOW</DataTableCell>
                <DataTableCell>$0.02</DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                    Success
                  </span>
                </DataTableCell>
              </DataTableRow>
              <DataTableRow>
                <DataTableCell className="text-sm text-muted-foreground">5 min ago</DataTableCell>
                <DataTableCell>claude-3</DataTableCell>
                <DataTableCell>BLOCK</DataTableCell>
                <DataTableCell>$0.00</DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-danger/10 text-danger">
                    Blocked
                  </span>
                </DataTableCell>
              </DataTableRow>
              <DataTableRow>
                <DataTableCell className="text-sm text-muted-foreground">8 min ago</DataTableCell>
                <DataTableCell>gpt-3.5-turbo</DataTableCell>
                <DataTableCell>ALLOW</DataTableCell>
                <DataTableCell>$0.01</DataTableCell>
                <DataTableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                    Success
                  </span>
                </DataTableCell>
              </DataTableRow>
            </DataTableBody>
          </DataTable>
        </section>
      </div>
    </PlatformShell>
  );
}
