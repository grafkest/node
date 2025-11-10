import { read, utils, write } from 'xlsx';
import {
  type ExpertAvailability,
  type ExpertSkill,
  type SkillDefinition,
  type SkillEvidenceStatus,
  type SkillLevel,
  type SkillSource,
  type TeamRole,
  evidenceStatuses,
  findSkillByName,
  getSkillNameById,
  roleToSkillsMap,
  skills,
  skillLevels
} from '../data';
import type { ExpertDraftPayload } from '../types/expert';

type Workbook = ReturnType<typeof utils.book_new>;

const PROFILE_SHEET = 'Profile';
const SKILLS_SHEET = 'Skills';
const EVIDENCE_SHEET = 'Evidence';

const PROFILE_FIELDS = {
  id: 'Expert ID',
  fullName: 'Full Name',
  title: 'Title',
  summary: 'Summary',
  experienceYears: 'Experience Years',
  availability: 'Availability',
  availabilityComment: 'Availability Comment',
  location: 'Location',
  contact: 'Contact',
  languages: 'Languages',
  domains: 'Domains',
  domainIds: 'Domain IDs',
  modules: 'Modules',
  moduleIds: 'Module IDs',
  competencies: 'Competencies',
  consultingSkills: 'Consulting Skills',
  softSkills: 'Soft Skills',
  focusAreas: 'Focus Areas',
  notableProjects: 'Notable Projects'
} as const;

type ProfileFieldKey = keyof typeof PROFILE_FIELDS;

const SKILL_HEADERS = [
  'Skill ID',
  'Skill Name',
  'Category',
  'Level',
  'Proof Status',
  'Interest',
  'Available FTE',
  'Artifacts',
  'Usage From',
  'Usage To',
  'Usage Description',
  'Definition Description',
  'Definition Sources',
  'Definition Recommended Level',
  'Definition Evidence Status',
  'Definition Roles'
] as const;

type SkillHeader = (typeof SKILL_HEADERS)[number];

const EVIDENCE_HEADERS = ['Skill ID', 'Status', 'Initiative ID', 'Artifacts', 'Comment'] as const;

type EvidenceHeader = (typeof EVIDENCE_HEADERS)[number];

const availabilityMap: Record<string, ExpertAvailability> = {
  available: 'available',
  'доступен': 'available',
  partial: 'partial',
  'частично доступен': 'partial',
  busy: 'busy',
  'занят': 'busy'
};

const proofStatusMap = evidenceStatuses.reduce<Record<string, SkillEvidenceStatus>>((acc, status) => {
  acc[status.id] = status.id as SkillEvidenceStatus;
  acc[status.label.toLowerCase()] = status.id as SkillEvidenceStatus;
  return acc;
}, {});

const skillLevelMap = skillLevels.reduce<Record<string, SkillLevel>>((acc, descriptor) => {
  acc[descriptor.id] = descriptor.id as SkillLevel;
  acc[descriptor.label.toLowerCase()] = descriptor.id as SkillLevel;
  return acc;
}, {});

const interestMap: Record<string, ExpertSkill['interest']> = {
  high: 'high',
  средний: 'medium',
  medium: 'medium',
  low: 'low',
  высокий: 'high',
  низкий: 'low'
};

const skillSourceMap: Record<string, SkillSource> = {
  sfia: 'SFIA',
  iiba: 'IIBA',
  incose: 'INCOSE'
};

const evidenceStatusMap = evidenceStatuses.reduce<Record<string, SkillEvidenceStatus>>((acc, status) => {
  acc[status.id] = status.id as SkillEvidenceStatus;
  acc[status.label.toLowerCase()] = status.id as SkillEvidenceStatus;
  return acc;
}, {});

const recommendedLevelMap = skillLevels.reduce<Record<string, SkillLevel>>((acc, descriptor) => {
  acc[descriptor.id] = descriptor.id as SkillLevel;
  acc[descriptor.label.toLowerCase()] = descriptor.id as SkillLevel;
  return acc;
}, {});

const splitMultiline = (value: string): string[] =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const buildNameMap = (record: Record<string, string>): Map<string, string> => {
  const map = new Map<string, string>();
  Object.entries(record).forEach(([id, label]) => {
    if (!label) {
      return;
    }
    map.set(label.trim().toLowerCase(), id);
  });
  return map;
};

const slugifySkillId = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

export type ExpertExcelExportParams = {
  draft: ExpertDraftPayload;
  expertId?: string | null;
  domainLabelMap: Record<string, string>;
  moduleLabelMap: Record<string, string>;
};

export type MissingSkillEntry = {
  definition: SkillDefinition;
  rowNumber: number;
  requestedId: string;
  requestedName: string;
};

export type ExpertImportResult = {
  draft: ExpertDraftPayload;
  requestedExpertId?: string;
  errors: string[];
  warnings: string[];
  missingHardSkills: MissingSkillEntry[];
};

export type ExpertExcelImportParams = {
  buffer: ArrayBuffer;
  domainLabelMap: Record<string, string>;
  moduleLabelMap: Record<string, string>;
};

export const createExpertWorkbook = ({
  draft,
  expertId,
  domainLabelMap,
  moduleLabelMap
}: ExpertExcelExportParams): Workbook => {
  const workbook = utils.book_new();

  const profileRows: Array<{ Field: string; Value: string }> = (Object.keys(
    PROFILE_FIELDS
  ) as ProfileFieldKey[]).map((key) => {
    const field = PROFILE_FIELDS[key];
    let value = '';

    switch (key) {
      case 'id':
        value = expertId ? String(expertId) : '';
        break;
      case 'fullName':
        value = draft.fullName;
        break;
      case 'title':
        value = draft.title;
        break;
      case 'summary':
        value = draft.summary;
        break;
      case 'experienceYears':
        value = String(draft.experienceYears ?? 0);
        break;
      case 'availability':
        value = draft.availability;
        break;
      case 'availabilityComment':
        value = draft.availabilityComment;
        break;
      case 'location':
        value = draft.location;
        break;
      case 'contact':
        value = draft.contact;
        break;
      case 'languages':
        value = draft.languages.join('\n');
        break;
      case 'domains':
        value = draft.domains.map((id) => domainLabelMap[id] ?? id).join('\n');
        break;
      case 'domainIds':
        value = draft.domains.join('\n');
        break;
      case 'modules':
        value = draft.modules.map((id) => moduleLabelMap[id] ?? id).join('\n');
        break;
      case 'moduleIds':
        value = draft.modules.join('\n');
        break;
      case 'competencies':
        value = draft.competencies.join('\n');
        break;
      case 'consultingSkills':
        value = draft.consultingSkills.join('\n');
        break;
      case 'softSkills':
        value = (draft.softSkills ?? []).join('\n');
        break;
      case 'focusAreas':
        value = draft.focusAreas.join('\n');
        break;
      case 'notableProjects':
        value = draft.notableProjects.join('\n');
        break;
      default:
        value = '';
        break;
    }

    return { Field: field, Value: value };
  });

  const profileSheet = utils.json_to_sheet(profileRows, {
    header: ['Field', 'Value']
  });
  utils.book_append_sheet(workbook, profileSheet, PROFILE_SHEET);

  const skillRows = draft.skills.map((skill) => {
    const definition = skills[skill.id];
    const usage = skill.usage ?? {};

    return {
      'Skill ID': skill.id,
      'Skill Name': definition?.name ?? getSkillNameById(skill.id) ?? skill.id,
      Category: definition?.category ?? 'hard',
      Level: skill.level,
      'Proof Status': skill.proofStatus,
      Interest: skill.interest,
      'Available FTE': skill.availableFte ?? 0,
      Artifacts: skill.artifacts.join('\n'),
      'Usage From': usage.from ?? '',
      'Usage To': usage.to ?? '',
      'Usage Description': usage.description ?? '',
      'Definition Description': definition?.description ?? '',
      'Definition Sources': definition?.sources.join(', ') ?? '',
      'Definition Recommended Level': definition?.recommendedLevel ?? '',
      'Definition Evidence Status': definition?.evidenceStatus ?? '',
      'Definition Roles': definition?.roles.join(', ') ?? ''
    };
  });

  const skillsSheet = utils.json_to_sheet(skillRows, {
    header: [...SKILL_HEADERS]
  });
  utils.book_append_sheet(workbook, skillsSheet, SKILLS_SHEET);

  const evidenceRows: Array<Record<EvidenceHeader, string>> = [];
  draft.skills.forEach((skill) => {
    (skill.evidence ?? []).forEach((entry) => {
      evidenceRows.push({
        'Skill ID': skill.id,
        Status: entry.status,
        'Initiative ID': entry.initiativeId ?? '',
        Artifacts: (entry.artifactIds ?? []).join('\n'),
        Comment: entry.comment ?? ''
      });
    });
  });

  const evidenceSheet = utils.json_to_sheet(evidenceRows, {
    header: [...EVIDENCE_HEADERS]
  });
  utils.book_append_sheet(workbook, evidenceSheet, EVIDENCE_SHEET);

  return workbook;
};

export const exportExpertToExcel = (params: ExpertExcelExportParams): ArrayBuffer =>
  write(createExpertWorkbook(params), { type: 'array', bookType: 'xlsx' });

type SkillSheetRow = Record<SkillHeader, string | number>;

type EvidenceSheetRow = Record<EvidenceHeader, string | number>;

const parseSkillCategory = (raw: string): SkillDefinition['category'] | null => {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith('hard')) {
    return 'hard';
  }
  if (normalized.startsWith('soft')) {
    return 'soft';
  }
  if (normalized.startsWith('domain')) {
    return 'domain';
  }
  return null;
};

const parseSkillLevel = (raw: string): SkillLevel | null => {
  if (!raw) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  return skillLevelMap[normalized] ?? null;
};

const parseProofStatus = (raw: string): SkillEvidenceStatus | null => {
  if (!raw) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  return proofStatusMap[normalized] ?? null;
};

const parseInterest = (raw: string): ExpertSkill['interest'] | null => {
  if (!raw) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  return interestMap[normalized] ?? null;
};

const parseAvailability = (raw: string): ExpertAvailability | null => {
  if (!raw) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  return availabilityMap[normalized] ?? null;
};

const parseSources = (raw: string): SkillSource[] => {
  if (!raw) {
    return [];
  }
  const values = splitMultiline(raw);
  return Array.from(
    new Set(
      values
        .map((value) => skillSourceMap[value.trim().toLowerCase()])
        .filter((value): value is SkillSource => Boolean(value))
    )
  );
};

const parseEvidenceStatus = (raw: string): SkillEvidenceStatus | null => {
  if (!raw) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  return evidenceStatusMap[normalized] ?? null;
};

const parseRecommendedLevel = (raw: string): SkillLevel | null => {
  if (!raw) {
    return null;
  }
  const normalized = raw.trim().toLowerCase();
  return recommendedLevelMap[normalized] ?? null;
};

const parseRoles = (raw: string): TeamRole[] => {
  if (!raw) {
    return [];
  }
  const knownRoles = new Set(Object.keys(roleToSkillsMap) as TeamRole[]);
  return splitMultiline(raw)
    .map((value) => value.trim())
    .filter((value): value is TeamRole => knownRoles.has(value as TeamRole));
};

const coerceNumber = (value: string | number): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const parseExpertWorkbook = ({
  buffer,
  domainLabelMap,
  moduleLabelMap
}: ExpertExcelImportParams): ExpertImportResult => {
  const workbook = read(buffer, { type: 'array' });

  const profileSheet = workbook.Sheets[PROFILE_SHEET];
  const skillsSheet = workbook.Sheets[SKILLS_SHEET];
  const evidenceSheet = workbook.Sheets[EVIDENCE_SHEET];

  const errors: string[] = [];
  const warnings: string[] = [];

  const domainNameMap = buildNameMap(domainLabelMap);
  const moduleNameMap = buildNameMap(moduleLabelMap);

  const profileValues = new Map<string, string>();
  if (profileSheet) {
    const rows = utils.sheet_to_json<[string, string]>(profileSheet, { header: 1, blankrows: false });
    rows.forEach((row, index) => {
      if (index === 0 && row[0] === 'Field') {
        return;
      }
      const field = row[0];
      const value = row[1];
      if (!field) {
        return;
      }
      profileValues.set(String(field).trim(), String(value ?? ''));
    });
  }

  const getProfileValue = (key: ProfileFieldKey): string =>
    profileValues.get(PROFILE_FIELDS[key]) ?? '';

  const fullName = getProfileValue('fullName').trim();
  if (!fullName) {
    errors.push('В файле не указано полное имя сотрудника.');
  }

  const availabilityValue = parseAvailability(getProfileValue('availability'));
  if (!availabilityValue) {
    errors.push('Некорректное значение доступности сотрудника.');
  }

  const domainIds = splitMultiline(getProfileValue('domainIds'));
  const domainNames = splitMultiline(getProfileValue('domains'));
  const normalizedDomains = new Set<string>();
  domainIds.forEach((id) => {
    if (domainLabelMap[id]) {
      normalizedDomains.add(id);
    } else if (id) {
      warnings.push(`Домен «${id}» отсутствует в системе и будет пропущен.`);
    }
  });
  domainNames.forEach((name) => {
    const id = domainNameMap.get(name.toLowerCase());
    if (id) {
      normalizedDomains.add(id);
    }
  });

  const moduleIds = splitMultiline(getProfileValue('moduleIds'));
  const moduleNames = splitMultiline(getProfileValue('modules'));
  const normalizedModules = new Set<string>();
  moduleIds.forEach((id) => {
    if (moduleLabelMap[id]) {
      normalizedModules.add(id);
    } else if (id) {
      warnings.push(`Модуль «${id}» отсутствует в системе и будет пропущен.`);
    }
  });
  moduleNames.forEach((name) => {
    const id = moduleNameMap.get(name.toLowerCase());
    if (id) {
      normalizedModules.add(id);
    }
  });

  const draft: ExpertDraftPayload = {
    fullName,
    title: getProfileValue('title'),
    summary: getProfileValue('summary'),
    domains: Array.from(normalizedDomains),
    modules: Array.from(normalizedModules),
    experienceYears: Math.max(0, Math.round(coerceNumber(getProfileValue('experienceYears')))),
    location: getProfileValue('location'),
    contact: getProfileValue('contact'),
    languages: splitMultiline(getProfileValue('languages')),
    notableProjects: splitMultiline(getProfileValue('notableProjects')),
    availability: availabilityValue ?? 'available',
    availabilityComment: getProfileValue('availabilityComment'),
    competencies: splitMultiline(getProfileValue('competencies')),
    consultingSkills: splitMultiline(getProfileValue('consultingSkills')),
    softSkills: splitMultiline(getProfileValue('softSkills')),
    focusAreas: splitMultiline(getProfileValue('focusAreas')),
    skills: []
  };

  draft.skills = [];

  const requestedExpertId = getProfileValue('id') || undefined;

  const missingHardSkills: MissingSkillEntry[] = [];
  const skillRows = skillsSheet ? utils.sheet_to_json<SkillSheetRow>(skillsSheet, { defval: '' }) : [];

  const skillMap = new Map<string, ExpertSkill>();

  skillRows.forEach((row, index) => {
    const rawCategory = String(row.Category ?? '');
    const skillName = String(row['Skill Name'] ?? '').trim();
    const rawSkillId = String(row['Skill ID'] ?? '').trim();

    if (!skillName && !rawSkillId) {
      return;
    }

    const level = parseSkillLevel(String(row.Level ?? ''));
    if (!level) {
      errors.push(`Строка ${index + 2}: некорректный уровень навыка для «${skillName || rawSkillId}».`);
      return;
    }

    const proofStatus = parseProofStatus(String(row['Proof Status'] ?? ''));
    if (!proofStatus) {
      errors.push(`Строка ${index + 2}: некорректный статус подтверждения для «${skillName || rawSkillId}».`);
      return;
    }

    const interest = parseInterest(String(row.Interest ?? '')) ?? 'medium';
    const availableFte = coerceNumber(row['Available FTE'] ?? 0);
    const artifacts = splitMultiline(String(row.Artifacts ?? ''));
    const usageFrom = String(row['Usage From'] ?? '').trim();
    const usageTo = String(row['Usage To'] ?? '').trim();
    const usageDescription = String(row['Usage Description'] ?? '').trim();

    let skillId = rawSkillId || slugifySkillId(skillName || `skill-${index}`);
    let definition = skills[skillId];

    if (!definition && skillName) {
      const existing = findSkillByName(skillName);
      if (existing) {
        skillId = existing.id;
        definition = existing;
      }
    }

    let category = parseSkillCategory(rawCategory);
    if (!category) {
      category = definition?.category ?? null;
    }

    const resolvedSkillName = skillName || definition?.name || skillId;

    if (!category) {
      errors.push(`Строка ${index + 2}: не удалось определить категорию навыка «${resolvedSkillName}».`);
      return;
    }

    if (!definition && category === 'hard') {
      const definitionDescription = String(row['Definition Description'] ?? '').trim();
      const definitionSources = parseSources(String(row['Definition Sources'] ?? ''));
      const recommendedLevel =
        parseRecommendedLevel(String(row['Definition Recommended Level'] ?? '')) ?? 'P';
      const evidenceStatus =
        parseEvidenceStatus(String(row['Definition Evidence Status'] ?? '')) ?? 'screened';
      const roles = parseRoles(String(row['Definition Roles'] ?? ''));

      missingHardSkills.push({
        definition: {
          id: skillId,
          name: resolvedSkillName,
          description: definitionDescription || resolvedSkillName,
          category,
          sources: definitionSources,
          recommendedLevel,
          evidenceStatus,
          roles
        },
        requestedId: skillId,
        requestedName: resolvedSkillName,
        rowNumber: index + 2
      });
    }

    const usage = usageFrom || usageTo || usageDescription ? { from: usageFrom, to: usageTo, description: usageDescription } : undefined;

    const expertSkill: ExpertSkill = {
      id: skillId,
      level,
      proofStatus,
      evidence: [],
      artifacts,
      interest,
      availableFte,
      usage
    };

    skillMap.set(skillId, expertSkill);
  });

  if (evidenceSheet) {
    const evidenceRows = utils.sheet_to_json<EvidenceSheetRow>(evidenceSheet, { defval: '' });
    evidenceRows.forEach((row, index) => {
      const skillId = String(row['Skill ID'] ?? '').trim();
      const status = parseEvidenceStatus(String(row.Status ?? ''));
      if (!skillId || !status) {
        return;
      }
      const initiativeId = String(row['Initiative ID'] ?? '').trim();
      const artifacts = splitMultiline(String(row.Artifacts ?? ''));
      const comment = String(row.Comment ?? '').trim();

      const skill = skillMap.get(skillId);
      if (!skill) {
        warnings.push(`Лист Evidence, строка ${index + 2}: навык «${skillId}» не найден в профиле и будет пропущен.`);
        return;
      }

      skill.evidence.push({
        status,
        ...(initiativeId ? { initiativeId } : {}),
        ...(artifacts.length > 0 ? { artifactIds: artifacts } : {}),
        ...(comment ? { comment } : {})
      });
    });
  }

  draft.skills = Array.from(skillMap.values());

  return {
    draft,
    requestedExpertId,
    errors,
    warnings,
    missingHardSkills
  };
};

