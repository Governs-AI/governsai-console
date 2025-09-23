"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { useTour } from '@/components/tour-provider';
import '../styles/custom-tour.css';

interface TourStep {
  id: string;
  title: string;
  content: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  offset?: { x: number; y: number };
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to GovernsAI! 🎉',
    content: "Let's take a tour of your AI governance platform. We'll explore each section and show you how to monitor, control, and secure your AI interactions.",
    targetSelector: '#dashboard-welcome',
    position: 'bottom',
  },
  {
    id: 'usage-overview',
    title: 'Usage Overview',
    content: 'Monitor your AI usage metrics: Total tokens consumed, API calls made, costs incurred, and performance metrics across all AI providers.',
    targetSelector: '#usage-overview',
    position: 'bottom',
  },
  {
    id: 'budget-control',
    title: 'Budget Control',
    content: 'Set spending limits and get real-time alerts when approaching budget thresholds. Control costs across all AI providers.',
    targetSelector: '#budget-control',
    position: 'bottom',
  },
  {
    id: 'policy-management',
    title: 'Policy Management',
    content: 'Define and enforce policies for AI usage including PII detection, model access controls, and usage restrictions.',
    targetSelector: '#policy-management',
    position: 'bottom',
  },
  {
    id: 'audit-logs',
    title: 'Audit Logs',
    content: 'Complete audit trail of all AI interactions for compliance and security. Track every request, response, and policy violation.',
    targetSelector: '#audit-logs',
    position: 'bottom',
  },
  {
    id: 'api-keys',
    title: 'API Key Management',
    content: 'Manage API keys for different AI providers. Rotate keys, set permissions, and monitor usage per key.',
    targetSelector: '#api-keys',
    position: 'bottom',
  }
];

export function CustomTour() {
  const { isOpen, closeTour, currentStep, nextStep, prevStep, skipTour } = useTour();
  const [isVisible, setIsVisible] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const tourRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && currentStep < tourSteps.length) {
      const step = tourSteps[currentStep];
      const element = document.querySelector(step.targetSelector) as HTMLElement;
      setTargetElement(element);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen, currentStep]);

  if (!isOpen || currentStep >= tourSteps.length) {
    return null;
  }

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  const getPosition = () => {
    if (!targetElement) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const rect = targetElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    const offset = step.offset || { x: 0, y: 0 };
    
    let top = rect.top + scrollTop + offset.y;
    let left = rect.left + scrollLeft + offset.x;

    switch (step.position) {
      case 'top':
        top = rect.top + scrollTop - 20;
        left = rect.left + scrollLeft + rect.width / 2;
        return { top: `${top}px`, left: `${left}px`, transform: 'translate(-50%, -100%)' };
      case 'bottom':
        top = rect.bottom + scrollTop + 20;
        left = rect.left + scrollLeft + rect.width / 2;
        return { top: `${top}px`, left: `${left}px`, transform: 'translate(-50%, 0)' };
      case 'left':
        top = rect.top + scrollTop + rect.height / 2;
        left = rect.left + scrollLeft - 20;
        return { top: `${top}px`, left: `${left}px`, transform: 'translate(-100%, -50%)' };
      case 'right':
        top = rect.top + scrollTop + rect.height / 2;
        left = rect.right + scrollLeft + 20;
        return { top: `${top}px`, left: `${left}px`, transform: 'translate(0, -50%)' };
      default:
        return { top: `${top}px`, left: `${left}px`, transform: 'translate(-50%, -50%)' };
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />
      
      {/* Tour Card */}
      <div
        ref={tourRef}
        className="fixed z-50 max-w-md w-full mx-4"
        style={getPosition()}
      >
        <Card className="bg-white shadow-2xl border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {currentStep + 1} of {tourSteps.length}
                </Badge>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeTour}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600 mb-4">{step.content}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {!isFirstStep && (
                  <Button variant="outline" size="sm" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={skipTour}>
                  <SkipForward className="h-4 w-4 mr-1" />
                  Skip Tour
                </Button>
              </div>
              <Button size="sm" onClick={isLastStep ? closeTour : nextStep}>
                {isLastStep ? 'Finish' : 'Next'}
                {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}