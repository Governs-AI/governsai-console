"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, Settings, User, LogOut, Zap, Sparkles } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Logo } from "@/components/ui/logo"
import { StreakBadge } from "@/components/ui/streak-badge"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface HeaderProps {
  showNavigation?: boolean
  user?: {
    name: string
    email: string
    avatar?: string
    plan: string
    streakDays?: number
  }
  onStreakClick?: () => void
}

export function Header({ showNavigation = false, user, onStreakClick }: HeaderProps) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: process.env.NEXT_PUBLIC_ENTRY_POINT_URL || "/" })
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navigationItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/jobs", label: "Jobs" },
    { href: "/applications", label: "Applications" },
    { href: "/resume", label: "Resume" },
    { href: "/interview-prep", label: "Interview Prep" },
    { href: "/insights", label: "Insights" },
  ]

  return (
    <motion.header 
      className={`sticky top-0 z-50 transition-all duration-300 border-b border-border-subtle`}
      style={{
        backgroundColor: 'var(--surface-01)',
        borderColor: 'var(--border-subtle)',
        backdropFilter: isScrolled ? 'blur(8px)' : 'none'
      }}
    >
      <div className="px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 lg:space-x-8">
            <Logo href={user ? "/dashboard" : "/"} size="md" />

            {showNavigation && (
              <nav className="hidden lg:flex items-center space-x-6">
                {navigationItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-medium transition-colors hover:text-white ${
                      pathname === item.href ? "text-white" : "text-gray-400"
                    }`}
                    style={{
                      color: pathname === item.href ? 'var(--text-primary)' : 'var(--text-secondary)'
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center space-x-2 lg:space-x-4">
            {user ? (
              <>
                {/* Streak Badge */}
                {user.streakDays && user.streakDays > 0 && (
                  <div className="hidden sm:block">
                    <StreakBadge 
                      days={user.streakDays} 
                      onClick={onStreakClick}
                    />
                  </div>
                )}

                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 hidden sm:inline-flex">
                  <Zap className="w-3 h-3 mr-1" />
                  {user.plan}
                </Badge>

                <div className="relative">
                  <Button variant="ghost" size="sm" className="relative hover:text-white" style={{ color: 'var(--text-secondary)' }}>
                    <Bell className="h-4 w-4" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-400 rounded-full" />
                  </Button>
                </div>

                <ThemeToggle />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-9 w-9 ring-2 ring-blue-500/20">
                        <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    className="w-56 border-border-subtle" 
                    align="end" 
                    forceMount
                    style={{ 
                      backgroundColor: 'var(--surface-01)',
                      borderColor: 'var(--border-subtle)'
                    }}
                  >
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
                        <p className="text-xs leading-none" style={{ color: 'var(--text-secondary)' }}>{user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator style={{ backgroundColor: 'var(--border-subtle)' }} />
                    <DropdownMenuItem 
                      asChild 
                      className="hover:bg-gray-800/50 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      asChild 
                      className="hover:bg-gray-800/50 transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Link href="/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator style={{ backgroundColor: 'var(--border-subtle)' }} />
                    <DropdownMenuItem 
                      className="hover:bg-gray-800/50 transition-colors cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" className="font-medium hover:text-white" style={{ color: 'var(--text-secondary)' }}>
                  Sign In
                </Button>
                <Button
                  className="shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
                  style={{
                    background: 'var(--brand-neon)',
                    color: 'var(--primary-bg)'
                  }}
                  asChild
                >
                  <Link href="/onboarding">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  )
}
