import { useState } from 'react';
import { useUserStore } from '@/stores/userStore';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserInviteDialog({ open, onOpenChange }: UserInviteDialogProps) {
  const addUser = useUserStore(state => state.addUser);
  const roles = useUserStore(state => state.roles);
  const groups = useUserStore(state => state.groups);
  const updateGroup = useUserStore(state => state.updateGroup);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [functionTitle, setFunctionTitle] = useState('');
  const [roleId, setRoleId] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupsOpen, setGroupsOpen] = useState(false);

  const handleToggleGroup = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleRemoveGroup = (groupId: string) => {
    setSelectedGroupIds((prev) => prev.filter((id) => id !== groupId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !functionTitle.trim() || !roleId) {
      toast.error('All fields are required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Add user with selected groups
    const userId = addUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      function: functionTitle.trim(),
      roleId,
      groupIds: selectedGroupIds,
    });

    // Update group memberIds for bidirectional sync
    if (userId && selectedGroupIds.length > 0) {
      for (const groupId of selectedGroupIds) {
        const group = groups.find(g => g.id === groupId);
        if (group && !group.memberIds.includes(userId)) {
          updateGroup(groupId, {
            memberIds: [...group.memberIds, userId],
          });
        }
      }
    }

    // Show success toast
    toast.success('User invited successfully', {
      description: `${firstName} ${lastName} has been added to the system.`,
    });

    // Clear form and close dialog
    setFirstName('');
    setLastName('');
    setEmail('');
    setFunctionTitle('');
    setRoleId('');
    setSelectedGroupIds([]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const selectedGroups = groups.filter((g) => selectedGroupIds.includes(g.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="function">Function/Title *</Label>
            <Input
              id="function"
              value={functionTitle}
              onChange={(e) => setFunctionTitle(e.target.value)}
              placeholder="Project Manager"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional group assignment - multi-select dropdown */}
          <div className="space-y-2">
            <Label>User Groups</Label>
            <Popover open={groupsOpen} onOpenChange={setGroupsOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={groupsOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedGroupIds.length === 0
                    ? 'Select groups...'
                    : `${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? 's' : ''} selected`}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[1200] w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search groups..." />
                  <CommandList>
                    <CommandEmpty>No groups found.</CommandEmpty>
                    <CommandGroup>
                      {groups.map((group) => (
                        <CommandItem
                          key={group.id}
                          value={group.name}
                          onSelect={() => handleToggleGroup(group.id)}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedGroupIds.includes(group.id)
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <span className="flex-1">{group.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {group.memberIds.length} {group.memberIds.length === 1 ? 'member' : 'members'}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected group badges */}
            {selectedGroups.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedGroups.map((group) => (
                  <Badge key={group.id} variant="secondary" className="gap-1 pr-1">
                    {group.name}
                    <button
                      type="button"
                      className="ml-0.5 rounded-full outline-none hover:bg-muted-foreground/20 p-0.5"
                      onClick={() => handleRemoveGroup(group.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Invite User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
