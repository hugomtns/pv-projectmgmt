import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutItem[];
}

const shortcutSections: ShortcutSection[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['G', 'P'], description: 'Go to Projects' },
      { keys: ['G', 'W'], description: 'Go to Workflow Settings' },
      { keys: ['N'], description: 'New Project' },
      { keys: ['/'], description: 'Focus Search' },
    ],
  },
  {
    title: 'Priority',
    shortcuts: [
      { keys: ['0'], description: 'Set priority to On Hold' },
      { keys: ['1'], description: 'Set priority to Urgent' },
      { keys: ['2'], description: 'Set priority to High' },
      { keys: ['3'], description: 'Set priority to Medium' },
      { keys: ['4'], description: 'Set priority to Low' },
    ],
  },
  {
    title: 'Help',
    shortcuts: [{ keys: ['?'], description: 'Show keyboard shortcuts' }],
  },
];

function KeyboardKey({ children }: { children: string }) {
  return (
    <kbd className="px-2 py-1 text-xs font-semibold bg-muted border border-border rounded shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {shortcutSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold mb-3">{section.title}</h3>
              <div className="space-y-2">
                {section.shortcuts.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex} className="flex items-center gap-1">
                          <KeyboardKey>{key}</KeyboardKey>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-xs text-muted-foreground">then</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Note: Priority shortcuts work on the selected or hovered project.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
