"use client"

import React from 'react'
import { Button } from './button'
import { Moon } from 'lucide-react'

export function ThemeToggle() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="relative w-10 h-10 rounded-full text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white transition-colors cursor-not-allowed opacity-60"
      disabled
      title="Dark mode only - This app is configured for dark theme only"
    >
      <Moon className="w-4 h-4" />
    </Button>
  )
}
