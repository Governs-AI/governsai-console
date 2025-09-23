"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'

interface XPProgressProps {
  totalXP: number
  weeklyXP: number
  className?: string
}

export function XPProgress({ totalXP, weeklyXP, className = "" }: XPProgressProps) {
  // Calculate level based on XP
  const calculateLevel = (xp: number) => Math.floor(Math.sqrt(xp / 100))
  
  // Calculate XP needed for next level
  const calculateXPForNextLevel = (currentLevel: number) => {
    const nextLevel = currentLevel + 1
    return Math.pow(nextLevel, 2) * 100
  }
  
  const currentLevel = calculateLevel(totalXP)
  const xpForNextLevel = calculateXPForNextLevel(currentLevel)
  const xpInCurrentLevel = totalXP - Math.pow(currentLevel, 2) * 100
  const xpNeededForNext = xpForNextLevel - totalXP
  const progress = (xpInCurrentLevel / (xpForNextLevel - Math.pow(currentLevel, 2) * 100)) * 100

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex flex-col space-y-2 ${className}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white">Level {currentLevel}</span>
              <span className="text-xs text-gray-400">{totalXP} XP</span>
            </div>
            
            <div className="relative">
              <div 
                className="w-full h-2 bg-gray-700 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--border-subtle)' }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'var(--surface-gradient-blue)',
                    width: `${Math.min(progress, 100)}%`
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{
                    duration: 1,
                    ease: "easeOut"
                  }}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Weekly: +{weeklyXP} XP</span>
              <span className="text-gray-400">
                {xpNeededForNext > 0 ? `${xpNeededForNext} to next` : 'Max level!'}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Next level in {xpNeededForNext} XP</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
} 