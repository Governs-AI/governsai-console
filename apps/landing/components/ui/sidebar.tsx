"use client";

import React, { useState, useEffect } from "react";
import { Button } from "./button";
import { ScrollArea } from "./scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { Menu } from "lucide-react";

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <ScrollArea className="h-full py-6">{children}</ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="hidden md:block w-64 border-r bg-background">
      <ScrollArea className="h-full py-6">{children}</ScrollArea>
    </div>
  );
}
