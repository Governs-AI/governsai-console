"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProfileCompletionGuard } from "@/components/profile-completion-guard"
import { MobileBottomSheet } from "@/components/mobile-bottom-sheet"
import { TourTrigger } from "@/components/tour-trigger"
import {
  Sparkles,
  TrendingUp,
  Target,
  Calendar,
  Clock,
  Users,
  Eye,
  Send,
  ArrowRight,
  Loader2,
  Trophy,
  Flame,
  Star,
  TrendingDown,
  CheckCircle,
  LogIn,
  FileText,
  Crown,
  Zap,
  Briefcase,
  MessageSquare,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
// import { useSession } from "next-auth/react"
import { getAppLink, getQuickActionLinks, getLinkAttributes } from "@/lib/navigation"
import { getResumeStudioUrl, navigationUrls } from "@governs-ai/common-utils"
import { useRouter } from "next/navigation"

// Quota pill components for dashboard
const JobMatchesQuotaPill = () => (
  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-muted text-muted-foreground border border-border">
    <span className="font-medium">Job Matches</span>
    <span className="text-xs opacity-70">50/50 today</span>
    <Crown className="w-4 h-4 text-amber-500" />
  </div>
);

const AutoApplyQuotaPill = () => (
  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-muted text-muted-foreground border border-border">
    <span className="font-medium">Auto-Apply</span>
    <span className="text-xs opacity-70">3/3 this month</span>
    <Crown className="w-4 h-4 text-amber-500" />
  </div>
);

const SavedJobsQuotaPill = () => (
  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-muted text-muted-foreground border border-border">
    <span className="font-medium">Saved Jobs</span>
    <span className="text-xs opacity-70">20/20</span>
    <Crown className="w-4 h-4 text-amber-500" />
  </div>
);

interface DashboardData {
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
  userProfile?: {
    targetRole?: string
    targetSalary?: number
    targetLocation?: string
  }
  totalXP: number
  streak: {
    currentStreak: number
    longestStreak: number
    lastActivityDate: string
  }
  recentActivities: Array<{
    id: string
    type: string
    points: number
    description: string
    createdAt: string
  }>
  recentApplications: Array<{
    id: string
    status: string
    appliedAt: string
    job: {
      id: string
      title: string
      company: {
        name: string
        logo?: string
      }
    }
  }>
  recentJobMatches: Array<{
    id: string
    matchScore: number
    job: {
      id: string
      title: string
      company: {
        name: string
        logo?: string
      }
    }
  }>
  goals: Array<{
    id: string
    title: string
    target: number
    current: number
    deadline: string
    completed: boolean
  }>
  achievements: Array<{
    id: string
    title: string
    description: string
    unlockedAt: string
  }>
  analytics: {
    totalApplications: number
    interviewRate: number
    offerRate: number
    averageResponseTime: number
  }
  resumes: {
    total: number
    recent: Array<{
      id: string
      profile: string
      company: string
    }>
  }
}

export default function DashboardClient() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  // const { data: session, status } = useSession()
  const session = null
  const status = 'unauthenticated'
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    
    if (status === "unauthenticated") {
      setLoading(false)
      setError("Please sign in to view your dashboard")
      return
    }

    fetchDashboardData()
  }, [status])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data.data.dashboard)
      } else if (response.status === 401) {
        setError("Please sign in to view your dashboard")
      } else {
        setError("Failed to load dashboard data")
        toast({
          title: "Error",
          description: "Failed to load dashboard data",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError("Failed to load dashboard data")
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInDays > 0) {
      return `${diffInDays}d ago`
    } else if (diffInHours > 0) {
      return `${diffInHours}h ago`
    } else {
      return "Just now"
    }
  }

  const getCompanyLogo = (company: any) => {
    if (!company) return `https://ui-avatars.com/api/?name=Company&background=random`
    if (company.logo) return company.logo
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name || 'Company')}&background=random`
  }



  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'job_application':
        return <Send className="w-4 h-4" />
      case 'profile_update':
        return <Target className="w-4 h-4" />
      case 'interview_completed':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Star className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
      case 'reviewing':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
      case 'interviewed':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
      case 'offered':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated" || error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card/80 backdrop-blur-xl border-b border-border sticky z-50 px-4 sm:px-6 lg:px-12 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">🎯 AI Governance Dashboard</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Sign in to view your personalized AI governance dashboard
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Welcome to GovernsAI</h2>
            <p className="text-muted-foreground mb-8">
              Sign in to access your AI governance dashboard, monitor usage, and manage policies.
            </p>
            <div className="space-y-4">
              <Button asChild className="w-full">
                <Link href="/auth/signin">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/auth/signup">
                  Create Account
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Failed to load dashboard data</p>
          <Button onClick={fetchDashboardData}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ProfileCompletionGuard>
      <div className="min-h-screen bg-background">
      <div className="bg-card/80 backdrop-blur-xl border-b border-border sticky z-50 px-4 sm:px-6 lg:px-12 py-4">
        {/* Header */}
        <div id="dashboard-welcome" className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">🎯 AI Governance Dashboard</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Welcome back, {dashboardData.user?.name || 'User'}! Here's your AI usage overview.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <TourTrigger />
            <Avatar className="h-10 w-10">
              <AvatarImage src={dashboardData.user?.image} />
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
                {dashboardData.user?.name?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      {/* Note: Main navigation is in the UnifiedLayout sidebar */}
      <div id="main-navigation" className="hidden" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quota Display and Upgrade CTA */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-card/80 backdrop-blur-xl border border-border rounded-xl p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Quota Pills */}
              <div className="flex flex-wrap gap-3">
                <JobMatchesQuotaPill />
                <AutoApplyQuotaPill />
                <SavedJobsQuotaPill />
              </div>
              
              {/* Upgrade CTA */}
              <div className="flex items-center gap-3">
                <div className="text-center lg:text-right">
                  <p className="text-sm text-muted-foreground">
                    Upgrade to Pro for unlimited access
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Unlimited job matches • Auto-apply • Save unlimited jobs
                  </p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => router.push('/pricing')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div id="dashboard-stats" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{dashboardData.totalXP || 0}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Total XP</div>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{dashboardData.streak?.currentStreak || 0}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Day Streak</div>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Flame className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{dashboardData.analytics?.totalApplications || 0}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Applications</div>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Send className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{dashboardData.achievements?.length || 0}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Achievements</div>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Star className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950/20 dark:to-gray-900/20 border-gray-200 dark:border-gray-800">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{dashboardData.resumes?.total || 0}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Resumes</div>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Bar */}
        <div id="quick-actions" className="grid grid-cols-1 md:grid-cols-4 gap-4 tour-target">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Browse Jobs</p>
                  <p className="text-sm text-muted-foreground">Find opportunities</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Practice Interview</p>
                  <p className="text-sm text-muted-foreground">AI-powered prep</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Create Resume</p>
                  <p className="text-sm text-muted-foreground">AI optimization</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-foreground">View Insights</p>
                  <p className="text-sm text-muted-foreground">AI analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Applications */}
            <Card id="job-applications">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Recent Applications
                  <Button variant="outline" size="sm" asChild>
                    <Link href={getAppLink('applications')?.href || '/applications'}>
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentApplications?.length > 0 ? (
                    dashboardData.recentApplications?.map((application) => (
                      <div key={application.id} className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={getCompanyLogo(application.job.company)} />
                          <AvatarFallback className="text-white dark:text-gray-900 font-bold">
                            {application.job.company?.name?.substring(0, 2).toUpperCase() || 'CO'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{application.job.title}</h4>
                          <p className="text-sm text-muted-foreground">{application.job.company?.name || 'Unknown Company'}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={`text-xs ${getStatusColor(application.status)}`}>
                            {application.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(application.appliedAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No applications yet</p>
                      <Button asChild>
                        <Link href={getAppLink('jobs')?.href || '/jobs'}>Browse Jobs</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

 {/* Recent Resumes */}
 <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Recent Resumes
                  <Button variant="outline" size="sm" asChild>
                    <Link href={getAppLink('resumeList')?.href || '/resume-studio/resume-list'}>
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.resumes?.recent && dashboardData.resumes.recent.length > 0 ? (
                    dashboardData.resumes.recent.map((resume) => (
                      <div key={resume.id} className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{resume.profile || `resume-${resume.id.trim().substring(5, 10)}`}</h4>
                          <p className="text-sm text-muted-foreground">{resume.company}</p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={navigationUrls.resumeStudio.resume(resume.id)}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No resumes yet</p>
                      <Button asChild>
                        <Link href="/policies">Create Policy</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Recent Job Matches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Perfect Matches
                  <Button variant="outline" size="sm" asChild>
                    <Link href={getAppLink('jobs')?.href || '/jobs'}>
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentJobMatches?.length > 0 ? (
                    dashboardData.recentJobMatches?.map((match) => (
                      <div key={match.id} className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={getCompanyLogo(match.job.company)} />
                          <AvatarFallback className="text-white dark:text-gray-900 font-bold">
                            {match.job.company?.name?.substring(0, 2).toUpperCase() || 'CO'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">{match.job.title}</h4>
                          <p className="text-sm text-muted-foreground">{match.job.company?.name || 'Unknown Company'}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                            {Math.round(match.matchScore * 100)}% Match
                          </Badge>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/jobs/${match.job.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No job matches yet</p>
                      <Button asChild>
                        <Link href={getAppLink('jobs')?.href || '/jobs'}>Browse Jobs</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

           
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <Card id="recent-activity" className="tour-target">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.recentActivities?.length > 0 ? (
                    dashboardData.recentActivities?.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{activity.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              +{activity.points} XP
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {getTimeAgo(activity.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No recent activity
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card id="ai-insights" className="tour-target">
              <CardHeader>
                <CardTitle>Active Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.goals?.length > 0 ? (
                    dashboardData.goals?.map((goal) => (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">{goal.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {goal.current}/{goal.target}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Due {new Date(goal.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No active goals
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card id="achievements" className="tour-target">
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.achievements?.length > 0 ? (
                    dashboardData.achievements?.slice(0, 3).map((achievement) => (
                      <div key={achievement.id} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-foreground">{achievement.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                          <span className="text-xs text-muted-foreground">
                            {getTimeAgo(achievement.unlockedAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No achievements yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <MobileBottomSheet 
        user={dashboardData.user}
        showNotifications={true}
        notificationCount={dashboardData.achievements?.length || 0}
      />
    </div>
    </ProfileCompletionGuard>
  )
} 