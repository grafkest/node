export function preparePlannerModuleSelections(moduleIds: string[]): {
  potentialModules: string[];
  plannedModuleIds: string[];
} {
  const normalized = moduleIds
    .map((moduleId) => moduleId.trim())
    .filter((moduleId) => moduleId.length > 0);

  const unique = Array.from(new Set(normalized));

  return {
    potentialModules: unique,
    plannedModuleIds: [...unique]
  };
}
