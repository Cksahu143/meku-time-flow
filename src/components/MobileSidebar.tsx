import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Sidebar } from '@/components/Sidebar';
import { ViewType } from '@/types';

interface MobileSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ currentView, onViewChange }) => {
  const [open, setOpen] = useState(false);

  const handleViewChange = (view: ViewType) => {
    onViewChange(view);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden fixed top-4 left-4 z-50">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-60">
        <Sidebar currentView={currentView} onViewChange={handleViewChange} />
      </SheetContent>
    </Sheet>
  );
};
