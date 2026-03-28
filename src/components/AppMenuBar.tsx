import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menubar, MenubarMenu, MenubarTrigger, MenubarContent,
  MenubarItem, MenubarSeparator, MenubarShortcut,
} from '@/components/ui/menubar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { ViewType } from '@/types';

interface AppMenuBarProps {
  onViewChange: (view: ViewType) => void;
  currentView: ViewType;
}

export const AppMenuBar: React.FC<AppMenuBarProps> = ({ onViewChange, currentView }) => {
  const navigate = useNavigate();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'up-to-date' | 'available'>('idle');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleCheckUpdates = async () => {
    setUpdateState('checking');
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.update();
        if (reg.waiting) {
          setUpdateState('available');
          return;
        }
      }
      setTimeout(() => setUpdateState('up-to-date'), 1200);
    } catch {
      setTimeout(() => setUpdateState('up-to-date'), 1200);
    }
  };

  const handleRelaunch = async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        // controllerchange listener in main.tsx/PWAUpdatePrompt will reload
        // fallback reload after 1s if controllerchange doesn't fire
        setTimeout(() => window.location.reload(), 1000);
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  const handleQuit = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const stub = (label: string) => {
    toast({ title: label, description: 'This feature is coming soon.' });
  };

  const exec = (cmd: string) => {
    document.execCommand(cmd);
  };

  const views: { label: string; view: ViewType }[] = [
    { label: 'Dashboard', view: 'dashboard' },
    { label: 'Timetable', view: 'timetable' },
    { label: 'Calendar', view: 'calendar' },
    { label: 'Resources', view: 'resources' },
    { label: 'Groups', view: 'groups' },
    { label: 'To-Do', view: 'todo' },
    { label: 'Pomodoro', view: 'pomodoro' },
    { label: 'Transcribe', view: 'transcribe' },
    { label: 'About', view: 'about' },
  ];

  const shortcuts = [
    { keys: '⌘/Ctrl + Z', action: 'Undo' },
    { keys: '⌘/Ctrl + Shift + Z', action: 'Redo' },
    { keys: '⌘/Ctrl + X', action: 'Cut' },
    { keys: '⌘/Ctrl + C', action: 'Copy' },
    { keys: '⌘/Ctrl + V', action: 'Paste' },
    { keys: '⌘/Ctrl + A', action: 'Select All' },
  ];

  return (
    <>
      <Menubar className="hidden md:flex h-8 rounded-none border-x-0 border-t-0 border-b bg-background px-2 text-xs">
        {/* EDAS Menu */}
        <MenubarMenu>
          <MenubarTrigger className="font-bold text-xs px-2 py-1">EDAS</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => setAboutOpen(true)}>
              About EDAS
            </MenubarItem>
            <MenubarItem onSelect={handleCheckUpdates} disabled={updateState === 'checking'}>
              {updateState === 'checking' ? (
                <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Checking…</span>
              ) : updateState === 'up-to-date' ? (
                <span className="flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-primary" /> Up to date ✓</span>
              ) : updateState === 'available' ? (
                <span className="flex items-center gap-2"><AlertCircle className="h-3 w-3 text-destructive" /> Update available</span>
              ) : (
                'Check for Updates…'
              )}
            </MenubarItem>
            {updateState === 'available' && (
              <MenubarItem onSelect={handleRelaunch} className="text-primary font-medium">
                Relaunch to Update
              </MenubarItem>
            )}
            <MenubarSeparator />
            <MenubarItem onSelect={handleQuit}>
              Quit <MenubarShortcut>⌘Q</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* File Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs px-2 py-1">File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem disabled onSelect={() => stub('New')}>New <MenubarShortcut>⌘N</MenubarShortcut></MenubarItem>
            <MenubarItem disabled onSelect={() => stub('Open')}>Open <MenubarShortcut>⌘O</MenubarShortcut></MenubarItem>
            <MenubarItem disabled onSelect={() => stub('Save')}>Save <MenubarShortcut>⌘S</MenubarShortcut></MenubarItem>
            <MenubarItem disabled onSelect={() => stub('Save As')}>Save As… <MenubarShortcut>⇧⌘S</MenubarShortcut></MenubarItem>
            <MenubarItem disabled onSelect={() => stub('Export')}>Export</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={handleQuit}>Close <MenubarShortcut>⌘W</MenubarShortcut></MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Edit Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs px-2 py-1">Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => exec('undo')}>Undo <MenubarShortcut>⌘Z</MenubarShortcut></MenubarItem>
            <MenubarItem onSelect={() => exec('redo')}>Redo <MenubarShortcut>⇧⌘Z</MenubarShortcut></MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => exec('cut')}>Cut <MenubarShortcut>⌘X</MenubarShortcut></MenubarItem>
            <MenubarItem onSelect={() => exec('copy')}>Copy <MenubarShortcut>⌘C</MenubarShortcut></MenubarItem>
            <MenubarItem onSelect={() => exec('paste')}>Paste <MenubarShortcut>⌘V</MenubarShortcut></MenubarItem>
            <MenubarItem onSelect={() => exec('selectAll')}>Select All <MenubarShortcut>⌘A</MenubarShortcut></MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* View Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs px-2 py-1">View</MenubarTrigger>
          <MenubarContent>
            {views.map(v => (
              <MenubarItem
                key={v.view}
                onSelect={() => onViewChange(v.view)}
                className={currentView === v.view ? 'bg-accent' : ''}
              >
                {v.label}
              </MenubarItem>
            ))}
          </MenubarContent>
        </MenubarMenu>

        {/* Help Menu */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs px-2 py-1">Help</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onSelect={() => onViewChange('about')}>Documentation</MenubarItem>
            <MenubarItem onSelect={() => setShortcutsOpen(true)}>Keyboard Shortcuts</MenubarItem>
            <MenubarSeparator />
            <MenubarItem onSelect={() => stub('Report a Bug')}>Report a Bug</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* About Dialog */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">EDAS</DialogTitle>
            <DialogDescription className="text-center space-y-2 pt-2">
              <p className="text-sm text-muted-foreground">Version 1.1.0</p>
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} EDAS. All rights reserved.
              </p>
              <p className="text-sm font-medium text-foreground pt-2">
                Created & Developed by Charukrishna Sahu
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            {shortcuts.map(s => (
              <div key={s.action} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{s.action}</span>
                <kbd className="px-2 py-0.5 rounded bg-muted text-xs font-mono">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
