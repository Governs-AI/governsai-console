"use client";

import React from "react";
import { motion } from "framer-motion";

interface ProgressRingProps {
  value: number;
  target: number;
  label: string;
  gradient: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({
  value,
  target,
  label,
  gradient,
  size = 140,
  strokeWidth = 8,
  className = "",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(value / target, 1);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - progress * circumference;

  const getGradientId = () =>
    `gradient-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className={`flex flex-col items-center space-y-3 ${className}`}>
      <div className="relative">
        <svg
          width={size}
          height={size}
          className="progress-ring transform -rotate-90"
        >
          <defs>
            <linearGradient
              id={getGradientId()}
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              {gradient === "blue" && (
                <>
                  <stop offset="0%" stopColor="#2A4BFF" />
                  <stop offset="100%" stopColor="#338BFF" />
                </>
              )}
              {gradient === "green" && (
                <>
                  <stop offset="0%" stopColor="#24E79F" />
                  <stop offset="100%" stopColor="#22C3B4" />
                </>
              )}
              {gradient === "purple" && (
                <>
                  <stop offset="0%" stopColor="#A862FF" />
                  <stop offset="100%" stopColor="#D754FF" />
                </>
              )}
              {gradient === "orange" && (
                <>
                  <stop offset="0%" stopColor="#FF9531" />
                  <stop offset="100%" stopColor="#FF6B3D" />
                </>
              )}
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
            fill="none"
            opacity={0.3}
          />

          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${getGradientId()})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="progress-ring-circle"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{
              duration: 1.2,
              ease: [0.34, 1.56, 0.64, 1], // easeOutBack
              delay: 0.1,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              {value}
            </div>
            <div className="text-xs text-gray-400">of {target}</div>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <div className="text-sm font-medium text-[var(--text-primary)] mb-1">
          {label}
        </div>
        <div className="text-xs text-gray-400">
          {target - value > 0 ? `${target - value} to go` : "Goal reached!"}
        </div>
      </div>
    </div>
  );
}
