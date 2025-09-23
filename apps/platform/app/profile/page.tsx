"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  Target,
  Calendar,
  Loader2,
  Save,
  Edit,
  X,
  Plus,
  Trash2,
  FileText,
  ExternalLink,
  BarChart3,
  BookOpen,
  Menu,
  User,
} from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { getPlatformUrl } from "@governs-ai/common-utils"

interface UserProfile {
  id: string
  userId: string
  targetRole?: string
  targetSalary?: number
  targetLocation?: string
  aiGoals: string[]
  skills: string[]
  experience: string[]
  linkedin?: string
  github?: string
  portfolio?: string
}

interface UserData {
  id: string
  name?: string
  email?: string
  image?: string
  userProfile?: UserProfile
  counts?: {
    resumeCount: number
    experienceCount: number
  }
  Resume?: any[]
  Experience?: any[]
  Skill?: any[]
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [newGoal, setNewGoal] = useState("")
  const { toast } = useToast()
  const isMobile = useIsMobile()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/profile?includeAll=true')
      if (response.ok) {
        const data = await response.json()
        setUserData(data.data)
        setProfile(data.data.userProfile)
        setFormData(data.data.userProfile || {})
      } else {
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getResumeBuilderUrl = () => {
    return getPlatformUrl();
  };

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.data)
        setEditing(false)
        toast({
          title: "Success!",
          description: "Profile updated successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update profile",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addAIGoal = () => {
    setShowGoalModal(true)
  }

  const handleAddGoal = () => {
    if (newGoal && newGoal.trim()) {
      const updatedFormData = {
        ...formData,
        aiGoals: [...(formData.aiGoals || []), newGoal.trim()]
      }
      setFormData(updatedFormData)
      setNewGoal("")
      setShowGoalModal(false)
      
      // Auto-save the changes
      handleSaveGoal(updatedFormData)
    }
  }

  const handleSaveGoal = async (updatedData: Partial<UserProfile>) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.data)
        toast({
          title: "Success!",
          description: "AI goal added and saved successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to save AI goal",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving goal:', error)
      toast({
        title: "Error",
        description: "Failed to save AI goal",
        variant: "destructive",
      })
    }
  }

  const removeAIGoal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      aiGoals: prev.aiGoals?.filter((_, i) => i !== index)
    }))
  }

  const formatSalary = (salary?: number) => {
    if (!salary) return "Not specified"
    return `$${salary.toLocaleString()}k`
  }

  const calculateProfileCompletion = () => {
    if (!profile) return 0;
    const fields = [
      profile.targetRole,
      profile.targetSalary,
      profile.targetLocation,
      profile.aiGoals?.length > 0,
      profile.skills?.length > 0,
      profile.experience,
      profile.linkedin,
      profile.github,
      profile.portfolio
    ];
    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Mobile Header */}
        <div className="bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard" className="p-2 rounded-lg bg-background border border-border">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground">👤 Profile</h1>
                <p className="text-xs text-muted-foreground">AI Governance Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {editing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(false)
                      setFormData(profile || {})
                    }}
                    disabled={saving}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setEditing(true)}>
                  <Edit className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="px-4 py-4 space-y-4">
          {/* Profile Summary Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3 mb-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={userData?.image || undefined} />
                  <AvatarFallback className="text-sm">
                    {userData?.name?.charAt(0) || userData?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-sm">
                    {userData?.name || 'Not set'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {userData?.email || 'No email'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-foreground">
                    {profile?.targetRole || "No target role set"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-foreground">
                    {profile?.targetLocation || "No location set"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-foreground">
                    {formatSalary(profile?.targetSalary)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Completion</span>
                  <span className="text-xs font-semibold text-foreground">
                    {calculateProfileCompletion()}%
                  </span>
                </div>
                <Progress value={calculateProfileCompletion()} className="h-1.5" />
                <div className="text-xs text-muted-foreground">
                  Complete your profile for better matches
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Row */}
          <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
            <Card className="min-w-[100px] flex-shrink-0">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-foreground">
                  {userData?.counts?.resumeCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">Resumes</div>
              </CardContent>
            </Card>
            <Card className="min-w-[100px] flex-shrink-0">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-foreground">
                  {userData?.counts?.experienceCount || 0}
                </div>
                <div className="text-xs text-muted-foreground">Experience</div>
              </CardContent>
            </Card>
            <Card className="min-w-[100px] flex-shrink-0">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-foreground">
                  {profile?.aiGoals?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Goals</div>
              </CardContent>
            </Card>
            <Card className="min-w-[100px] flex-shrink-0">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-foreground">
                  {userData?.Skill?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Skills</div>
              </CardContent>
            </Card>
          </div>

          {/* Resume Management */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <FileText className="w-4 h-4 mr-2" />
                Resume & Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">Resume Builder</h4>
                      <p className="text-xs text-muted-foreground">
                        Create and manage your resume
                      </p>
                    </div>
                  </div>
                  <Link href={`${getResumeBuilderUrl()}/resume-builder`} target="_blank">
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      Open
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Governance Preferences */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">AI Governance Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Target Role
                </label>
                {editing ? (
                  <Input
                    value={formData.targetRole || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetRole: e.target.value }))}
                    placeholder="e.g., Senior Product Manager"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-foreground">
                    {profile?.targetRole || "Not specified"}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Target Salary
                </label>
                {editing ? (
                  <Input
                    type="number"
                    value={formData.targetSalary || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetSalary: parseInt(e.target.value) || undefined }))}
                    placeholder="e.g., 150000"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-foreground">
                    {formatSalary(profile?.targetSalary)}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Target Location
                </label>
                {editing ? (
                  <Input
                    value={formData.targetLocation || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetLocation: e.target.value }))}
                    placeholder="e.g., San Francisco, CA or Remote"
                    className="text-sm"
                  />
                ) : (
                  <p className="text-sm text-foreground">
                    {profile?.targetLocation || "Not specified"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Goals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                AI Goals
                <Button variant="outline" size="sm" onClick={addAIGoal}>
                  <Plus className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(editing ? formData.aiGoals : profile?.aiGoals)?.map((goal, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-foreground">{goal}</span>
                    {editing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAIGoal(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {(!(editing ? formData.aiGoals : profile?.aiGoals) || (editing ? formData.aiGoals : profile?.aiGoals)?.length === 0) && (
                  <div className="text-center py-4">
                    <Target className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground text-sm mb-3">
                      No AI goals set yet.
                    </p>
                    <Button variant="outline" size="sm" onClick={addAIGoal}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Goal
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Skills Overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                Skills Overview
                <Link href={`${getResumeBuilderUrl()}/resume-builder`} target="_blank">
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Edit className="w-4 h-4" />
                    Edit
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Skills</span>
                  <Badge variant="outline" className="text-xs">
                    {userData?.Skill?.length || 0}
                  </Badge>
                </div>
                
                {userData?.Skill && userData.Skill.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {userData.Skill.slice(0, 6).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill.name}
                      </Badge>
                    ))}
                    {userData.Skill.length > 6 && (
                      <Badge variant="outline" className="text-xs">
                        +{userData.Skill.length - 6} more
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <BookOpen className="w-6 h-6 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground text-sm mb-3">
                      No skills added yet.
                    </p>
                    <Link href={`${getResumeBuilderUrl()}/resume-builder`} target="_blank">
                      <Button variant="outline" size="sm" className="text-xs">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Skills
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`${getResumeBuilderUrl()}/resume-builder`} target="_blank" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start text-sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Resume Builder
                  <ExternalLink className="w-3 h-4 ml-auto" />
                </Button>
              </Link>
              <Link href="/dashboard" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start text-sm">
                  <Target className="w-4 h-4 mr-2" />
                  View Dashboard
                </Button>
              </Link>
              <Link href="/insights" className="block">
                <Button variant="outline" size="sm" className="w-full justify-start text-sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  AI Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Add AI Goal Modal */}
        <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add AI Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-goal">AI Goal</Label>
                <Textarea
                  id="ai-goal"
                  placeholder="e.g., Implement comprehensive AI governance policies within 6 months"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGoalModal(false)
                    setNewGoal("")
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddGoal} disabled={!newGoal.trim()}>
                  Add Goal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Desktop Layout
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card/80 backdrop-blur-xl border-b border-border sticky z-50 px-4 sm:px-6 lg:px-12 py-4">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mb-4 sm:mb-6">
          <Link href="/dashboard" className="flex items-center text-muted-foreground hover:text-foreground transition-colors text-sm sm:text-base">
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span className="text-muted-foreground hidden sm:inline">/</span>
          <span className="text-foreground font-medium text-sm sm:text-base">Profile</span>
        </div>

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                👤 {userData?.name || userData?.email?.split('@')[0] || 'AI Governance Profile'}
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Manage your AI governance preferences and policies
              </p>
            </div>
            <div className="flex space-x-2">
              <Link href={`${getResumeBuilderUrl()}/resume-builder`} target="_blank">
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Resume Builder
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
              {editing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false)
                      setFormData(profile || {})
                    }}
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Resume Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resume & Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-foreground">Resume Builder</h4>
                        <p className="text-sm text-muted-foreground">
                          Create and manage your professional resume
                        </p>
                      </div>
                    </div>
                    <Link href={`${getResumeBuilderUrl()}/resume-builder`} target="_blank">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        Open Builder
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        {userData?.counts?.resumeCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Resumes</div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        {userData?.counts?.experienceCount || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Experience</div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <div className="text-2xl font-bold text-foreground">
                        {profile?.aiGoals?.length || 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Goals</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Governance Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>AI Governance Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Target Role
                    </label>
                    {editing ? (
                      <Input
                        value={formData.targetRole || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, targetRole: e.target.value }))}
                        placeholder="e.g., Senior Product Manager"
                      />
                    ) : (
                      <p className="text-foreground">
                        {profile?.targetRole || "Not specified"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Target Salary
                    </label>
                    {editing ? (
                      <Input
                        type="number"
                        value={formData.targetSalary || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, targetSalary: parseInt(e.target.value) || undefined }))}
                        placeholder="e.g., 150000"
                      />
                    ) : (
                      <p className="text-foreground">
                        {formatSalary(profile?.targetSalary)}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Target Location
                  </label>
                  {editing ? (
                    <Input
                      value={formData.targetLocation || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, targetLocation: e.target.value }))}
                      placeholder="e.g., San Francisco, CA or Remote"
                    />
                  ) : (
                    <p className="text-foreground">
                      {profile?.targetLocation || "Not specified"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  AI Goals
                  <Button variant="outline" size="sm" onClick={addAIGoal}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Goal
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(editing ? formData.aiGoals : profile?.aiGoals)?.map((goal, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-foreground">{goal}</span>
                      {editing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAIGoal(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {(!(editing ? formData.aiGoals : profile?.aiGoals) || (editing ? formData.aiGoals : profile?.aiGoals)?.length === 0) && (
                    <div className="text-center py-6">
                      <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-3">
                        No AI goals set yet.
                      </p>
                      <Button variant="outline" size="sm" onClick={addAIGoal}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Goal
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Skills Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Skills Overview
                  <Link href={`${getResumeBuilderUrl()}/resume-builder`} target="_blank">
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Edit Skills
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Skills</span>
                    <Badge variant="outline">
                      {userData?.Skill?.length || 0}
                    </Badge>
                  </div>
                  
                  {userData?.Skill && userData.Skill.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {userData.Skill.slice(0, 8).map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill.name}
                        </Badge>
                      ))}
                      {userData.Skill.length > 8 && (
                        <Badge variant="outline">
                          +{userData.Skill.length - 8} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-3">
                        No skills added yet.
                      </p>
                      <Link href={`${getResumeBuilderUrl()}/resume-builder`} target="_blank">
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Skills in Resume Builder
                          <ExternalLink className="w-3 h-3 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={userData?.image || undefined} />
                    <AvatarFallback className="text-lg">
                      {userData?.name?.charAt(0) || userData?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {userData?.name || 'Not set'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {userData?.email || 'No email'}
                    </p>
                  </div>
                  
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {profile?.targetRole || "No target role set"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {profile?.targetLocation || "No location set"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {formatSalary(profile?.targetSalary)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completion</span>
                    <span className="text-sm font-semibold text-foreground">
                      {calculateProfileCompletion()}%
                    </span>
                  </div>
                  <Progress value={calculateProfileCompletion()} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    Complete your profile to get better job matches and insights
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">AI Goals</span>
                  <Badge variant="outline">
                    {profile?.aiGoals?.length || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Skills</span>
                  <Badge variant="outline">
                    {userData?.Skill?.length || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Resumes</span>
                  <Badge variant="outline">
                    {userData?.counts?.resumeCount || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Experience</span>
                  <Badge variant="outline">
                    {userData?.counts?.experienceCount || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`${getResumeBuilderUrl()}/resume-builder`} target="_blank" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Resume Builder
                    <ExternalLink className="w-3 h-4 ml-auto" />
                    </Button>
                </Link>
                <Link href="/dashboard" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Target className="w-4 h-4 mr-2" />
                    View Dashboard
                  </Button>
                </Link>
                <Link href="/insights" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    AI Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      {/* Add AI Goal Modal */}
      <Dialog open={showGoalModal} onOpenChange={setShowGoalModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add AI Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-goal">AI Goal</Label>
              <Textarea
                id="ai-goal"
                placeholder="e.g., Implement comprehensive AI governance policies within 6 months"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGoalModal(false)
                  setNewGoal("")
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddGoal} disabled={!newGoal.trim()}>
                Add Goal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


    </div>
  )
} 