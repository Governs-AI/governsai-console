"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useTour } from '@/components/tour-provider';

interface TourTriggerProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function TourTrigger({ 
  variant = 'outline', 
  size = 'sm', 
  className = '' 
}: TourTriggerProps) {
  const { restartTour, isFirstTime } = useTour();

  const handleClick = () => {
    console.log('Tour triggered', isFirstTime);
    restartTour();
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={`bg-background/90 backdrop-blur-sm border-2 border-primary/20 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 shadow-lg hover:shadow-xl ${className}`}
    >
      <HelpCircle className="w-4 h-4 mr-2 text-primary" />
      Take Tour
    </Button>
  );
}
