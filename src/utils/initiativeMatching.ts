import {
  buildRoleMatchReport,
  type ExpertSkillEvidence,
  type MatchableExpertProfile,
  type RoleMatchReport,
  type RoleRequirement,
  type SkillLevel,
  type SkillRequirement
} from '../services/matching';
import { getSkillLastUsedDate } from '../services/expertSkills';
import {
  getSkillsByRole,
  skills as skillCatalog,
  type ExpertProfile,
  type ExpertSkill,
  type InitiativeCandidate,
  type TeamRole
} from '../data';
import type { InitiativeRoleWork } from '../data';

const MS_IN_DAY = 86_400_000;

const skillLevelMap: Record<ExpertSkill['level'], SkillLevel> = {
  A: 'expert',
  B: 'advanced',
  C: 'intermediate',
  D: 'novice',
  E: 'novice'
};

const defaultRoleLevel: Partial<Record<TeamRole, SkillLevel>> = {
  Архитектор: 'expert',
  'Эксперт R&D': 'expert',
  Backend: 'advanced',
  Frontend: 'advanced',
  Аналитик: 'advanced',
  UX: 'intermediate',
  'Руководитель проекта': 'advanced',
  'Владелец продукта': 'advanced',
  Тестировщик: 'intermediate'
};

export type RolePlanningWorkDraft = {
  id: string;
  title: string;
  description: string;
  startDay: number;
  durationDays: number;
  effortDays: number;
  tasks: string[];
};

export type RolePlanningDraft = {
  id: string;
  role: TeamRole;
  required: number;
  skills: string[];
  workItems: RolePlanningWorkDraft[];
};

function resolveSkillName(skillId: string): string {
  const definition = skillCatalog[skillId];
  if (definition) {
    return definition.name;
  }
  return skillId
    .split('-')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function toSkillEvidence(skill: ExpertSkill): ExpertSkillEvidence {
  const name = resolveSkillName(skill.id);
  const rawDate = getSkillLastUsedDate(skill);
  const timestamp = rawDate ? Date.parse(rawDate) : Number.NaN;
  const daysAgo = Number.isNaN(timestamp)
    ? undefined
    : Math.max(0, Math.round((Date.now() - timestamp) / MS_IN_DAY));

  return {
    name,
    level: skillLevelMap[skill.level] ?? 'novice',
    lastUsedDaysAgo: daysAgo ?? 365
  };
}

function toMatchableExpert(expert: ExpertProfile): MatchableExpertProfile {
  const skillEvidence = expert.skills.map(toSkillEvidence);
  const totalFte = expert.skills.reduce((sum, skill) => sum + Math.max(0, skill.availableFte), 0);
  const fteCapacity = totalFte > 0 ? Math.min(1, totalFte) : undefined;

  return {
    ...expert,
    skillEvidence,
    fteCapacity
  };
}

function deduplicateSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  skills.forEach((skill) => {
    const trimmed = skill.trim();
    if (!trimmed) {
      return;
    }

    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  });

  return result;
}

function buildSkillRequirements(role: RolePlanningDraft): SkillRequirement[] {
  const explicitSkills = deduplicateSkills(role.skills);
  const taskSkills = deduplicateSkills(role.workItems.flatMap((work) => work.tasks));
  const providedSkills = deduplicateSkills([...explicitSkills, ...taskSkills]);

  const defaultSkills =
    providedSkills.length > 0
      ? []
      : getSkillsByRole(role.role).map((skill) => skill.name).filter(Boolean);

  const allSkills = deduplicateSkills([...providedSkills, ...defaultSkills]);
  const normalizedNames = allSkills.length > 0 ? allSkills : [`Экспертиза: ${role.role}`];
  const weight = normalizedNames.length > 0 ? 1 / normalizedNames.length : 1;
  const level = defaultRoleLevel[role.role] ?? 'advanced';

  return normalizedNames.map((name) => ({
    name,
    weight,
    requiredLevel: level
  }));
}

function estimateRequiredFte(role: RolePlanningDraft): number {
  if (role.workItems.length === 0) {
    return Math.max(1, role.required);
  }

  const normalized = role.workItems.map((item) => ({
    start: Math.max(0, Math.round(item.startDay)),
    end: Math.max(0, Math.round(item.startDay + item.durationDays)),
    effort: Math.max(0, Math.round(item.effortDays))
  }));

  const earliestStart = Math.min(...normalized.map((item) => item.start));
  const latestEnd = Math.max(...normalized.map((item) => item.end));
  const span = Math.max(latestEnd - earliestStart, 1);
  const totalEffort = normalized.reduce((sum, item) => sum + item.effort, 0);
  const calculatedFte = span > 0 ? totalEffort / span : totalEffort;

  return Math.max(role.required, Number.isFinite(calculatedFte) ? calculatedFte : role.required);
}

function buildRequirement(role: RolePlanningDraft): RoleRequirement {
  return {
    roleId: role.id,
    roleName: role.role,
    requiredFte: estimateRequiredFte(role),
    skills: buildSkillRequirements(role)
  };
}

export function buildRoleMatchReports(
  roles: RolePlanningDraft[],
  experts: ExpertProfile[]
): RoleMatchReport[] {
  if (roles.length === 0 || experts.length === 0) {
    return roles.map((role) => ({
      requirement: buildRequirement(role),
      matches: [],
      topMatch: null,
      averageScore: 0
    }));
  }

  const matchableExperts = experts.map(toMatchableExpert);

  return roles.map((role) => {
    const requirement = buildRequirement(role);
    return buildRoleMatchReport(requirement, matchableExperts);
  });
}

export function buildCandidatesFromReport(report: RoleMatchReport): InitiativeCandidate[] {
  if (report.matches.length === 0) {
    return [];
  }

  const skillCount = report.matches[0]?.explanation.skillCoverage.length ?? 0;
  const skillWeight = skillCount > 0 ? 0.6 / skillCount : 0;

  return report.matches.map((match) => {
    const skillScore = match.explanation.normalizedSkillScore;
    const availability = match.explanation.availabilityMultiplier;
    const fte = match.explanation.fteSaturation;
    const totalScore = Math.min(100, Math.max(0, Math.round(match.explanation.totalScore * 100)));

    const commentParts: string[] = [];
    if (skillScore >= 0.85) {
      commentParts.push('Отлично покрывает ключевые навыки роли');
    } else if (skillScore >= 0.6) {
      commentParts.push('Основные компетенции закрыты, но есть зоны роста');
    } else {
      commentParts.push('Есть заметные пробелы по навыкам роли');
    }

    if (availability >= 1 && fte >= 1) {
      commentParts.push('Доступен для подключения в полном объёме');
    } else {
      if (availability < 1) {
        commentParts.push('Доступность ограничена текущей загрузкой');
      }
      if (fte < 1) {
        commentParts.push('Требуется подстраховка по FTE');
      }
    }

    if (match.explanation.risks.length > 0) {
      commentParts.push(match.explanation.risks[0]);
    }

    const scoreDetails = match.explanation.skillCoverage.map((coverage) => ({
      criterion: coverage.skill.name,
      weight: Number(skillWeight.toFixed(2)),
      value: Number(
        (coverage.hasSkill ? coverage.levelFactor * coverage.freshnessFactor : 0).toFixed(2)
      ),
      comment: coverage.gaps[0]
    }));

    scoreDetails.push(
      {
        criterion: 'Доступность',
        weight: 0.2,
        value: Number(availability.toFixed(2)),
        comment: availability < 1 ? 'Эксперт частично занят в других инициативах' : undefined
      },
      {
        criterion: 'Покрытие FTE',
        weight: 0.2,
        value: Number(fte.toFixed(2)),
        comment: fte < 1 ? 'Недостаточно часов для полного закрытия роли' : undefined
      }
    );

    const fitComment = commentParts.join('. ').replace(/\.+$/, '') + '.';

    return {
      expertId: match.expert.id,
      score: totalScore,
      fitComment,
      riskTags: Array.from(new Set(match.explanation.risks)),
      scoreDetails
    };
  });
}

export function selectPinnedExperts(
  candidates: InitiativeCandidate[],
  required: number
): string[] {
  if (candidates.length === 0) {
    return [];
  }

  const needed = Math.max(1, Math.round(required));
  return candidates
    .slice(0, needed)
    .map((candidate) => candidate.expertId)
    .filter((id, index, array) => array.indexOf(id) === index);
}

export function assignExpertsToWorkItems(
  workItems: RolePlanningWorkDraft[],
  expertIds: string[]
): InitiativeRoleWork[] {
  if (workItems.length === 0) {
    return [];
  }

  return workItems.map((item, index) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    startDay: item.startDay,
    durationDays: item.durationDays,
    effortDays: item.effortDays,
    tasks: item.tasks,
    assignedExpertId:
      expertIds.length > 0 ? expertIds[index % expertIds.length] : undefined
  }));
}
