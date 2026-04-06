import { usePermissionsStore } from '@/stores/permissions'

export function usePermissions() {
  const store = usePermissionsStore()

  return {
    can: (permission: string) => store.can(permission),
    canAny: (...perms: string[]) => store.canAny(...perms),
    permissions: store.permissions,
  }
}
