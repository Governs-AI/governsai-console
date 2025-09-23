"use client"

import React, { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Home,
  Briefcase,
  FileText,
  Target,
  BarChart3,
  User,
  ChevronUp,
  ChevronDown,
  Settings,
  LogOut,
  Plus,
  Search,
  Bell,
  Menu,
  X,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { getAppLink, getLinkAttributes } from "@/lib/navigation"

interface MobileBottomSheetProps {
  user?: {
    name?: string
    email?: string
    image?: string
  }
  showNotifications?: boolean
  notificationCount?: number
}

export function MobileBottomSheet({ user, showNotifications = true, notificationCount = 0 }: MobileBottomSheetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState("")
  const pathname = usePathname()
  const { data: session } = useSession()

  // Navigation items with icons - matching the bottom navigation bar
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      description: "Main dashboard"
    },
    {
      name: "Jobs",
      href: "/jobs",
      icon: Search, // Changed to Search icon to match the image
      description: "Browse jobs"
    },
    {
      name: "Applications",
      href: "/applications",
      icon: Briefcase,
      description: "Track applications"
    },
    {
      name: "Resume AI", // Changed from "Interview Prep" to "Resume AI" to match image
      href: "/resume-studio", // Updated href to match resume studio
      icon: FileText,
      description: "AI Resume Builder"
    },
    {
      name: "Profile",
      href: "/profile",
      icon: User,
      description: "Your profile"
    }
  ]

  // Update current page when pathname changes
  useEffect(() => {
    const currentItem = navigationItems.find(item => pathname.startsWith(item.href))
    setCurrentPage(currentItem?.name || "Dashboard")
  }, [pathname])

  const getCurrentPageIcon = () => {
    const currentItem = navigationItems.find(item => pathname.startsWith(item.href))
    return currentItem?.icon || Home
  }

  const getCurrentPageDescription = () => {
    const currentItem = navigationItems.find(item => pathname.startsWith(item.href))
    return currentItem?.description || "Main dashboard"
  }

  const isCurrentPage = (href: string) => {
    // More flexible matching for different page structures
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/")
    }
    if (href === "/jobs") {
      return pathname === "/jobs" || pathname.startsWith("/jobs/")
    }
    if (href === "/applications") {
      return pathname === "/applications" || pathname.startsWith("/applications/")
    }
    if (href === "/resume-studio") {
      return pathname === "/resume-studio" || pathname.startsWith("/resume-studio/")
    }
    if (href === "/profile") {
      return pathname === "/profile" || pathname.startsWith("/profile/")
    }
    return pathname.startsWith(href)
  }

  const getUserInitials = () => {
    const name = user?.name || session?.user?.name
    if (!name) return 'U'
    return name.substring(0, 2).toUpperCase()
  }

  const CurrentPageIcon = getCurrentPageIcon()

  const handleNavigationClick = () => {
    setIsOpen(false)
  }

  return (
    <>
      {/* Mobile Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        {/* Collapsed Sheet */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <div className="bg-background/95 backdrop-blur-xl border-t border-border rounded-t-2xl shadow-lg cursor-pointer hover:bg-background/98 transition-colors">
              {/* Handle */}
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-8 h-0.5 bg-muted-foreground/30 rounded-full" />
              </div>

              {/* Current Page Info */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <CurrentPageIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground text-sm">{currentPage}</h3>
                      <p className="text-xs text-muted-foreground">{getCurrentPageDescription()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {showNotifications && notificationCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {notificationCount}
                      </Badge>
                    )}
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Quick Navigation */}
              <div className="px-4 pb-4">
                <div className="flex space-x-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    const isActive = isCurrentPage(item.href)
                    const linkAttrs = getLinkAttributes(item.href)
                    
                    return (
                      <Link key={item.name} href={item.href} {...linkAttrs} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant={isActive ? "default" : "ghost"}
                          size="sm"
                          className={`flex-1 h-10 relative transition-all duration-200 ${
                            isActive 
                              ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                              : "hover:bg-muted/50 hover:scale-102"
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                          {isActive && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-foreground rounded-full border-2 border-background" />
                          )}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t-2 border-primary/20">
            <SheetHeader className="pb-4">
              <div className="flex justify-center pt-2 pb-4">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
              </div>
              
              {/* Current Page Section */}
              <div className="flex items-center space-x-3 px-2">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <CurrentPageIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <SheetTitle className="text-left text-lg">{currentPage}</SheetTitle>
                  <p className="text-sm text-muted-foreground">{getCurrentPageDescription()}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              </div>
            </SheetHeader>

            <div className="space-y-6">
              {/* Navigation Menu */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 px-2">Navigation</h4>
                <div className="grid grid-cols-2 gap-3">
                  {navigationItems.map((item) => {
                    const Icon = item.icon
                    const isActive = isCurrentPage(item.href)
                    const linkAttrs = getLinkAttributes(item.href)
                    
                    return (
                      <Link key={item.name} href={item.href} {...linkAttrs} onClick={handleNavigationClick}>
                        <Button
                          variant={isActive ? "default" : "outline"}
                          className={`w-full h-auto p-4 flex flex-col items-center gap-2 transition-all duration-200 ${
                            isActive 
                              ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                              : "hover:bg-muted/50 hover:scale-102"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isActive ? "bg-primary-foreground/20" : "bg-muted"
                          }`}>
                            <Icon className={`w-5 h-5 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                          </div>
                          <div className="text-center">
                            <div className={`text-sm font-medium ${isActive ? "text-primary-foreground" : "text-foreground"}`}>
                              {item.name}
                            </div>
                            <div className={`text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                              {item.description}
                            </div>
                          </div>
                          {isActive && (
                            <div className="absolute top-2 right-2 w-2 h-2 bg-primary-foreground rounded-full" />
                          )}
                        </Button>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 px-2">Quick Actions</h4>
                <div className="flex space-x-3 px-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    New Resume
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Search className="w-4 h-4 mr-2" />
                    Find Jobs
                  </Button>
                </div>
              </div>

              {/* User Section */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center space-x-3 px-2">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={user?.image || session?.user?.image} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground text-sm">
                      {user?.name || session?.user?.name || 'User'}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {user?.email || session?.user?.email || 'user@example.com'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Bottom Spacing for Mobile */}
      <div className="h-24 lg:hidden" />
    </>
  )
} 