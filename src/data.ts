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

export type ModuleNode = {
  id: string;
  name: string;
  description: string;
  domains: string[];
  team: string;
  owner: string;
  status: ModuleStatus;
  repository?: string;
  api?: string;
  dependencies: string[];
  produces: string[];
  reuseScore: number;
  metrics: {
    tests?: number;
    coverage?: number;
    latencyMs?: number;
  };
  dataIn: ModuleInput[];
  dataOut: ModuleOutput[];
  formula: string;
};

export const domainTree: DomainNode[] = [
  {
    id: 'competencies',
    name: 'Компетенции',
    description: 'Структура цифровых компетенций компании',
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
    status: 'production',
    repository: 'https://git.example.com/upstream/telemetry-cleansing',
    api: 'Kafka stream telemetry.normalized',
    dependencies: [],
    produces: ['artifact-clean-telemetry'],
    reuseScore: 0.86,
    metrics: {
      tests: 210,
      coverage: 93,
      latencyMs: 240
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
    formula: 'value_norm = (value_raw - bias) * scale'
  },
  {
    id: 'module-well-dashboard',
    name: 'Дашборд фонда скважин',
    description:
      'Агрегирует показатели фонда скважин, визуализирует отклонения факта от сменных лимитов и формирует предупреждения.',
    domains: ['well-operations', 'short-term-planning'],
    team: 'Production Control Room',
    owner: 'Илья Киселёв',
    status: 'production',
    repository: 'https://git.example.com/production/well-dashboard',
    api: 'REST /api/v1/wells/dashboard',
    dependencies: ['module-telemetry-cleansing'],
    produces: ['artifact-deviation-report'],
    reuseScore: 0.74,
    metrics: {
      tests: 168,
      coverage: 88,
      latencyMs: 360
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
    formula: 'deviation = fact_volume - plan_volume'
  },
  {
    id: 'module-shift-planner',
    name: 'Сменное планирование добычи',
    description:
      'Оптимизирует сменные задания на основе фактических ограничений, отклонений и доступности оборудования.',
    domains: ['short-term-planning'],
    team: 'Production Planning',
    owner: 'Елена Савина',
    status: 'production',
    repository: 'https://git.example.com/production/shift-planner',
    api: 'REST /api/v1/plans/shift',
    dependencies: ['module-well-dashboard'],
    produces: ['artifact-shift-plan'],
    reuseScore: 0.69,
    metrics: {
      tests: 124,
      coverage: 85,
      latencyMs: 540
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
    formula: 'plan = optimize(targets, constraints)'
  },
  {
    id: 'module-lift-predictor',
    name: 'Прогноз отказов УЭЦН',
    description:
      'Использует исторические ремонты и текущие режимы работы для расчёта вероятности отказов погружных установок.',
    domains: ['lift-diagnostics'],
    team: 'Reliability Engineering',
    owner: 'Сергей Баширов',
    status: 'in-dev',
    repository: 'https://git.example.com/reliability/lift-predictor',
    api: 'gRPC reliability.FailurePredictor/Score',
    dependencies: ['module-telemetry-cleansing'],
    produces: ['artifact-failure-forecast'],
    reuseScore: 0.58,
    metrics: {
      tests: 98,
      coverage: 80,
      latencyMs: 620
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
    formula: 'p_fail = model(telemetry, history)'
  },
  {
    id: 'module-energy-optimizer',
    name: 'Оптимизация энергопотребления',
    description:
      'Рассчитывает режимы работы насосов для снижения энергозатрат с учётом риска отказов и тарифов.',
    domains: ['energy-optimization'],
    team: 'Energy Efficiency Lab',
    owner: 'Мария Егорова',
    status: 'production',
    repository: 'https://git.example.com/energy/optimizer',
    api: 'REST /api/v1/energy/optimization',
    dependencies: ['module-lift-predictor'],
    produces: ['artifact-energy-balance'],
    reuseScore: 0.77,
    metrics: {
      tests: 156,
      coverage: 87,
      latencyMs: 480
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
    formula: 'balance = Σ(load_i * tariff_i) - savings_risk_adjusted'
  },
  {
    id: 'module-investment-evaluator',
    name: 'Оценка инвестиционной эффективности',
    description:
      'Консолидирует производственные планы и энергопоказатели для расчёта NPV, IRR и формирования инвестиционного досье.',
    domains: ['investment-analysis'],
    team: 'Corporate Finance Analytics',
    owner: 'Дмитрий Орлов',
    status: 'production',
    repository: 'https://git.example.com/finance/invest-evaluator',
    api: 'REST /api/v1/investments/score',
    dependencies: ['module-shift-planner', 'module-energy-optimizer'],
    produces: ['artifact-investment-brief'],
    reuseScore: 0.83,
    metrics: {
      tests: 204,
      coverage: 91,
      latencyMs: 850
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
    formula: 'NPV = Σ((cash_in_t - cash_out_t) / (1 + WACC)^t) - CAPEX'
  },
  {
    id: 'module-risk-register',
    name: 'Реестр проектных рисков',
    description:
      'Хранит и классифицирует риски инвестиционных проектов, собирая информацию из аудитов и комплаенс-проверок.',
    domains: ['investment-analysis'],
    team: 'Project Governance',
    owner: 'Анна Лебедева',
    status: 'in-dev',
    repository: 'https://git.example.com/governance/risk-register',
    api: 'REST /api/v1/risks',
    dependencies: [],
    produces: [],
    reuseScore: 0.42,
    metrics: {
      tests: 48,
      coverage: 72,
      latencyMs: 620
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
    formula: 'risk_score = probability * impact'
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
