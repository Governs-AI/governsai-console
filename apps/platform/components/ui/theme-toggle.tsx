"use client"

import React, { useEffect, useState } from 'react'
import { Button } from './button'
import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    if (!mounted) return
    const currentTheme = resolvedTheme || theme
    setTheme(currentTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full text-gray-400 hover:text-white transition-colors"
      disabled={!mounted}
    >
      <motion.div
        initial={false}
        animate={{ rotate: mounted && (resolvedTheme || theme) === 'dark' ? 0 : 180 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        {mounted && (resolvedTheme || theme) === 'dark' ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </motion.div>
    </Button>
  )
} 