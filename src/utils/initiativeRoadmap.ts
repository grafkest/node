import type { TeamRole } from '../data';

export type RoadmapAssignment = {
  id: string;
  role: TeamRole;
  startDay: number;
  durationDays: number;
  effortDays?: number;
};

export type RoadmapScenarioOption = {
  specialists: number;
  startDay: number;
  endDay: number;
  durationDays: number;
  idleDays: number;
  totalEffortDays: number;
  startDate?: Date | null;
  endDate?: Date | null;
};

export type RoadmapScenario = {
  role: TeamRole;
  overloaded: boolean;
  options: RoadmapScenarioOption[];
};

const clampDuration = (value: number): number => Math.max(1, Math.round(value));

const scheduleWithCapacity = (
  assignments: RoadmapAssignment[],
  capacity: number
): RoadmapScenarioOption | null => {
  if (assignments.length === 0 || capacity <= 0) {
    return null;
  }

  const normalized = assignments
    .map((assignment) => ({
      ...assignment,
      startDay: Math.max(0, Math.round(assignment.startDay)),
      durationDays: clampDuration(assignment.durationDays)
    }))
    .sort((a, b) => a.startDay - b.startDay);

  const lanes = Array.from({ length: capacity }, () => 0);
  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = 0;

  normalized.forEach((assignment) => {
    lanes.sort((a, b) => a - b);
    const availableAt = lanes.shift() ?? 0;
    const actualStart = Math.max(availableAt, assignment.startDay);
    const actualEnd = actualStart + assignment.durationDays;
    lanes.push(actualEnd);

    minStart = Math.min(minStart, actualStart);
    maxEnd = Math.max(maxEnd, actualEnd);
  });

  const totalEffortDays = normalized.reduce(
    (sum, assignment) => sum + (assignment.effortDays ? Math.max(1, Math.round(assignment.effortDays)) : assignment.durationDays),
    0
  );
  const totalCapacityWindow = Math.max(0, maxEnd - minStart) * capacity;
  const idleDays = Math.max(0, totalCapacityWindow - totalEffortDays);

  return {
    specialists: capacity,
    startDay: minStart === Number.POSITIVE_INFINITY ? 0 : minStart,
    endDay: maxEnd,
    durationDays: Math.max(0, maxEnd - minStart),
    idleDays,
    totalEffortDays
  };
};

const resolveRequiredByRole = (
  roleRequirements: Map<TeamRole, number> | Array<{ role: TeamRole; required: number }>,
  role: TeamRole
): number => {
  if (Array.isArray(roleRequirements)) {
    const record = roleRequirements.find((entry) => entry.role === role);
    return Math.max(1, record?.required ?? 1);
  }
  const value = roleRequirements.get(role);
  return Math.max(1, value ?? 1);
};

export type RoadmapScenarioParams = {
  assignments: RoadmapAssignment[];
  roleRequirements?: Map<TeamRole, number> | Array<{ role: TeamRole; required: number }>;
  maxExtraPerRole?: number;
};

export function buildRoadmapScenarios({
  assignments,
  roleRequirements = new Map(),
  maxExtraPerRole = 2
}: RoadmapScenarioParams): RoadmapScenario[] {
  const byRole = new Map<TeamRole, RoadmapAssignment[]>();
  assignments.forEach((assignment) => {
    const list = byRole.get(assignment.role) ?? [];
    list.push(assignment);
    byRole.set(assignment.role, list);
  });

  return Array.from(byRole.entries()).map(([role, roleAssignments]) => {
    const required = resolveRequiredByRole(roleRequirements, role);
    const totalAssignments = roleAssignments.length;
    const maxCapacity = Math.min(Math.max(required + maxExtraPerRole, required), Math.max(required, totalAssignments, 1));

    const options: RoadmapScenarioOption[] = [];
    for (let capacity = required; capacity <= maxCapacity; capacity += 1) {
      const option = scheduleWithCapacity(roleAssignments, capacity);
      if (option) {
        options.push(option);
      }
    }

    const baseline = options[0];
    const best = options.reduce((shortest, option) =>
      option.durationDays < shortest.durationDays ? option : shortest
    , baseline ?? options[0]);
    const overloaded = baseline !== undefined && best !== undefined ? baseline.durationDays > best.durationDays : false;

    return {
      role,
      overloaded,
      options
    };
  });
}
