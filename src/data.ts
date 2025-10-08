export type DomainNode = {
  id: string;
  name: string;
  description?: string;
  children?: DomainNode[];
};

export type ModuleStatus = 'in-dev' | 'production' | 'deprecated';

export type ModuleInput = {
  id: string;
  label: string;
  sourceId?: string;
};

export type ModuleOutput = {
  id: string;
  label: string;
  consumerIds?: string[];
};

export type TeamRole =
  | 'Владелец продукта'
  | 'Эксперт R&D'
  | 'Аналитик'
  | 'Backend'
  | 'Frontend'
  | 'Архитектор'
  | 'Тестировщик';

export type TeamMember = {
  id: string;
  fullName: string;
  role: TeamRole;
};

export type LibraryDependency = {
  name: string;
  version: string;
};

export type UserStats = {
  companies: number;
  licenses: number;
};

export type ModuleMetrics = {
  tests: number;
  coverage: number;
  automationRate: number;
};

export type NonFunctionalRequirements = {
  responseTimeMs: number;
  throughputRps: number;
  resourceConsumption: string;
};

export type ModuleNode = {
  id: string;
  name: string;
  description: string;
  domains: string[];
  team: string;
  owner: string;
  productName: string;
  projectTeam: TeamMember[];
  technologyStack: string[];
  localization: string;
  ridOwner: string;
  userStats: UserStats;
  status: ModuleStatus;
  repository?: string;
  api?: string;
  specificationUrl: string;
  apiContractsUrl: string;
  techDesignUrl: string;
  architectureDiagramUrl: string;
  licenseServerIntegrated: boolean;
  libraries: LibraryDependency[];
  clientType: 'desktop' | 'web';
  deploymentTool: 'docker' | 'kubernetes';
  dependencies: string[];
  produces: string[];
  reuseScore: number;
  metrics: ModuleMetrics;
  dataIn: ModuleInput[];
  dataOut: ModuleOutput[];
  formula: string;
  nonFunctional: NonFunctionalRequirements;
};

export const domainTree: DomainNode[] = [
  {
    id: 'extraction',
    name: 'Добыча',
    description: 'Функции департамента управления добычей',
    children: [
      {
        id: 'production',
        name: 'Управление добычей',
        description: 'Контроль фонда скважин и планирование добычи',
        children: [
          {
            id: 'well-operations',
            name: 'Мониторинг скважин',
            description: 'Наблюдение за фондом скважин и оперативные метрики'
          },
          {
            id: 'short-term-planning',
            name: 'Планирование смен',
            description: 'Формирование и контроль сменных заданий'
          }
        ]
      },
      {
        id: 'engineering',
        name: 'Инженерная аналитика',
        description: 'Диагностика оборудования и энергоэффективность',
        children: [
          {
            id: 'lift-diagnostics',
            name: 'Диагностика УЭЦН',
            description: 'Прогнозирование отказов насосного оборудования'
          },
          {
            id: 'energy-optimization',
            name: 'Оптимизация энергии',
            description: 'Балансировка потребления и снижение энергозатрат'
          }
        ]
      },
      {
        id: 'economics',
        name: 'Экономика проекта',
        description: 'Финансовая оценка и инвестиционные решения',
        children: [
          {
            id: 'investment-analysis',
            name: 'Оценка инвестиций',
            description: 'Расчёт эффективности и рисков портфеля проектов'
          }
        ]
      }
    ]
  }
];

export const domainNameById: Record<string, string> = (() => {
  const map: Record<string, string> = {};

  const walk = (nodes: DomainNode[]) => {
    nodes.forEach((node) => {
      map[node.id] = node.name;
      if (node.children) {
        walk(node.children);
      }
    });
  };

  walk(domainTree);
  return map;
})();

export const modules: ModuleNode[] = [
  {
    id: 'module-telemetry-cleansing',
    name: 'Очистка телеметрии',
    description:
      'Собирает телеметрию скважин, нормализует показания датчиков и обогащает их паспортами оборудования.',
    domains: ['well-operations', 'lift-diagnostics'],
    team: 'Field Data Platform',
    owner: 'Наталья Коваль',
    productName: 'Well Insight Suite',
    projectTeam: [
      { id: 'telemetry-owner', fullName: 'Наталья Коваль', role: 'Владелец продукта' },
      { id: 'telemetry-rd', fullName: 'Роман Кузнецов', role: 'Эксперт R&D' },
      { id: 'telemetry-analyst', fullName: 'Павел Лобанов', role: 'Аналитик' },
      { id: 'telemetry-backend', fullName: 'Василий Титов', role: 'Backend' },
      { id: 'telemetry-frontend', fullName: 'Евгения Громова', role: 'Frontend' },
      { id: 'telemetry-architect', fullName: 'Артём Есипов', role: 'Архитектор' },
      { id: 'telemetry-tester', fullName: 'Марина Куприянова', role: 'Тестировщик' }
    ],
    technologyStack: ['TypeScript', 'NestJS', 'Apache Kafka', 'PostgreSQL'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: 'АО «НефтеИнтеллект»',
    userStats: { companies: 12, licenses: 1850 },
    status: 'production',
    repository: 'https://git.example.com/upstream/telemetry-cleansing',
    api: 'Kafka stream telemetry.normalized',
    specificationUrl: 'https://confluence.example.com/pages/viewpage.action?pageId=11001',
    apiContractsUrl: 'https://docs.example.com/apis/telemetry-cleansing',
    techDesignUrl: 'https://confluence.example.com/display/FD/Telemetry+Cleansing+Design',
    architectureDiagramUrl: 'https://diagrams.example.com/telemetry-cleansing',
    licenseServerIntegrated: true,
    libraries: [
      { name: '@nestjs/core', version: '9.4.2' },
      { name: 'rxjs', version: '7.8.1' },
      { name: 'kafkajs', version: '2.2.4' }
    ],
    clientType: 'web',
    deploymentTool: 'kubernetes',
    dependencies: [],
    produces: ['artifact-clean-telemetry'],
    reuseScore: 0.86,
    metrics: {
      tests: 210,
      coverage: 93,
      automationRate: 88
    },
    dataIn: [
      {
        id: 'raw-telemetry',
        label: 'Сырые данные датчиков'
      },
      {
        id: 'equipment-passports',
        label: 'Паспорта оборудования'
      }
    ],
    dataOut: [
      {
        id: 'clean-telemetry',
        label: 'Очищенная телеметрия',
        consumerIds: ['module-well-dashboard', 'module-lift-predictor']
      }
    ],
    formula: 'value_norm = (value_raw - bias) * scale',
    nonFunctional: {
      responseTimeMs: 240,
      throughputRps: 320,
      resourceConsumption: '4 vCPU / 12 GB RAM'
    }
  },
  {
    id: 'module-well-dashboard',
    name: 'Дашборд фонда скважин',
    description:
      'Агрегирует показатели фонда скважин, визуализирует отклонения факта от сменных лимитов и формирует предупреждения.',
    domains: ['well-operations', 'short-term-planning'],
    team: 'Production Control Room',
    owner: 'Илья Киселёв',
    productName: 'Production Command Center',
    projectTeam: [
      { id: 'dashboard-owner', fullName: 'Илья Киселёв', role: 'Владелец продукта' },
      { id: 'dashboard-rd', fullName: 'Станислав Ершов', role: 'Эксперт R&D' },
      { id: 'dashboard-analyst', fullName: 'Ольга Захарова', role: 'Аналитик' },
      { id: 'dashboard-frontend', fullName: 'Екатерина Белова', role: 'Frontend' },
      { id: 'dashboard-backend', fullName: 'Алексей Гущин', role: 'Backend' },
      { id: 'dashboard-architect', fullName: 'Владимир Копылов', role: 'Архитектор' },
      { id: 'dashboard-tester', fullName: 'Галина Рябова', role: 'Тестировщик' }
    ],
    technologyStack: ['TypeScript', 'React', 'D3.js', 'Node.js'],
    localization: 'Мультиязычная (ru, en, kk)',
    ridOwner: 'АО «НефтеИнтеллект»',
    userStats: { companies: 18, licenses: 4200 },
    status: 'production',
    repository: 'https://git.example.com/production/well-dashboard',
    api: 'REST /api/v1/wells/dashboard',
    specificationUrl: 'https://confluence.example.com/pages/viewpage.action?pageId=11852',
    apiContractsUrl: 'https://docs.example.com/apis/well-dashboard',
    techDesignUrl: 'https://confluence.example.com/display/PC/well-dashboard-tech-design',
    architectureDiagramUrl: 'https://diagrams.example.com/well-dashboard',
    licenseServerIntegrated: true,
    libraries: [
      { name: 'react', version: '18.2.0' },
      { name: '@tanstack/react-query', version: '4.35.3' },
      { name: 'echarts', version: '5.5.0' }
    ],
    clientType: 'web',
    deploymentTool: 'kubernetes',
    dependencies: ['module-telemetry-cleansing'],
    produces: ['artifact-deviation-report'],
    reuseScore: 0.74,
    metrics: {
      tests: 168,
      coverage: 88,
      automationRate: 82
    },
    dataIn: [
      {
        id: 'normalized-telemetry',
        label: 'Очищенная телеметрия',
        sourceId: 'artifact-clean-telemetry'
      },
      {
        id: 'shift-targets',
        label: 'Сменные лимиты добычи'
      }
    ],
    dataOut: [
      {
        id: 'deviation-metrics',
        label: 'Показатели отклонений',
        consumerIds: ['module-shift-planner', 'module-investment-evaluator']
      }
    ],
    formula: 'deviation = fact_volume - plan_volume',
    nonFunctional: {
      responseTimeMs: 360,
      throughputRps: 210,
      resourceConsumption: '6 vCPU / 16 GB RAM'
    }
  },
  {
    id: 'module-shift-planner',
    name: 'Сменное планирование добычи',
    description:
      'Оптимизирует сменные задания на основе фактических ограничений, отклонений и доступности оборудования.',
    domains: ['short-term-planning'],
    team: 'Production Planning',
    owner: 'Елена Савина',
    productName: 'Shift Orchestrator',
    projectTeam: [
      { id: 'shift-owner', fullName: 'Елена Савина', role: 'Владелец продукта' },
      { id: 'shift-rd', fullName: 'Николай Дорошин', role: 'Эксперт R&D' },
      { id: 'shift-analyst', fullName: 'Ксения Литвинова', role: 'Аналитик' },
      { id: 'shift-backend', fullName: 'Максим Фадеев', role: 'Backend' },
      { id: 'shift-frontend', fullName: 'Инна Котова', role: 'Frontend' },
      { id: 'shift-architect', fullName: 'Рустам Ганиев', role: 'Архитектор' },
      { id: 'shift-tester', fullName: 'Дарья Королёва', role: 'Тестировщик' }
    ],
    technologyStack: ['Kotlin', 'Spring Boot', 'PostgreSQL', 'Camunda'],
    localization: 'Только русский язык',
    ridOwner: 'АО «НефтеИнтеллект»',
    userStats: { companies: 9, licenses: 1150 },
    status: 'production',
    repository: 'https://git.example.com/production/shift-planner',
    api: 'REST /api/v1/plans/shift',
    specificationUrl: 'https://confluence.example.com/pages/viewpage.action?pageId=21045',
    apiContractsUrl: 'https://docs.example.com/apis/shift-planner',
    techDesignUrl: 'https://confluence.example.com/display/PC/shift-planner-design',
    architectureDiagramUrl: 'https://diagrams.example.com/shift-planner',
    licenseServerIntegrated: false,
    libraries: [
      { name: 'spring-boot-starter-web', version: '3.1.2' },
      { name: 'camunda-bpm-spring-boot-starter', version: '7.19.0' },
      { name: 'mapstruct', version: '1.5.5.Final' }
    ],
    clientType: 'desktop',
    deploymentTool: 'kubernetes',
    dependencies: ['module-well-dashboard'],
    produces: ['artifact-shift-plan'],
    reuseScore: 0.69,
    metrics: {
      tests: 124,
      coverage: 85,
      automationRate: 76
    },
    dataIn: [
      {
        id: 'deviation-input',
        label: 'Показатели отклонений',
        sourceId: 'artifact-deviation-report'
      },
      {
        id: 'operational-constraints',
        label: 'Ограничения по фонду'
      }
    ],
    dataOut: [
      {
        id: 'shift-plan',
        label: 'План смены добычи',
        consumerIds: ['module-investment-evaluator']
      }
    ],
    formula: 'plan = optimize(targets, constraints)',
    nonFunctional: {
      responseTimeMs: 540,
      throughputRps: 120,
      resourceConsumption: '6 vCPU / 24 GB RAM'
    }
  },
  {
    id: 'module-lift-predictor',
    name: 'Прогноз отказов УЭЦН',
    description:
      'Использует исторические ремонты и текущие режимы работы для расчёта вероятности отказов погружных установок.',
    domains: ['lift-diagnostics'],
    team: 'Reliability Engineering',
    owner: 'Сергей Баширов',
    productName: 'Reliability Intelligence Platform',
    projectTeam: [
      { id: 'lift-owner', fullName: 'Сергей Баширов', role: 'Владелец продукта' },
      { id: 'lift-rd', fullName: 'Дарья Прокофьева', role: 'Эксперт R&D' },
      { id: 'lift-analyst', fullName: 'Антон Тарский', role: 'Аналитик' },
      { id: 'lift-backend', fullName: 'Владислав Кочетков', role: 'Backend' },
      { id: 'lift-frontend', fullName: 'Светлана Бушуева', role: 'Frontend' },
      { id: 'lift-architect', fullName: 'Игорь Щербаков', role: 'Архитектор' },
      { id: 'lift-tester', fullName: 'Олеся Макарова', role: 'Тестировщик' }
    ],
    technologyStack: ['Python', 'FastAPI', 'PyTorch', 'Apache Kafka'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: 'АО «НефтеИнтеллект»',
    userStats: { companies: 7, licenses: 640 },
    status: 'in-dev',
    repository: 'https://git.example.com/reliability/lift-predictor',
    api: 'gRPC reliability.FailurePredictor/Score',
    specificationUrl: 'https://confluence.example.com/pages/viewpage.action?pageId=30551',
    apiContractsUrl: 'https://docs.example.com/apis/lift-predictor',
    techDesignUrl: 'https://confluence.example.com/display/RD/lift-predictor-design',
    architectureDiagramUrl: 'https://diagrams.example.com/lift-predictor',
    licenseServerIntegrated: false,
    libraries: [
      { name: 'fastapi', version: '0.111.0' },
      { name: 'pydantic', version: '1.10.13' },
      { name: 'torch', version: '2.1.0' }
    ],
    clientType: 'web',
    deploymentTool: 'docker',
    dependencies: ['module-telemetry-cleansing'],
    produces: ['artifact-failure-forecast'],
    reuseScore: 0.58,
    metrics: {
      tests: 98,
      coverage: 80,
      automationRate: 72
    },
    dataIn: [
      {
        id: 'telemetry-input',
        label: 'Очищенная телеметрия',
        sourceId: 'artifact-clean-telemetry'
      },
      {
        id: 'maintenance-history',
        label: 'История ремонтов'
      }
    ],
    dataOut: [
      {
        id: 'failure-probability',
        label: 'Прогноз отказов',
        consumerIds: ['module-energy-optimizer']
      }
    ],
    formula: 'p_fail = model(telemetry, history)',
    nonFunctional: {
      responseTimeMs: 620,
      throughputRps: 85,
      resourceConsumption: '8 vCPU / 32 GB RAM (GPU)'
    }
  },
  {
    id: 'module-energy-optimizer',
    name: 'Оптимизация энергопотребления',
    description:
      'Рассчитывает режимы работы насосов для снижения энергозатрат с учётом риска отказов и тарифов.',
    domains: ['energy-optimization'],
    team: 'Energy Efficiency Lab',
    owner: 'Мария Егорова',
    productName: 'Reliability Intelligence Platform',
    projectTeam: [
      { id: 'energy-owner', fullName: 'Мария Егорова', role: 'Владелец продукта' },
      { id: 'energy-rd', fullName: 'Виктор Маликов', role: 'Эксперт R&D' },
      { id: 'energy-analyst', fullName: 'Людмила Котова', role: 'Аналитик' },
      { id: 'energy-backend', fullName: 'Григорий Аверин', role: 'Backend' },
      { id: 'energy-frontend', fullName: 'Елена Серова', role: 'Frontend' },
      { id: 'energy-architect', fullName: 'Кирилл Никитин', role: 'Архитектор' },
      { id: 'energy-tester', fullName: 'Жанна Фирсова', role: 'Тестировщик' }
    ],
    technologyStack: ['Python', 'FastAPI', 'NumPy', 'Redis'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: 'АО «НефтеИнтеллект»',
    userStats: { companies: 11, licenses: 980 },
    status: 'production',
    repository: 'https://git.example.com/energy/optimizer',
    api: 'REST /api/v1/energy/optimization',
    specificationUrl: 'https://confluence.example.com/pages/viewpage.action?pageId=31502',
    apiContractsUrl: 'https://docs.example.com/apis/energy-optimizer',
    techDesignUrl: 'https://confluence.example.com/display/EN/energy-optimizer-design',
    architectureDiagramUrl: 'https://diagrams.example.com/energy-optimizer',
    licenseServerIntegrated: true,
    libraries: [
      { name: 'fastapi', version: '0.111.0' },
      { name: 'numpy', version: '1.26.4' },
      { name: 'scikit-learn', version: '1.4.2' }
    ],
    clientType: 'web',
    deploymentTool: 'kubernetes',
    dependencies: ['module-lift-predictor'],
    produces: ['artifact-energy-balance'],
    reuseScore: 0.77,
    metrics: {
      tests: 156,
      coverage: 87,
      automationRate: 81
    },
    dataIn: [
      {
        id: 'failure-forecast',
        label: 'Прогноз отказов УЭЦН',
        sourceId: 'artifact-failure-forecast'
      },
      {
        id: 'energy-tariffs',
        label: 'Тарифы на электроэнергию'
      }
    ],
    dataOut: [
      {
        id: 'energy-balance',
        label: 'Баланс энергопотребления',
        consumerIds: ['module-investment-evaluator']
      },
      {
        id: 'efficiency-advice',
        label: 'Рекомендации по энергоэффективности'
      }
    ],
    formula: 'balance = Σ(load_i * tariff_i) - savings_risk_adjusted',
    nonFunctional: {
      responseTimeMs: 480,
      throughputRps: 150,
      resourceConsumption: '6 vCPU / 20 GB RAM'
    }
  },
  {
    id: 'module-investment-evaluator',
    name: 'Оценка инвестиционной эффективности',
    description:
      'Консолидирует производственные планы и энергопоказатели для расчёта NPV, IRR и формирования инвестиционного досье.',
    domains: ['investment-analysis'],
    team: 'Corporate Finance Analytics',
    owner: 'Дмитрий Орлов',
    productName: 'Capital Strategy Workspace',
    projectTeam: [
      { id: 'invest-owner', fullName: 'Дмитрий Орлов', role: 'Владелец продукта' },
      { id: 'invest-rd', fullName: 'Вера Литвиненко', role: 'Эксперт R&D' },
      { id: 'invest-analyst', fullName: 'Олег Каменев', role: 'Аналитик' },
      { id: 'invest-backend', fullName: 'Михаил Греков', role: 'Backend' },
      { id: 'invest-frontend', fullName: 'Анна Шульгина', role: 'Frontend' },
      { id: 'invest-architect', fullName: 'Игорь Цветков', role: 'Архитектор' },
      { id: 'invest-tester', fullName: 'Полина Юрьева', role: 'Тестировщик' }
    ],
    technologyStack: ['C#', '.NET 7', 'React', 'MS SQL'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: 'АО «НефтеИнтеллект»',
    userStats: { companies: 15, licenses: 3100 },
    status: 'production',
    repository: 'https://git.example.com/finance/invest-evaluator',
    api: 'REST /api/v1/investments/score',
    specificationUrl: 'https://confluence.example.com/pages/viewpage.action?pageId=40211',
    apiContractsUrl: 'https://docs.example.com/apis/investment-evaluator',
    techDesignUrl: 'https://confluence.example.com/display/FIN/investment-evaluator-design',
    architectureDiagramUrl: 'https://diagrams.example.com/investment-evaluator',
    licenseServerIntegrated: true,
    libraries: [
      { name: 'AutoMapper', version: '12.0.1' },
      { name: 'Dapper', version: '2.1.35' },
      { name: 'Serilog', version: '3.0.1' }
    ],
    clientType: 'desktop',
    deploymentTool: 'kubernetes',
    dependencies: ['module-shift-planner', 'module-energy-optimizer'],
    produces: ['artifact-investment-brief'],
    reuseScore: 0.83,
    metrics: {
      tests: 204,
      coverage: 91,
      automationRate: 86
    },
    dataIn: [
      {
        id: 'shift-plan-input',
        label: 'План смены',
        sourceId: 'artifact-shift-plan'
      },
      {
        id: 'energy-balance-input',
        label: 'Баланс энергопотребления',
        sourceId: 'artifact-energy-balance'
      }
    ],
    dataOut: [
      {
        id: 'investment-brief',
        label: 'Инвестиционный отчёт'
      },
      {
        id: 'capital-metrics',
        label: 'Показатели NPV и IRR'
      }
    ],
    formula: 'NPV = Σ((cash_in_t - cash_out_t) / (1 + WACC)^t) - CAPEX',
    nonFunctional: {
      responseTimeMs: 850,
      throughputRps: 65,
      resourceConsumption: '10 vCPU / 40 GB RAM'
    }
  },
  {
    id: 'module-risk-register',
    name: 'Реестр проектных рисков',
    description:
      'Хранит и классифицирует риски инвестиционных проектов, собирая информацию из аудитов и комплаенс-проверок.',
    domains: ['investment-analysis'],
    team: 'Project Governance',
    owner: 'Анна Лебедева',
    productName: 'Capital Strategy Workspace',
    projectTeam: [
      { id: 'risk-owner', fullName: 'Анна Лебедева', role: 'Владелец продукта' },
      { id: 'risk-rd', fullName: 'Руслан Фетисов', role: 'Эксперт R&D' },
      { id: 'risk-analyst', fullName: 'Ирина Сидорова', role: 'Аналитик' },
      { id: 'risk-backend', fullName: 'Георгий Аксенов', role: 'Backend' },
      { id: 'risk-frontend', fullName: 'Алёна Крайнова', role: 'Frontend' },
      { id: 'risk-architect', fullName: 'Виталий Муромцев', role: 'Архитектор' },
      { id: 'risk-tester', fullName: 'Наталия Фомина', role: 'Тестировщик' }
    ],
    technologyStack: ['TypeScript', 'NestJS', 'PostgreSQL', 'RabbitMQ'],
    localization: 'Только русский язык',
    ridOwner: 'АО «НефтеИнтеллект»',
    userStats: { companies: 6, licenses: 540 },
    status: 'in-dev',
    repository: 'https://git.example.com/governance/risk-register',
    api: 'REST /api/v1/risks',
    specificationUrl: 'https://confluence.example.com/pages/viewpage.action?pageId=41222',
    apiContractsUrl: 'https://docs.example.com/apis/risk-register',
    techDesignUrl: 'https://confluence.example.com/display/GOV/risk-register-design',
    architectureDiagramUrl: 'https://diagrams.example.com/risk-register',
    licenseServerIntegrated: false,
    libraries: [
      { name: '@nestjs/swagger', version: '7.1.12' },
      { name: 'typeorm', version: '0.3.20' },
      { name: 'pg', version: '8.11.3' }
    ],
    clientType: 'web',
    deploymentTool: 'docker',
    dependencies: [],
    produces: [],
    reuseScore: 0.42,
    metrics: {
      tests: 48,
      coverage: 72,
      automationRate: 60
    },
    dataIn: [
      {
        id: 'audit-reports',
        label: 'Отчёты аудитов'
      },
      {
        id: 'compliance-checks',
        label: 'Комплаенс чек-листы'
      }
    ],
    dataOut: [
      {
        id: 'risk-dashboard',
        label: 'Дашборд рисков'
      }
    ],
    formula: 'risk_score = probability * impact',
    nonFunctional: {
      responseTimeMs: 620,
      throughputRps: 55,
      resourceConsumption: '4 vCPU / 10 GB RAM'
    }
  }
];

export const moduleNameById: Record<string, string> = modules.reduce((acc, module) => {
  acc[module.id] = module.name;
  return acc;
}, {} as Record<string, string>);

export type ArtifactNode = {
  id: string;
  name: string;
  description: string;
  domainId: string;
  producedBy: string;
  consumerIds: string[];
  dataType: string;
  sampleUrl: string;
};

export const artifacts: ArtifactNode[] = [
  {
    id: 'artifact-clean-telemetry',
    name: 'Очищенная телеметрия',
    description:
      'Нормализованные показания датчиков скважин, очищенные от выбросов и приведённые к единому формату.',
    domainId: 'well-operations',
    producedBy: 'module-telemetry-cleansing',
    consumerIds: ['module-well-dashboard', 'module-lift-predictor'],
    dataType: 'Временной ряд телеметрии',
    sampleUrl: 'https://storage.example.com/datasets/telemetry-clean-sample.parquet'
  },
  {
    id: 'artifact-deviation-report',
    name: 'Отчёт об отклонениях',
    description:
      'Сводный отчёт по фактической добыче и плановым лимитам с выделением критических отклонений.',
    domainId: 'well-operations',
    producedBy: 'module-well-dashboard',
    consumerIds: ['module-shift-planner', 'module-investment-evaluator'],
    dataType: 'Агрегированные метрики',
    sampleUrl: 'https://storage.example.com/datasets/deviation-report-sample.xlsx'
  },
  {
    id: 'artifact-shift-plan',
    name: 'Сменный план добычи',
    description:
      'Оптимизированное сменное задание с разбивкой по скважинам и оборудованию.',
    domainId: 'short-term-planning',
    producedBy: 'module-shift-planner',
    consumerIds: ['module-investment-evaluator'],
    dataType: 'Операционный план',
    sampleUrl: 'https://storage.example.com/datasets/shift-plan-sample.json'
  },
  {
    id: 'artifact-failure-forecast',
    name: 'Прогноз отказов УЭЦН',
    description:
      'Предсказанные вероятности отказов насосного оборудования и ожидаемый срок до события.',
    domainId: 'lift-diagnostics',
    producedBy: 'module-lift-predictor',
    consumerIds: ['module-energy-optimizer'],
    dataType: 'Вероятностная оценка',
    sampleUrl: 'https://storage.example.com/datasets/failure-forecast-sample.csv'
  },
  {
    id: 'artifact-energy-balance',
    name: 'Баланс энергопотребления',
    description:
      'Расчётные профили энергопотребления с учётом оптимизационных сценариев и тарифов.',
    domainId: 'energy-optimization',
    producedBy: 'module-energy-optimizer',
    consumerIds: ['module-investment-evaluator'],
    dataType: 'Энергетический баланс',
    sampleUrl: 'https://storage.example.com/datasets/energy-balance-sample.csv'
  },
  {
    id: 'artifact-investment-brief',
    name: 'Инвестиционное досье',
    description:
      'Инвестиционное досье с ключевыми финансовыми метриками, сценариями и рекомендациями.',
    domainId: 'investment-analysis',
    producedBy: 'module-investment-evaluator',
    consumerIds: [],
    dataType: 'Финансовый отчёт',
    sampleUrl: 'https://storage.example.com/datasets/investment-brief-sample.pdf'
  }
];

export const artifactNameById: Record<string, string> = artifacts.reduce((acc, artifact) => {
  acc[artifact.id] = artifact.name;
  return acc;
}, {} as Record<string, string>);

export type GraphLink = {
  source: string;
  target: string;
  type: 'domain' | 'dependency' | 'produces' | 'consumes';
};

const moduleById: Record<string, ModuleNode> = modules.reduce((acc, module) => {
  acc[module.id] = module;
  return acc;
}, {} as Record<string, ModuleNode>);

export const moduleLinks: GraphLink[] = modules.flatMap((module) => {
  const domainLinks: GraphLink[] = module.domains.map((domainId) => ({
    source: module.id,
    target: domainId,
    type: 'domain'
  }));

  const dependencyLinks: GraphLink[] = module.dependencies.map((dependencyId) => ({
    source: module.id,
    target: dependencyId,
    type: 'dependency'
  }));

  const produceLinks: GraphLink[] = module.produces.map((artifactId) => ({
    source: module.id,
    target: artifactId,
    type: 'produces'
  }));

  const consumeLinks: GraphLink[] = module.dataIn
    .filter((input) => input.sourceId && artifactNameById[input.sourceId])
    .map((input) => ({
      source: input.sourceId as string,
      target: module.id,
      type: 'consumes'
    }));

  return [...domainLinks, ...dependencyLinks, ...produceLinks, ...consumeLinks];
});

export { moduleById };
