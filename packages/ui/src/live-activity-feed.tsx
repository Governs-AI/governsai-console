"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { LiveActivityEvent } from "@/lib/types";

interface LiveActivityFeedProps {
  events: LiveActivityEvent[];
  className?: string;
}

export function LiveActivityFeed({
  events,
  className = "",
}: LiveActivityFeedProps) {
  const [visibleEvents, setVisibleEvents] = useState<LiveActivityEvent[]>([]);

  useEffect(() => {
    // Add new events to visible list
    const newEvents = events.filter(
      (event) => !visibleEvents.find((visible) => visible.id === event.id)
    );

    if (newEvents.length > 0) {
      setVisibleEvents((prev) => [...prev, ...newEvents]);
    }
  }, [events]);

  // useEffect(() => {
  //   // Auto-dismiss events after 10 seconds
  //   const timers = visibleEvents.map(event =>
  //     setTimeout(() => {
  //       setVisibleEvents(prev => prev.filter(e => e.id !== event.id))
  //     }, 10000)
  //   )

  //   return () => timers.forEach(timer => clearTimeout(timer))
  // }, [visibleEvents])

  const getEventIcon = (type: LiveActivityEvent["type"]) => {
    switch (type) {
      case "application_submitted":
        return "📝";
      case "interview_invite":
        return "🎯";
      case "user_levelup":
        return "🏆";
      case "job_match":
        return "💼";
      case "streak_milestone":
        return "🔥";
      default:
        return "📢";
    }
  };

  const getEventColor = (type: LiveActivityEvent["type"]) => {
    switch (type) {
      case "application_submitted":
        return "var(--success-green)";
      case "interview_invite":
        return "var(--surface-gradient-purple)";
      case "user_levelup":
        return "var(--brand-neon)";
      case "job_match":
        return "var(--surface-gradient-blue)";
      case "streak_milestone":
        return "var(--attention-orange)";
      default:
        return "var(--text-secondary)";
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 z-40 max-w-sm ${className}`}>
      <AnimatePresence>
        {visibleEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{
              x: 320,
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              x: 0,
              opacity: 1,
              scale: 1,
            }}
            exit={{
              x: 320,
              opacity: 0,
              scale: 0.9,
            }}
            transition={{
              type: "spring",
              stiffness: 120,
              damping: 15,
              delay: index * 0.1,
            }}
            className="mb-3 bg-surface-01 border border-border-subtle rounded-lg p-4 shadow-lg backdrop-blur-sm"
            style={{
              backgroundColor: "var(--surface-01)",
              borderColor: "var(--border-subtle)",
            }}
          >
            <div className="flex items-start space-x-3">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: getEventColor(event.type) + "20" }}
              >
                {getEventIcon(event.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-white truncate">
                    {event.title}
                  </h4>
                  <button
                    onClick={() =>
                      setVisibleEvents((prev) =>
                        prev.filter((e) => e.id !== event.id)
                      )
                    }
                    className="flex-shrink-0 ml-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {event.description}
                </p>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(event.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
