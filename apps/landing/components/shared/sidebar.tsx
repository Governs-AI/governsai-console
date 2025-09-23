"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, Brain, Briefcase, FileText, BarChart3, Play, Search, Plus, MessageCircle } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  const navigationItems = [
    {
      href: "/dashboard",
      icon: Target,
      label: "Dashboard",
      badge: { text: "New", variant: "destructive" as const },
    },
    {
      href: "/usage",
      icon: Brain,
      label: "Usage Tracking",
      badge: { text: "Live", variant: "default" as const },
    },
    {
      href: "/budgets",
      icon: Briefcase,
      label: "Budget Control",
      badge: { text: "Active", variant: "secondary" as const },
    },
    {
      href: "/policies",
      icon: FileText,
      label: "Policies",
    },
    {
      href: "/analytics",
      icon: BarChart3,
      label: "Analytics",
    },
  ]

  const quickActions = [
    {
      href: "/dashboard",
      icon: Play,
      label: "View Dashboard",
    },
    {
      href: "/usage",
      icon: Search,
      label: "Track Usage",
    },
    {
      href: "/policies",
      icon: Plus,
      label: "Manage Policies",
    },
  ]

  return (
    <aside className={`w-72 bg-white/60 backdrop-blur-sm border-r border-white/20 min-h-screen ${className}`}>
      <div className="p-6">
        {/* AI Coach Card */}
        <Card className="mb-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200/50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">AI Coach</div>
                <div className="text-xs text-gray-600">Always learning</div>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              "Your AI usage is within budget. 3 new policies have been applied to your account."
            </p>
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              View Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* Navigation */}
        <nav className="space-y-2 mb-8">
          {navigationItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? "default" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <Link href={item.href}>
                <item.icon className="mr-3 h-4 w-4" />
                {item.label}
                {item.badge && (
                  <Badge
                    className={`ml-auto text-xs ${
                      item.badge.variant === "destructive"
                        ? "bg-red-100 text-red-700"
                        : item.badge.variant === "secondary"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {item.badge.text}
                  </Badge>
                )}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Button
                key={action.href}
                variant="outline"
                size="sm"
                className="w-full justify-start text-sm bg-transparent"
                asChild
              >
                <Link href={action.href}>
                  <action.icon className="mr-2 h-3 w-3" />
                  {action.label}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
