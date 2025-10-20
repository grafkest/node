import { type ExpertAvailability, type ExpertProfile } from '../data';

const LEVEL_WEIGHTS = {
  novice: 0.4,
  intermediate: 0.7,
  advanced: 0.9,
  expert: 1
} as const;

const AVAILABILITY_MULTIPLIERS: Record<ExpertAvailability, number> = {
  available: 1,
  partial: 0.65,
  busy: 0.25
};

const AVAILABILITY_FTE: Record<ExpertAvailability, number> = {
  available: 1,
  partial: 0.5,
  busy: 0.1
};

const DEFAULT_FRESHNESS_HALF_LIFE_DAYS = 180;

export type SkillLevel = keyof typeof LEVEL_WEIGHTS;

export type SkillRequirement = {
  id?: string;
  name: string;
  weight: number;
  requiredLevel?: SkillLevel;
  freshnessHalfLifeDays?: number;
};

export type RoleRequirement = {
  roleId: string;
  roleName: string;
  skills: SkillRequirement[];
  requiredFte: number;
};

export type ExpertSkillEvidence = {
  id: string;
  name: string;
  level: SkillLevel;
  lastUsedDaysAgo: number;
};

export type MatchableExpertProfile = ExpertProfile & {
  skillEvidence?: ExpertSkillEvidence[];
  /**
   * Фактическая загрузка эксперта. Если не указана, оценивается по статусу доступности.
   */
  fteCapacity?: number;
};

export type SkillCoverageReport = {
  skill: SkillRequirement;
  hasSkill: boolean;
  coverageScore: number;
  levelFactor: number;
  freshnessFactor: number;
  gaps: string[];
};

export type RoleMatchExplanation = {
  totalScore: number;
  normalizedSkillScore: number;
  availabilityMultiplier: number;
  fteSaturation: number;
  skillCoverage: SkillCoverageReport[];
  risks: string[];
};

export type RoleMatchResult = {
  expert: MatchableExpertProfile;
  explanation: RoleMatchExplanation;
};

export type RoleMatchReport = {
  requirement: RoleRequirement;
  matches: RoleMatchResult[];
  topMatch: RoleMatchResult | null;
  averageScore: number;
};

export type InitiativeRequirement = {
  initiativeId: string;
  initiativeName: string;
  roles: RoleRequirement[];
};

export type InitiativeMatchReport = {
  initiativeId: string;
  initiativeName: string;
  roleReports: RoleMatchReport[];
  overallScore: number;
  overallRisks: string[];
};

const LOG_2 = Math.log(2);

function collectRequirementTargets(requirement: SkillRequirement): string[] {
  const targets = new Set<string>();
  if (requirement.id) {
    targets.add(requirement.id.toLowerCase());
  }
  if (requirement.name) {
    targets.add(requirement.name.toLowerCase());
  }
  return Array.from(targets);
}

function findEvidence(
  expert: MatchableExpertProfile,
  requirement: SkillRequirement
): ExpertSkillEvidence | undefined {
  const targets = collectRequirementTargets(requirement);
  if (targets.length === 0) {
    return undefined;
  }
  return expert.skillEvidence?.find((item) => {
    const evidenceValues = [item.id, item.name]
      .filter(Boolean)
      .map((value) => value.toLowerCase());
    return evidenceValues.some((value) => targets.includes(value));
  });
}

function hasSkillInProfile(
  expert: MatchableExpertProfile,
  requirement: SkillRequirement
): boolean {
  const targets = collectRequirementTargets(requirement);
  if (targets.length === 0) {
    return false;
  }
  const normalizedCompetencies = [
    ...expert.competencies,
    ...expert.consultingSkills,
    ...expert.focusAreas
  ].map((skill) => skill.toLowerCase());

  return normalizedCompetencies.some((skill) => targets.includes(skill));
}

function calculateFreshnessFactor(
  lastUsedDaysAgo: number | undefined,
  halfLifeDays: number
): number {
  if (lastUsedDaysAgo === undefined) {
    return 0.75;
  }
  if (lastUsedDaysAgo <= 0) {
    return 1;
  }
  return Math.exp((-LOG_2 * lastUsedDaysAgo) / Math.max(halfLifeDays, 1));
}

function calculateSkillCoverage(
  requirement: SkillRequirement,
  expert: MatchableExpertProfile
): SkillCoverageReport {
  const evidence = findEvidence(expert, requirement);
  const hasProfileSkill = hasSkillInProfile(expert, requirement);
  const hasSkill = Boolean(evidence) || hasProfileSkill;

  const requiredLevelWeight = requirement.requiredLevel
    ? LEVEL_WEIGHTS[requirement.requiredLevel]
    : LEVEL_WEIGHTS.expert;

  let levelFactor = 0;
  let freshnessFactor = 0;
  const gaps: string[] = [];

  if (!hasSkill) {
    gaps.push(`Нет подтвержденного навыка «${requirement.name}»`);
  }

  if (evidence) {
    const levelWeight = LEVEL_WEIGHTS[evidence.level];
    levelFactor = Math.min(levelWeight / requiredLevelWeight, 1);
    const halfLife = requirement.freshnessHalfLifeDays ?? DEFAULT_FRESHNESS_HALF_LIFE_DAYS;
    freshnessFactor = calculateFreshnessFactor(evidence.lastUsedDaysAgo, halfLife);
    if (levelFactor < 1) {
      gaps.push(
        `Уровень владения «${requirement.name}» ниже требуемого (${evidence.level} < ${
          requirement.requiredLevel ?? 'expert'
        })`
      );
    }
    if (freshnessFactor < 0.6) {
      gaps.push(
        `Навык «${requirement.name}» может быть устаревшим (использовался ${evidence.lastUsedDaysAgo} дней назад)`
      );
    }
  } else if (hasProfileSkill) {
    levelFactor = 0.65;
    freshnessFactor = 0.6;
    gaps.push(`Навык «${requirement.name}» есть в профиле, но без подтверждения уровня/свежести`);
  }

  const coverageScore = requirement.weight * hasSkill * levelFactor * freshnessFactor;

  return {
    skill: requirement,
    hasSkill,
    coverageScore,
    levelFactor,
    freshnessFactor,
    gaps
  };
}

function calculateRisks(
  coverage: SkillCoverageReport[],
  availabilityMultiplier: number,
  fteSaturation: number
): string[] {
  const risks = coverage.flatMap((item) => item.gaps);
  if (availabilityMultiplier < 1) {
    risks.push('Эксперт частично доступен для инициативы');
  }
  if (fteSaturation < 1) {
    risks.push('Недостаточная доступность по FTE для роли');
  }
  return Array.from(new Set(risks));
}

export function scoreExpertForRole(
  requirement: RoleRequirement,
  expert: MatchableExpertProfile
): RoleMatchResult {
  const coverageReports = requirement.skills.map((skill) =>
    calculateSkillCoverage(skill, expert)
  );

  const totalWeight = requirement.skills.reduce((sum, skill) => sum + skill.weight, 0);
  const normalizedSkillScore =
    totalWeight === 0
      ? 1
      : coverageReports.reduce((sum, report) => sum + report.coverageScore, 0) /
        totalWeight;

  const availabilityMultiplier = AVAILABILITY_MULTIPLIERS[expert.availability];
  const expertFte = expert.fteCapacity ?? AVAILABILITY_FTE[expert.availability];
  const fteSaturation = Math.min(expertFte / Math.max(requirement.requiredFte, 0.01), 1);

  const totalScore = normalizedSkillScore * availabilityMultiplier * fteSaturation;
  const risks = calculateRisks(coverageReports, availabilityMultiplier, fteSaturation);

  return {
    expert,
    explanation: {
      totalScore,
      normalizedSkillScore,
      availabilityMultiplier,
      fteSaturation,
      skillCoverage: coverageReports,
      risks
    }
  };
}

export function buildRoleMatchReport(
  requirement: RoleRequirement,
  experts: MatchableExpertProfile[]
): RoleMatchReport {
  const matches = experts
    .map((expert) => scoreExpertForRole(requirement, expert))
    .sort((a, b) => b.explanation.totalScore - a.explanation.totalScore);

  const averageScore =
    matches.length === 0
      ? 0
      : matches.reduce((sum, match) => sum + match.explanation.totalScore, 0) /
        matches.length;

  return {
    requirement,
    matches,
    topMatch: matches[0] ?? null,
    averageScore
  };
}

export function buildInitiativeMatchReport(
  initiative: InitiativeRequirement,
  experts: MatchableExpertProfile[]
): InitiativeMatchReport {
  const roleReports = initiative.roles.map((role) => buildRoleMatchReport(role, experts));
  const topScores = roleReports
    .map((report) => report.topMatch?.explanation.totalScore ?? 0)
    .filter((score) => score > 0);
  const overallScore =
    topScores.length === 0
      ? 0
      : topScores.reduce((sum, score) => sum + score, 0) / topScores.length;

  const overallRisks = Array.from(
    new Set(
      roleReports.flatMap((report) => report.topMatch?.explanation.risks ?? [])
    )
  );

  return {
    initiativeId: initiative.initiativeId,
    initiativeName: initiative.initiativeName,
    roleReports,
    overallScore,
    overallRisks
  };
}
