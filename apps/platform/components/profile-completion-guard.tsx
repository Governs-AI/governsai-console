"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Upload, 
  Target, 
  Brain, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  FileText,
  Briefcase,
  GraduationCap,
  Code
} from "lucide-react";
import Link from "next/link";

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

interface ProfileStatus {
  isCompleted: boolean;
  hasResume: boolean;
  hasBasicInfo: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  completionPercentage: number;
}



export function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profileStatus, setProfileStatus] = useState<ProfileStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    const checkProfileStatus = async () => {
      if (status === "loading" || !session?.user) return;

      try {
        const response = await fetch("/api/profile/status");
        if (response.ok) {
          const data = await response.json();
          setProfileStatus(data);
        }
      } catch (error) {
        console.error("Error checking profile status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkProfileStatus();
  }, [session, status]);

  // Show loading while checking session or profile status
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If profile is completed, show the children
  if (profileStatus?.isCompleted) {
    return <>{children}</>;
  }



  // Show initial options
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Complete Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            To provide you with the best AI governance features and insights, we need to know a bit more about your organization.
          </p>
        </div>

        {/* Progress Section */}
        <Card className="mb-8 shadow-xl border-0">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-xl">Profile Completion</CardTitle>
              <Badge variant="secondary" className="text-sm">
                {profileStatus?.completionPercentage || 0}% Complete
              </Badge>
            </div>
            <Progress value={profileStatus?.completionPercentage || 0} className="h-3" />
          </CardHeader>
        </Card>

        {/* Options Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Manual Profile Setup */}
          <Card className="shadow-xl border-0 hover:shadow-2xl transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Manual Profile Setup</CardTitle>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Configure your AI governance settings step by step
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Organization goals & AI policies</span>
                </div>
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-blue-500" />
                  <span className="text-sm">AI providers & integrations</span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-purple-500" />
                  <span className="text-sm">Usage patterns</span>
                </div>
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-orange-500" />
                  <span className="text-sm">Compliance requirements</span>
                </div>
              </div>
              <Button 
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                onClick={() => router.push("/onboarding")}
              >
                Start Manual Setup
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Resume Upload */}
          <Card className="shadow-xl border-0 hover:shadow-2xl transition-shadow">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Import Configuration</CardTitle>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Import your existing AI provider configurations
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-500" />
                  <span className="text-sm">Import from JSON, YAML, or CSV</span>
                </div>
                <div className="flex items-center gap-3">
                  <Code className="w-5 h-5 text-pink-500" />
                  <span className="text-sm">AI-powered configuration parsing</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm">Review & edit parsed configurations</span>
                </div>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  <span className="text-sm">Instant governance setup</span>
                </div>
              </div>
              <Button 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                onClick={() => router.push("/resume-upload")}
              >
                Import Configuration
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Skip Option */}
        <div className="text-center space-y-4">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline"
          >
            Skip for now
          </Link>
          <div className="text-xs text-gray-400">
            You can always complete your profile later from the dashboard
          </div>
        </div>
      </div>
    </div>
  );
} 