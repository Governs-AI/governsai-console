"use client"

import React from 'react'
import { Flame } from 'lucide-react'
import { motion } from 'framer-motion'

interface StreakBadgeProps {
  days: number
  onClick?: () => void
  className?: string
}

export function StreakBadge({ days, onClick, className = "" }: StreakBadgeProps) {
  if (days === 0) return null

  const isMilestone = days % 7 === 0 && days > 0

  return (
    <motion.button
      onClick={onClick}
      className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium cursor-pointer transition-all duration-200 hover:scale-105 ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={isMilestone ? {
        boxShadow: [
          "0 0 5px #FF6B3D",
          "0 0 20px #FF6B3D, 0 0 30px #FF6B3D",
          "0 0 5px #FF6B3D"
        ]
      } : {}}
      transition={{
        boxShadow: {
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }}
    >
      <Flame className="w-4 h-4" />
      <span>Day {days} streak</span>
      {isMilestone && (
        <motion.div
          className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.button>
  )
} 