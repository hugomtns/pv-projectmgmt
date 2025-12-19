import { Header } from '@/components/layout/Header';
import { RoleDefaults } from '@/components/permissions/RoleDefaults';

export function Permissions() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Header title="Permissions Management">
        <div className="flex gap-4 flex-1 max-w-4xl justify-end">
          {/* Future: Add button for creating custom roles */}
        </div>
      </Header>

      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">
          <RoleDefaults />
        </div>
      </div>
    </div>
  );
}
