'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Badge,
  PageHeader,
  Input
} from '@governs-ai/ui';
import { 
  Label,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Settings,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  Zap,
  Brain,
  Target,
  CreditCard,
  CheckCircle
} from 'lucide-react';
import PlatformShell from '@/components/platform-shell';

interface SpendData {
  totalSpend: number;
  monthlySpend: number;
  dailySpend: number;
  toolSpend: Record<string, number>;
  modelSpend: Record<string, number>;
  userSpend: Record<string, number>;
  budgetLimit: number;
  remainingBudget: number;
  isOverBudget: boolean;
}

interface BudgetLimit {
  id: string;
  type: 'organization' | 'user';
  userId?: string;
  userName?: string;
  monthlyLimit: number;
  currentSpend: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ToolCost {
  toolName: string;
  totalCalls: number;
  totalCost: number;
  avgCostPerCall: number;
  lastUsed: string;
  category: string;
}

interface ModelCost {
  modelName: string;
  totalTokens: number;
  totalCost: number;
  avgCostPerToken: number;
  lastUsed: string;
  provider: string;
}

export default function SpendPage() {
  const [spendData, setSpendData] = useState<SpendData>({
    totalSpend: 0,
    monthlySpend: 0,
    dailySpend: 0,
    toolSpend: {},
    modelSpend: {},
    userSpend: {},
    budgetLimit: 0,
    remainingBudget: 0,
    isOverBudget: false
  });
  const [budgetLimits, setBudgetLimits] = useState<BudgetLimit[]>([]);
  const [toolCosts, setToolCosts] = useState<ToolCost[]>([]);
  const [modelCosts, setModelCosts] = useState<ModelCost[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetLimit | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedView, setSelectedView] = useState('overview');
  
  // Budget form state
  const [budgetType, setBudgetType] = useState<'organization' | 'user'>('organization');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const params = useParams();
  const orgSlug = params.slug as string;

  useEffect(() => {
    fetchSpendData();
  }, [selectedTimeRange]);

  const fetchSpendData = async () => {
    try {
      setLoading(true);
      
      // Fetch spend data
      const spendResponse = await fetch(`/api/spend?orgSlug=${orgSlug}&timeRange=${selectedTimeRange}`, {
        credentials: 'include',
      });
      
      // Fetch budget limits
      const budgetResponse = await fetch(`/api/spend/budget-limits?orgSlug=${orgSlug}`, {
        credentials: 'include',
      });
      
      // Fetch tool costs
      const toolCostsResponse = await fetch(`/api/spend/tool-costs?orgSlug=${orgSlug}&timeRange=${selectedTimeRange}`, {
        credentials: 'include',
      });
      
      // Fetch model costs
      const modelCostsResponse = await fetch(`/api/spend/model-costs?orgSlug=${orgSlug}&timeRange=${selectedTimeRange}`, {
        credentials: 'include',
      });

      // Fetch members
      const membersResponse = await fetch(`/api/spend/members?orgSlug=${orgSlug}`, {
        credentials: 'include',
      });

      const [spendData, budgetData, toolCostsData, modelCostsData, membersData] = await Promise.all([
        spendResponse.ok ? spendResponse.json() : { spend: {} },
        budgetResponse.ok ? budgetResponse.json() : { limits: [] },
        toolCostsResponse.ok ? toolCostsResponse.json() : { costs: [] },
        modelCostsResponse.ok ? modelCostsResponse.json() : { costs: [] },
        membersResponse.ok ? membersResponse.json() : { members: [] }
      ]);

      console.log('Fetched spend data:', spendData);
      console.log('Fetched budget data:', budgetData);

      setSpendData({
        totalSpend: 0,
        monthlySpend: 0,
        dailySpend: 0,
        toolSpend: {},
        modelSpend: {},
        userSpend: {},
        budgetLimit: 0,
        remainingBudget: 0,
        isOverBudget: false,
        ...(spendData.spend || {})
      });
      setBudgetLimits(budgetData.limits || []);
      setToolCosts(toolCostsData.costs || []);
      setModelCosts(modelCostsData.costs || []);
      setMembers(membersData.members || []);
    } catch (err) {
      console.error('Error fetching spend data:', err);
      setError('Failed to load spend data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  const getSpendTrend = (current: number, previous: number) => {
    if (previous === 0) return { trend: 'up', percentage: 0 };
    const percentage = ((current - previous) / previous) * 100;
    return {
      trend: percentage >= 0 ? 'up' : 'down',
      percentage: Math.abs(percentage)
    };
  };

  const getBudgetStatus = (current: number, limit: number) => {
    if (limit === 0) return { status: 'no-limit', color: 'gray' };
    const percentage = (current / limit) * 100;
    if (percentage >= 100) return { status: 'over', color: 'red' };
    if (percentage >= 80) return { status: 'warning', color: 'yellow' };
    return { status: 'good', color: 'green' };
  };

  const handleCreateBudget = async () => {
    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) {
      setError('Please enter a valid monthly limit');
      return;
    }

    if (budgetType === 'user' && !selectedUserId) {
      setError('Please select a user for user budget limit');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/spend/budget-limits?orgSlug=${orgSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          type: budgetType,
          userId: budgetType === 'user' ? selectedUserId : undefined,
          monthlyLimit: parseFloat(monthlyLimit),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create budget limit');
      }

      setSuccess('Budget limit created successfully!');
      setShowBudgetForm(false);
      resetBudgetForm();
      await fetchSpendData();
    } catch (err) {
      console.error('Error creating budget limit:', err);
      setError(err instanceof Error ? err.message : 'Failed to create budget limit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBudget = (budget: BudgetLimit) => {
    setEditingBudget(budget);
    setBudgetType(budget.type);
    setSelectedUserId(budget.userId || '');
    setMonthlyLimit(budget.monthlyLimit.toString());
    setIsActive(budget.isActive);
    setShowBudgetForm(true);
  };

  const handleUpdateBudget = async () => {
    if (!editingBudget) return;
    if (!monthlyLimit || parseFloat(monthlyLimit) <= 0) {
      setError('Please enter a valid monthly limit');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/spend/budget-limits/${editingBudget.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          monthlyLimit: parseFloat(monthlyLimit),
          isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update budget limit');
      }

      setSuccess('Budget limit updated successfully!');
      setShowBudgetForm(false);
      setEditingBudget(null);
      resetBudgetForm();
      await fetchSpendData();
    } catch (err) {
      console.error('Error updating budget limit:', err);
      setError(err instanceof Error ? err.message : 'Failed to update budget limit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm('Are you sure you want to delete this budget limit?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const response = await fetch(`/api/spend/budget-limits/${budgetId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete budget limit');
      }

      setSuccess('Budget limit deleted successfully!');
      await fetchSpendData();
    } catch (err) {
      console.error('Error deleting budget limit:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete budget limit');
    }
  };

  const resetBudgetForm = () => {
    setBudgetType('organization');
    setSelectedUserId('');
    setMonthlyLimit('');
    setIsActive(true);
    setEditingBudget(null);
  };

  const handleCloseBudgetForm = () => {
    setShowBudgetForm(false);
    setEditingBudget(null);
    resetBudgetForm();
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        <PageHeader
          title="Spend Management"
          subtitle="Track AI tool usage costs and manage budget limits for your organization"
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBudgetForm(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Budgets
              </Button>
              <Button onClick={() => {
                resetBudgetForm();
                setShowBudgetForm(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Budget Limit
              </Button>
            </div>
          }
        />

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Time Range and View Selectors */}
        <div className="flex gap-4 items-center">
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="w-48 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          
          <select 
            value={selectedView} 
            onChange={(e) => setSelectedView(e.target.value)}
            className="w-48 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="overview">Overview</option>
            <option value="tools">Tool Costs</option>
            <option value="models">Model Costs</option>
            <option value="users">User Spending</option>
          </select>
        </div>

        {/* Budget Status Alert */}
        {spendData.isOverBudget && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="font-medium text-red-900">Budget Exceeded</h3>
              <p className="text-sm text-red-700">
                You've exceeded your monthly budget of {formatCurrency(spendData.budgetLimit)}. 
                Current spend: {formatCurrency(spendData.monthlySpend)}
              </p>
            </div>
          </div>
        )}

        {/* Overview Cards */}
        {selectedView === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Total Spend</p>
                      <p className="text-2xl font-bold">{formatCurrency(spendData.totalSpend)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Monthly Spend</p>
                      <p className="text-2xl font-bold">{formatCurrency(spendData.monthlySpend)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">Budget Limit</p>
                      <p className="text-2xl font-bold">{formatCurrency(spendData.budgetLimit)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium">Remaining</p>
                      <p className={`text-2xl font-bold ${spendData.remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(spendData.remainingBudget)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budget Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Monthly Budget Usage</span>
                    <span>{formatPercentage(spendData.monthlySpend, spendData.budgetLimit)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        spendData.isOverBudget ? 'bg-red-500' : 
                        (spendData.monthlySpend / spendData.budgetLimit) >= 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((spendData.monthlySpend / spendData.budgetLimit) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{formatCurrency(0)}</span>
                    <span>{formatCurrency(spendData.budgetLimit)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Tool Costs View */}
        {selectedView === 'tools' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Tool Usage Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {toolCosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tool usage data available for the selected time range.
                </div>
              ) : (
                <div className="space-y-4">
                  {toolCosts.map((tool) => (
                    <div key={tool.toolName} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Zap className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{tool.toolName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {tool.totalCalls} calls • {tool.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(tool.totalCost)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(tool.avgCostPerCall)} per call
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Model Costs View */}
        {selectedView === 'models' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Model Usage Costs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {modelCosts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Model Tracking Coming Soon</h3>
                  <p className="text-muted-foreground">
                    We're working on adding detailed model usage tracking and cost analysis.
                    This will include token usage, cost per token, and provider-specific metrics.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modelCosts.map((model) => (
                    <div key={model.modelName} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Brain className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{model.modelName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {model.totalTokens.toLocaleString()} tokens • {model.provider}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(model.totalCost)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(model.avgCostPerToken)} per token
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* User Spending View */}
        {selectedView === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(spendData.userSpend).map(([userId, spend]) => (
                  <div key={userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">User {userId.slice(0, 8)}...</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatPercentage(spend, spendData.monthlySpend)} of monthly spend
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(spend)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budget Limits Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Budget Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetLimits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Budget Limits Set</h3>
                <p className="text-muted-foreground mb-4">
                  Set monthly spending limits for your organization and individual users.
                </p>
                <Button onClick={() => setShowBudgetForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Set Budget Limit
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {budgetLimits.map((limit) => (
                  <div key={limit.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Target className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">
                          {limit.type === 'organization' ? 'Organization' : limit.userName || 'User'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Monthly limit: {formatCurrency(limit.monthlyLimit)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(limit.currentSpend)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPercentage(limit.currentSpend, limit.monthlyLimit)} used
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditBudget(limit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteBudget(limit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Form Modal */}
        {showBudgetForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  {editingBudget ? 'Edit Budget Limit' : 'Add Budget Limit'}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseBudgetForm}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Budget Type
                  </label>
                  <select
                    value={budgetType}
                    onChange={(e) => setBudgetType(e.target.value as 'organization' | 'user')}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={submitting}
                  >
                    <option value="organization">Organization</option>
                    <option value="user">User</option>
                  </select>
                </div>

                {budgetType === 'user' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      User
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={submitting}
                    >
                      <option value="">Select a user</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Monthly Limit ($)
                  </label>
                  <Input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    placeholder="Enter monthly limit"
                    min="0"
                    step="0.01"
                    disabled={submitting}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={submitting}
                    className="rounded border-border"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium">
                    Active
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={editingBudget ? handleUpdateBudget : handleCreateBudget}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Saving...' : (editingBudget ? 'Update' : 'Create')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCloseBudgetForm}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Budget Management Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Budget Management
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Current Budget Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Monthly Spend</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(spendData.monthlySpend)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Budget Limit</span>
                  <span className="text-lg font-bold">
                    {formatCurrency(spendData.budgetLimit)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Remaining</span>
                  <span className={`text-lg font-bold ${spendData.remainingBudget < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(spendData.remainingBudget)}
                  </span>
                </div>
                {spendData.budgetLimit > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Usage</span>
                      <span>{Math.round((spendData.monthlySpend / spendData.budgetLimit) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${spendData.monthlySpend > spendData.budgetLimit ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min((spendData.monthlySpend / spendData.budgetLimit) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Budget Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Budget Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Budget management helps you control spending by setting monthly limits and receiving alerts when approaching those limits.
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetEnabled">Enable Budget Tracking</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="budgetEnabled"
                    checked={true}
                    disabled
                    className="rounded border-border"
                  />
                  <span className="text-sm text-muted-foreground">Currently enabled</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budgetOnError">Error Handling</Label>
                <Select defaultValue="block" disabled>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="block">Block requests when budget check fails</SelectItem>
                    <SelectItem value="pass">Allow requests when budget check fails</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Debug Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Organization ID:</strong> {params.slug}</div>
              <div><strong>Usage Records Found:</strong> {spendData ? Object.keys(spendData.toolSpend).length : 0} tools</div>
              <div><strong>Total Records:</strong> {spendData ? Object.values(spendData.toolSpend).reduce((a, b) => a + b, 0) : 0} calls</div>
              <div className="text-muted-foreground">
                If you're not seeing usage data, check the browser console and platform logs for detailed debugging information.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformShell>
  );
}
