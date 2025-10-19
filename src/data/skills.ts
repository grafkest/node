import type { TeamRole } from '../data';

export type SkillCategory = 'hard' | 'soft' | 'domain';

export type SkillSource = 'SFIA' | 'IIBA' | 'INCOSE';

export type SkillLevelId = 'A' | 'W' | 'P' | 'Ad' | 'E';

export type EvidenceStatusId =
  | 'declared'
  | 'observed'
  | 'documented'
  | 'verified';

export type SkillLevelDescriptor = {
  id: SkillLevelId;
  label: string;
  summary: string;
  expectedOutcomes: string[];
};

export type EvidenceStatusDescriptor = {
  id: EvidenceStatusId;
  label: string;
  description: string;
};

export type SkillDefinition = {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  sources: SkillSource[];
  recommendedLevel: SkillLevelId;
  evidenceStatus: EvidenceStatusId;
  roles: TeamRole[];
};

export const skillLevels: SkillLevelDescriptor[] = [
  {
    id: 'A',
    label: 'Awareness',
    summary: 'Базовое знакомство с концепцией и терминологией.',
    expectedOutcomes: [
      'Понимание ключевых понятий и терминов',
      'Способность определить, когда необходима поддержка эксперта'
    ]
  },
  {
    id: 'W',
    label: 'Working',
    summary: 'Умение применять знания по шаблону под руководством.',
    expectedOutcomes: [
      'Выполнение типовых задач по инструкциям',
      'Фиксация вопросов и рисков для передачи специалистам'
    ]
  },
  {
    id: 'P',
    label: 'Practitioner',
    summary: 'Самостоятельное выполнение задач средней сложности.',
    expectedOutcomes: [
      'Подготовка решений в рамках стандартных процессов',
      'Идентификация улучшений и обмен знаниями в команде'
    ]
  },
  {
    id: 'Ad',
    label: 'Advanced',
    summary: 'Глубокая экспертиза и лидерство в направлении.',
    expectedOutcomes: [
      'Разработка нестандартных решений и методов',
      'Наставничество коллег и формирование практик'
    ]
  },
  {
    id: 'E',
    label: 'Expert',
    summary: 'Формирование отраслевых стандартов и стратегий.',
    expectedOutcomes: [
      'Определение долгосрочного видения и стратегии развития навыка',
      'Представление организации на внешних мероприятиях и сообществах'
    ]
  }
];

export const evidenceStatuses: EvidenceStatusDescriptor[] = [
  {
    id: 'declared',
    label: 'Декларировано',
    description:
      'Навык заявлен специалистом и подтверждён планом развития, но отсутствуют артефакты применения.'
  },
  {
    id: 'observed',
    label: 'Наблюдалось',
    description:
      'Навык проявлялся в работе, наличие подтверждения от руководителя или наставника.'
  },
  {
    id: 'documented',
    label: 'Задокументировано',
    description:
      'Существуют артефакты применения навыка: артефакты проектов, инструкции, записи выступлений.'
  },
  {
    id: 'verified',
    label: 'Верифицировано',
    description:
      'Навык проверен внешними или внутренними экспертами, подкреплён сертификацией или аудитом.'
  }
];

export const skills: Record<string, SkillDefinition> = {
  'requirements-elicitation': {
    id: 'requirements-elicitation',
    name: 'Сбор и анализ требований',
    description:
      'Методы выявления, структурирования и валидации требований с участием заинтересованных сторон.',
    category: 'hard',
    sources: ['IIBA'],
    recommendedLevel: 'P',
    evidenceStatus: 'documented',
    roles: ['Аналитик', 'Владелец продукта', 'Руководитель проекта']
  },
  'systems-thinking': {
    id: 'systems-thinking',
    name: 'Системное мышление',
    description:
      'Умение рассматривать продукт как целостную систему, учитывать взаимосвязи компонентов и ограничений.',
    category: 'soft',
    sources: ['INCOSE'],
    recommendedLevel: 'Ad',
    evidenceStatus: 'observed',
    roles: ['Архитектор', 'Эксперт R&D', 'Руководитель проекта']
  },
  'microservice-architecture': {
    id: 'microservice-architecture',
    name: 'Проектирование микросервисной архитектуры',
    description:
      'Построение распределённых систем с учётом устойчивости, масштабируемости и требований эксплуатации.',
    category: 'hard',
    sources: ['SFIA'],
    recommendedLevel: 'Ad',
    evidenceStatus: 'verified',
    roles: ['Архитектор', 'Backend']
  },
  'data-visualization': {
    id: 'data-visualization',
    name: 'Визуализация данных',
    description:
      'Создание наглядных визуализаций для аналитики и принятия решений на основе данных.',
    category: 'hard',
    sources: ['SFIA'],
    recommendedLevel: 'W',
    evidenceStatus: 'documented',
    roles: ['Аналитик', 'Frontend']
  },
  'user-research': {
    id: 'user-research',
    name: 'Пользовательские исследования',
    description:
      'Планирование и проведение интервью, юзабилити-тестов и анализ пользовательского опыта.',
    category: 'domain',
    sources: ['IIBA'],
    recommendedLevel: 'P',
    evidenceStatus: 'observed',
    roles: ['UX', 'Владелец продукта']
  },
  leadership: {
    id: 'leadership',
    name: 'Лидерство и фасилитация',
    description: 'Умение управлять командной динамикой, мотивировать и поддерживать вовлечённость.',
    category: 'soft',
    sources: ['INCOSE'],
    recommendedLevel: 'P',
    evidenceStatus: 'observed',
    roles: ['Руководитель проекта', 'Эксперт R&D']
  },
  'quality-assurance': {
    id: 'quality-assurance',
    name: 'Инженерия качества ПО',
    description:
      'Планирование и реализация стратегий тестирования, автоматизации и обеспечения качества.',
    category: 'hard',
    sources: ['SFIA'],
    recommendedLevel: 'P',
    evidenceStatus: 'documented',
    roles: ['Тестировщик', 'Backend']
  },
  'frontend-engineering': {
    id: 'frontend-engineering',
    name: 'Фронтенд-инжиниринг',
    description:
      'Разработка клиентских приложений, оптимизация интерфейсов и взаимодействий.',
    category: 'hard',
    sources: ['SFIA'],
    recommendedLevel: 'P',
    evidenceStatus: 'documented',
    roles: ['Frontend']
  },
  'knowledge-management': {
    id: 'knowledge-management',
    name: 'Управление знаниями',
    description:
      'Подходы к формированию, хранению и распространению знаний в организации.',
    category: 'soft',
    sources: ['INCOSE'],
    recommendedLevel: 'W',
    evidenceStatus: 'declared',
    roles: ['Руководитель проекта', 'Эксперт R&D']
  },
  'domain-geology': {
    id: 'domain-geology',
    name: 'Отраслевой контекст: геология и добыча',
    description:
      'Знание ключевых процессов добычи, геологоразведки и подготовки сырья.',
    category: 'domain',
    sources: ['INCOSE'],
    recommendedLevel: 'W',
    evidenceStatus: 'observed',
    roles: ['Эксперт R&D', 'Владелец продукта']
  }
};

export const roleToSkillsMap: Record<TeamRole, string[]> = Object.values(skills).reduce(
  (acc, skill) => {
    skill.roles.forEach((role) => {
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(skill.id);
    });
    return acc;
  },
  {} as Record<TeamRole, string[]>
);

export const getSkillsByRole = (role: TeamRole): SkillDefinition[] => {
  const skillIds = roleToSkillsMap[role] ?? [];
  return skillIds.map((id) => skills[id]).filter(Boolean);
};

export const getSkillIdsByRole = (role: TeamRole): string[] => roleToSkillsMap[role] ?? [];

export const getRolesForSkill = (skillId: string): TeamRole[] => skills[skillId]?.roles ?? [];
