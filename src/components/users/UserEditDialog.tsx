import { useState, useEffect } from 'react';
import { UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUserStore } from '@/stores/userStore';
import { toast } from 'sonner';
import type { User } from '@/lib/types';

interface UserEditDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserEditDialog({ user, open, onOpenChange }: UserEditDialogProps) {
  const roles = useUserStore(state => state.roles);
  const updateUser = useUserStore(state => state.updateUser);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    function: '',
    roleId: 'role-user',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-populate form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        function: user.function,
        roleId: user.roleId,
      });
      setErrors({});
    }
  }, [user]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.function.trim()) {
      newErrors.function = 'Job function is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!user || !validateForm()) {
      return;
    }

    updateUser(user.id, {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      function: formData.function.trim(),
      roleId: formData.roleId,
    });

    toast.success('User updated successfully', {
      description: `Changes to ${formData.firstName} ${formData.lastName} have been saved.`,
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Edit User
          </DialogTitle>
          <DialogDescription>
            Update user information for {user.firstName} {user.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-firstName">First Name *</Label>
            <Input
              id="edit-firstName"
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className={errors.firstName ? 'border-destructive' : ''}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-lastName">Last Name *</Label>
            <Input
              id="edit-lastName"
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className={errors.lastName ? 'border-destructive' : ''}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-email">Email *</Label>
            <Input
              id="edit-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-function">Job Function *</Label>
            <Input
              id="edit-function"
              type="text"
              value={formData.function}
              onChange={(e) => setFormData({ ...formData, function: e.target.value })}
              className={errors.function ? 'border-destructive' : ''}
            />
            {errors.function && (
              <p className="text-sm text-destructive">{errors.function}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role">Role *</Label>
            <Select
              value={formData.roleId}
              onValueChange={(value: string) => setFormData({ ...formData, roleId: value })}
            >
              <SelectTrigger id="edit-role">
                <SelectValue />
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
