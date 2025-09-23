"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MapPin,
  Clock,
  DollarSign,
  Users,
  Eye,
  Bookmark,
  Send,
  Building,
  Calendar,
  Loader2,
  Lightbulb,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface Job {
  id: string
  title: string
  company?: {
    id: string
    name: string
    logo?: string
    size?: string
  }
  location: string
  salaryMin?: number
  salaryMax?: number
  currency: string
  description: string
  requirements: string[]
  benefits: string[]
  tags: string[]
  remote: boolean
  status: string
  postedAt: string
  url: string
  _count?: {
    applications: number
  }
}

interface JobMatch {
  id: string
  matchScore: number
  reasons: string[]
  job: Job
}

interface JobCardProps {
  jobMatch?: JobMatch
  job?: Job
  showMatchScore?: boolean
  showAIInsight?: boolean
  variant?: "default" | "compact" | "detailed"
}

export function JobCard({ 
  jobMatch, 
  job, 
  showMatchScore = false, 
  showAIInsight = false,
  variant = "default" 
}: JobCardProps) {
  const [applying, setApplying] = useState(false)
  const { toast } = useToast()
  
  const jobData = jobMatch?.job || job
  if (!jobData) return null

  const handleApply = async (jobId: string) => {
    try {
      setApplying(true)
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: "Interested in this opportunity"
        }),
      })

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Application submitted successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to submit application",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error applying:', error)
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      })
    } finally {
      setApplying(false)
    }
  }

  const formatSalary = (min?: number, max?: number, currency: string = "USD") => {
    if (!min && !max) return "Not specified"
    if (!max) return `${currency}${min?.toLocaleString()}k+`
    if (!min) return `Up to ${currency}${max.toLocaleString()}k`
    return `${currency}${min.toLocaleString()}k – ${currency}${max.toLocaleString()}k`
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
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=random`
  }

  const isCompact = variant === "compact"
  const isDetailed = variant === "detailed"

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
      <CardContent className={`p-4 ${isDetailed ? 'sm:p-6' : ''}`}>
        {/* Header */}
        <div className={`flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-4 ${isCompact ? 'mb-2' : ''}`}>
          <div className="flex items-start space-x-3 sm:space-x-4">
                          <Avatar className={`${isCompact ? 'w-10 h-10' : 'w-12 h-12 sm:w-16 sm:h-16'} rounded-xl shadow-lg flex-shrink-0`}>
                <AvatarImage src={getCompanyLogo(jobData.company)} alt={jobData.company?.name || 'Company'} />
                <AvatarFallback className="text-white dark:text-gray-900 font-bold text-sm sm:text-lg">
                  {jobData.company?.name?.substring(0, 2).toUpperCase() || 'CO'}
                </AvatarFallback>
              </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-foreground ${isCompact ? 'text-base' : 'text-lg sm:text-xl'} mb-1`}>
                {jobData.title}
              </h3>
              <p className={`text-muted-foreground font-medium ${isCompact ? 'text-sm' : 'text-base sm:text-lg'}`}>
                {jobData.company?.name || 'Company'}
              </p>
              {!isCompact && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm text-muted-foreground mt-1 gap-1 sm:gap-0">
                  <div className="flex items-center">
                    <Building className="h-3 w-3 mr-1" />
                    {jobData.company?.size || "Unknown"} employees
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {getTimeAgo(jobData.postedAt)}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end space-x-3">
            {showMatchScore && jobMatch && (
              <Badge
                className={`text-sm px-3 py-1 ${
                  jobMatch.matchScore >= 0.95
                    ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : jobMatch.matchScore >= 0.90
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {Math.round(jobMatch.matchScore * 100)}% Match
              </Badge>
            )}
            {!isCompact && (
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity sm:block hidden"
              >
                <Bookmark className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Job Details */}
        {!isCompact && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{jobData.location}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{formatSalary(jobData.salaryMin, jobData.salaryMax, jobData.currency)}</span>
            </div>
            <div className="flex items-center text-muted-foreground sm:col-span-2 lg:col-span-1">
              <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                                    <span className="truncate">{jobData._count?.applications || 0} applicants</span>
            </div>
          </div>
        )}

        {/* Description */}
        {!isCompact && (
          <p className="text-foreground mb-4 leading-relaxed text-sm sm:text-base">
            {jobData.description.length > 200 
              ? `${jobData.description.substring(0, 200)}...` 
              : jobData.description
            }
          </p>
        )}

        {/* AI Insight */}
        {showAIInsight && jobMatch && !isCompact && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex items-start space-x-3">
              <Lightbulb className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">AI Insight</div>
                <p className="text-sm text-blue-700 dark:text-blue-300">{jobMatch.reasons[0]}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tags and Benefits */}
        {!isCompact && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {jobData.tags.slice(0, 5).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Benefits: </span>
              {jobData.benefits.slice(0, 3).join(", ")}
              {jobData.benefits.length > 3 && ` +${jobData.benefits.length - 3} more`}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${!isCompact ? 'pt-4 border-t border-border' : ''} gap-4`}>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
              <Link href={`/jobs/${jobData.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Link>
            </Button>
            {!isCompact && jobData.url && (
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <a href={jobData.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Original Post
                </a>
              </Button>
            )}
            {!isCompact && (
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Calendar className="w-4 h-4 mr-2" />
                Save for Later
              </Button>
            )}
          </div>
          <Button
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 w-full sm:w-auto"
            onClick={() => handleApply(jobData.id)}
            disabled={applying}
          >
            {applying ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {applying ? "Applying..." : "Apply Now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 