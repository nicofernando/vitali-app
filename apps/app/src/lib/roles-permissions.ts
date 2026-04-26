import type { Permission } from '@/types'

export function groupPermissionsByModule(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module])
      acc[p.module] = []
    acc[p.module].push(p)
    return acc
  }, {})
}

export function isModuleFullySelected(
  module: string,
  selected: string[],
  allPermissions: Permission[],
): boolean {
  const modulePerms = allPermissions.filter(p => p.module === module)
  if (modulePerms.length === 0)
    return false
  return modulePerms.every(p => selected.includes(p.id))
}

export function toggleModule(
  module: string,
  selected: string[],
  allPermissions: Permission[],
  checked: boolean,
): string[] {
  const moduleIds = allPermissions.filter(p => p.module === module).map(p => p.id)
  if (checked) {
    return [...new Set([...selected, ...moduleIds])]
  }
  return selected.filter(id => !moduleIds.includes(id))
}
