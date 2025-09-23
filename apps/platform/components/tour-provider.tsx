"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TourContextType {
  isTourOpen: boolean;
  isFirstTime: boolean;
  startTour: () => void;
  closeTour: () => void;
  completeTour: () => void;
  resetTour: () => void;
  restartTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Check if user is first time visitor
  useEffect(() => {
    const hasCompletedTour = localStorage.getItem('governs-ai-onboarding-completed');
    const isFirstTimeUser = !hasCompletedTour;

    setIsFirstTime(isFirstTimeUser);

    if (isFirstTimeUser) {
      // Auto-start tour for first-time users after a delay
      const timer = setTimeout(() => {
        setIsTourOpen(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const startTour = () => {
    console.log('Starting onboarding tour');
    setIsTourOpen(true);
  };

  const closeTour = () => {
    setIsTourOpen(false);
  };

  const completeTour = () => {
    localStorage.setItem('governs-ai-onboarding-completed', 'true');
    setIsTourOpen(false);
    setIsFirstTime(false);
  };

  const resetTour = () => {
    localStorage.removeItem('governs-ai-onboarding-completed');
    setIsFirstTime(true);
    setIsTourOpen(false);
  };

  const restartTour = () => {
    console.log('Restarting tour - current state:', { isTourOpen, isFirstTime });
    // Force a state update by setting to false first, then true
    setIsTourOpen(false);
    // Use setTimeout to ensure the state change is processed
    setTimeout(() => {
      setIsTourOpen(true);
      console.log('Tour state after restart (delayed):', { isTourOpen: true, isFirstTime });
    }, 10);
  };

  // Debug logging for state changes
  useEffect(() => {
    console.log('Tour state changed:', { isTourOpen, isFirstTime });
  }, [isTourOpen, isFirstTime]);

  const value: TourContextType = {
    isTourOpen,
    isFirstTime,
    startTour,
    closeTour,
    completeTour,
    resetTour,
    restartTour,
  };

  // Test context value
  console.log('TourProvider rendering with value:', value);

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
