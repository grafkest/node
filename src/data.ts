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
    id: 'solutions',
    name: 'Решения',
    description: 'Компетенции цифрового портфеля компании',
    children: [
      {
        id: 'business-management',
        name: 'Управление бизнесом',
        description: 'Стратегия, инвестиции и эффективность активов',
        children: [
          {
            id: 'strategy-asset',
            name: 'Стратегическое управление активами',
            description: 'Долгосрочные цели развития активов и капитальные вложения'
          },
          {
            id: 'performance-management',
            name: 'Управление эффективностью',
            description: 'Контроль KPI добычи, потерь и производительности'
          },
          {
            id: 'investment-portfolio',
            name: 'Инвестиционный портфель',
            description: 'Сценарное планирование и приоритизация проектов'
          },
          {
            id: 'contract-management',
            name: 'Управление договорами',
            description: 'Жизненный цикл договоров и обязательств'
          }
        ]
      },
      {
        id: 'production-management',
        name: 'Управление добычей',
        description: 'Оперативное планирование и контроль добычи',
        children: [
          {
            id: 'production-monitoring',
            name: 'Мониторинг добычи',
            description: 'Диспетчеризация фонда скважин и телеметрия'
          },
          {
            id: 'production-planning',
            name: 'Планирование добычи',
            description: 'Формирование оперативных и среднесрочных планов'
          },
          {
            id: 'production-optimization',
            name: 'Оптимизация добычи',
            description: 'Повышение дебита и снижение потерь'
          },
          {
            id: 'production-accounting',
            name: 'Производственный учёт',
            description: 'Бухгалтерия добытых объёмов и потерь'
          }
        ]
      },
      {
        id: 'engineering-support',
        name: 'Инженерная поддержка',
        description: 'Диагностика и расчёты технологического оборудования',
        children: [
          {
            id: 'lift-diagnostics',
            name: 'Диагностика лифтового оборудования',
            description: 'Состояние насосов, штуцеров и систем ППД'
          },
          {
            id: 'equipment-analytics',
            name: 'Аналитика оборудования',
            description: 'Прогноз отказов и контроль режимов работы'
          },
          {
            id: 'energy-efficiency',
            name: 'Энергоэффективность',
            description: 'Оптимизация энергопотребления установок'
          }
        ]
      },
      {
        id: 'drilling-workover',
        name: 'Бурение и КРС',
        description: 'Планирование бурения и капитальных ремонтов',
        children: [
          {
            id: 'drilling-planning',
            name: 'Планирование бурения',
            description: 'Графики бурения и управление подрядчиками'
          },
          {
            id: 'drilling-execution',
            name: 'Оперативное сопровождение бурения',
            description: 'Контроль хода буровых работ'
          },
          {
            id: 'workover-management',
            name: 'Капитальный ремонт скважин',
            description: 'Подбор и приоритизация мероприятий КРС'
          }
        ]
      },
      {
        id: 'geology',
        name: 'Геология',
        description: 'Моделирование месторождений и анализ геоданных',
        children: [
          {
            id: 'reservoir-model',
            name: 'Геолого-техническая модель',
            description: 'Построение цифровых моделей пластов'
          },
          {
            id: 'seismic-interpretation',
            name: 'Сейсморазведка и интерпретация',
            description: 'Обработка сейсмических кубов и разрезов'
          },
          {
            id: 'resource-estimation',
            name: 'Подсчёт запасов',
            description: 'Оценка остаточных запасов и сценариев разработки'
          }
        ]
      },
      {
        id: 'transport',
        name: 'Транспорт нефти и газа',
        description: 'Диспетчеризация потоков и управление инфраструктурой',
        children: [
          {
            id: 'pipeline-dispatch',
            name: 'Диспетчеризация трубопроводов',
            description: 'Управление пропускной способностью и авариями'
          },
          {
            id: 'storage-management',
            name: 'Управление складами',
            description: 'Оптимизация резервуарного парка'
          },
          {
            id: 'shipping-planning',
            name: 'Планирование отгрузок',
            description: 'Графики отгрузок и логистика'
          }
        ]
      },
      {
        id: 'energy',
        name: 'Энергия',
        description: 'Контроль энергоресурсов и энергоэффективность',
        children: [
          {
            id: 'power-balance',
            name: 'Энергетический баланс',
            description: 'Балансировка потребления и генерации энергии'
          },
          {
            id: 'energy-monitoring',
            name: 'Мониторинг энергопотребления',
            description: 'Анализ и контроль энергоиспользования'
          },
          {
            id: 'energy-optimization',
            name: 'Оптимизация энергозатрат',
            description: 'Снижение удельных затрат на энергию'
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
    id: 'module-telemetry-ingest',
    name: 'Поток телеметрии скважин',
    description: 'Собирает и нормализует телеметрию фонда скважин и насосного оборудования в реальном времени.',
    domains: ['production-monitoring', 'lift-diagnostics', 'energy-monitoring'],
    team: 'Field Data Platform',
    owner: 'Наталья Коваль',
    status: 'production',
    repository: 'https://git.example.com/upstream/telemetry-ingest',
    api: 'Kafka telemetry.normalized',
    dependencies: [],
    produces: ['artifact-clean-telemetry'],
    reuseScore: 0.86,
    metrics: {
      tests: 210,
      coverage: 93,
      latencyMs: 280
    },
    dataIn: [
      {
        id: 'raw-stream',
        label: 'Сырые сообщения датчиков'
      },
      {
        id: 'asset-passports',
        label: 'Паспорта оборудования',
        sourceId: 'artifact-asset-passports'
      }
    ],
    dataOut: [
      {
        id: 'clean-telemetry',
        label: 'Очищенная телеметрия',
        consumerIds: ['module-production-analytics', 'module-pipeline-optimizer', 'module-energy-monitor']
      }
    ],
    formula: 'normalized = (rawValue - sensor.bias) * sensor.calibrationFactor'
  },
  {
    id: 'module-reservoir-modeler',
    name: 'Моделирование пласта',
    description: 'Строит геолого-технические модели и прогноз добычи по сценариям закачки и режимам работы.',
    domains: ['reservoir-model', 'seismic-interpretation', 'resource-estimation'],
    team: 'Geology Models',
    owner: 'Александр Жуков',
    status: 'production',
    repository: 'https://git.example.com/geology/reservoir-modeler',
    api: 'REST /api/v1/reservoir/model',
    dependencies: [],
    produces: ['artifact-reservoir-forecast'],
    reuseScore: 0.8,
    metrics: {
      tests: 160,
      coverage: 88,
      latencyMs: 720
    },
    dataIn: [
      {
        id: 'seismic-cubes',
        label: 'Сейсмические кубы и интерпретации',
        sourceId: 'artifact-seismic-cubes'
      },
      {
        id: 'historical-production',
        label: 'История добычи по скважинам',
        sourceId: 'artifact-clean-telemetry'
      }
    ],
    dataOut: [
      {
        id: 'reservoir-forecast',
        label: 'Прогнозные профили добычи',
        consumerIds: ['module-production-analytics', 'module-workover-planner', 'module-investment-portfolio']
      }
    ],
    formula: 'forecast = reservoirSimulator(model, injectionScenario, historicalProduction)'
  },
  {
    id: 'module-production-analytics',
    name: 'Аналитика добычи',
    description: 'Расчитывает показатели добычи, потери и эффективность фонда скважин для оперативного управления.',
    domains: ['production-monitoring', 'production-optimization', 'production-accounting'],
    team: 'Operations Intelligence',
    owner: 'Иван Терехов',
    status: 'production',
    repository: 'https://git.example.com/operations/production-analytics',
    api: 'REST /api/v1/production/metrics',
    dependencies: ['module-telemetry-ingest', 'module-reservoir-modeler'],
    produces: ['artifact-production-metrics', 'artifact-losses-report'],
    reuseScore: 0.83,
    metrics: {
      tests: 240,
      coverage: 91,
      latencyMs: 540
    },
    dataIn: [
      {
        id: 'clean-telemetry',
        label: 'Очищенная телеметрия',
        sourceId: 'artifact-clean-telemetry'
      },
      {
        id: 'reservoir-forecast',
        label: 'Прогнозные профили добычи',
        sourceId: 'artifact-reservoir-forecast'
      }
    ],
    dataOut: [
      {
        id: 'production-metrics',
        label: 'Показатели добычи',
        consumerIds: ['module-production-control-room', 'module-workover-planner']
      },
      {
        id: 'losses-report',
        label: 'Отчёт по потерям',
        consumerIds: ['module-production-control-room']
      }
    ],
    formula: 'q_eff = sum(actualRate) / sum(planRate)'
  },
  {
    id: 'module-workover-planner',
    name: 'Планировщик КРС',
    description: 'Формирует программу капитальных ремонтов скважин на основе потерь дебита и технических ограничений.',
    domains: ['drilling-planning', 'workover-management', 'production-planning'],
    team: 'Well Operations',
    owner: 'Ольга Фомина',
    status: 'in-dev',
    repository: 'https://git.example.com/wells/workover-planner',
    api: 'REST /api/v1/workover/plan',
    dependencies: ['module-production-analytics', 'module-reservoir-modeler'],
    produces: ['artifact-workover-plan', 'artifact-workover-passports'],
    reuseScore: 0.64,
    metrics: {
      tests: 130,
      coverage: 82,
      latencyMs: 810
    },
    dataIn: [
      {
        id: 'production-metrics',
        label: 'Показатели добычи',
        sourceId: 'artifact-production-metrics'
      },
      {
        id: 'reservoir-forecast',
        label: 'Прогнозные профили добычи',
        sourceId: 'artifact-reservoir-forecast'
      }
    ],
    dataOut: [
      {
        id: 'workover-plan',
        label: 'План КРС',
        consumerIds: ['module-production-control-room']
      },
      {
        id: 'workover-passport',
        label: 'Паспорта ремонтов'
      }
    ],
    formula: 'priority = Δдебит * весРентабельности / длительностьРабот'
  },
  {
    id: 'module-production-control-room',
    name: 'Ситуационный центр добычи',
    description: 'Консолидирует ключевые показатели и формирует сменные планы добычи с управлением отклонениями.',
    domains: ['production-planning', 'production-monitoring', 'performance-management'],
    team: 'Operations Center',
    owner: 'Мария Лебедева',
    status: 'production',
    repository: 'https://git.example.com/operations/control-room',
    api: 'GraphQL /graphql',
    dependencies: ['module-production-analytics', 'module-workover-planner'],
    produces: ['artifact-production-plan', 'artifact-deviation-dashboard'],
    reuseScore: 0.78,
    metrics: {
      tests: 200,
      coverage: 89,
      latencyMs: 620
    },
    dataIn: [
      {
        id: 'production-metrics',
        label: 'Показатели добычи',
        sourceId: 'artifact-production-metrics'
      },
      {
        id: 'workover-plan',
        label: 'План КРС',
        sourceId: 'artifact-workover-plan'
      },
      {
        id: 'losses-report',
        label: 'Отчёт по потерям',
        sourceId: 'artifact-losses-report'
      }
    ],
    dataOut: [
      {
        id: 'shift-plan',
        label: 'Оперативный план добычи',
        consumerIds: ['module-pipeline-optimizer', 'module-investment-portfolio']
      },
      {
        id: 'deviation-dashboard',
        label: 'Дашборд отклонений',
        consumerIds: ['module-energy-monitor']
      }
    ],
    formula: 'shiftPlan = optimize(planInputs, equipmentConstraints, workoverSchedule)'
  },
  {
    id: 'module-pipeline-optimizer',
    name: 'Оптимизатор прокачки',
    description: 'Оптимизирует график прокачки и загрузку инфраструктуры транспортировки нефти.',
    domains: ['pipeline-dispatch', 'storage-management', 'production-planning'],
    team: 'Midstream Logistics',
    owner: 'Андрей Романов',
    status: 'in-dev',
    repository: 'https://git.example.com/logistics/pipeline-optimizer',
    api: 'REST /api/v1/pipeline/schedule',
    dependencies: ['module-production-control-room'],
    produces: ['artifact-pipeline-schedule'],
    reuseScore: 0.7,
    metrics: {
      tests: 150,
      coverage: 84,
      latencyMs: 680
    },
    dataIn: [
      {
        id: 'shift-plan',
        label: 'Оперативный план добычи',
        sourceId: 'artifact-production-plan'
      },
      {
        id: 'clean-telemetry',
        label: 'Очищенная телеметрия',
        sourceId: 'artifact-clean-telemetry'
      }
    ],
    dataOut: [
      {
        id: 'flow-schedule',
        label: 'График прокачки',
        consumerIds: ['module-energy-monitor']
      },
      {
        id: 'storage-utilization',
        label: 'Загрузка резервуаров'
      }
    ],
    formula: 'schedule = linearOptimize(flowConstraints, demand, energyCosts)'
  },
  {
    id: 'module-energy-monitor',
    name: 'Мониторинг энергопотребления',
    description: 'Сводит энергобаланс промысла, выявляет аномалии и рассылает уведомления по эффективности.',
    domains: ['energy-monitoring', 'energy-optimization', 'equipment-analytics'],
    team: 'Energy Lab',
    owner: 'Сергей Петров',
    status: 'production',
    repository: 'https://git.example.com/energy/monitor',
    api: 'REST /api/v1/energy/balance',
    dependencies: ['module-telemetry-ingest', 'module-pipeline-optimizer'],
    produces: ['artifact-energy-balance', 'artifact-energy-alerts'],
    reuseScore: 0.75,
    metrics: {
      tests: 175,
      coverage: 86,
      latencyMs: 560
    },
    dataIn: [
      {
        id: 'clean-telemetry',
        label: 'Очищенная телеметрия',
        sourceId: 'artifact-clean-telemetry'
      },
      {
        id: 'flow-schedule',
        label: 'График прокачки',
        sourceId: 'artifact-pipeline-schedule'
      }
    ],
    dataOut: [
      {
        id: 'energy-balance',
        label: 'Баланс энергопотребления',
        consumerIds: ['module-investment-portfolio']
      },
      {
        id: 'efficiency-alerts',
        label: 'Алерты по энергоэффективности',
        consumerIds: ['module-production-control-room']
      }
    ],
    formula: 'balance = Σ(потребление) - Σ(генерация)' 
  },
  {
    id: 'module-investment-portfolio',
    name: 'Инвестиционный аналитик',
    description: 'Формирует инвестиционные паспорта и сценарии развития на основе производственных и энергобалансовых данных.',
    domains: ['investment-portfolio', 'strategy-asset', 'performance-management'],
    team: 'Corporate Planning',
    owner: 'Дмитрий Орлов',
    status: 'production',
    repository: 'https://git.example.com/finance/investment-portfolio',
    api: 'REST /api/v1/investment/cases',
    dependencies: ['module-production-control-room', 'module-reservoir-modeler', 'module-energy-monitor'],
    produces: ['artifact-investment-passport', 'artifact-portfolio-report'],
    reuseScore: 0.82,
    metrics: {
      tests: 220,
      coverage: 90,
      latencyMs: 840
    },
    dataIn: [
      {
        id: 'shift-plan',
        label: 'Оперативный план добычи',
        sourceId: 'artifact-production-plan'
      },
      {
        id: 'reservoir-forecast',
        label: 'Прогнозные профили добычи',
        sourceId: 'artifact-reservoir-forecast'
      },
      {
        id: 'energy-balance',
        label: 'Баланс энергопотребления',
        sourceId: 'artifact-energy-balance'
      }
    ],
    dataOut: [
      {
        id: 'investment-case',
        label: 'Инвестиционный паспорт проекта'
      },
      {
        id: 'portfolio-report',
        label: 'Отчёт по портфелю'
      }
    ],
    formula: 'NPV = Σ((cashIn - cashOut) / (1 + WACC)^t)'
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
};

export const artifacts: ArtifactNode[] = [
  {
    id: 'artifact-clean-telemetry',
    name: 'Очищенная телеметрия',
    description: 'Нормализованные показания датчиков скважин.'
  },
  {
    id: 'artifact-asset-passports',
    name: 'Паспорта оборудования',
    description: 'Справочник характеристик оборудования и насосов.'
  },
  {
    id: 'artifact-seismic-cubes',
    name: 'Сейсмические кубы',
    description: 'Интерпретированные сейсмические данные по месторождению.'
  },
  {
    id: 'artifact-reservoir-forecast',
    name: 'Прогнозные профили добычи',
    description: 'Сценарии дебита и накопленной добычи по скважинам.'
  },
  {
    id: 'artifact-production-metrics',
    name: 'Показатели добычи',
    description: 'Консолидированные KPI добычи и потерь.'
  },
  {
    id: 'artifact-losses-report',
    name: 'Отчёт по потерям',
    description: 'Детализация потерь добычи по причинам.'
  },
  {
    id: 'artifact-workover-plan',
    name: 'План КРС',
    description: 'Приоритизированный перечень работ по капитальному ремонту.'
  },
  {
    id: 'artifact-workover-passports',
    name: 'Паспорта ремонтов',
    description: 'Комплекты документации по выполненным ремонтам.'
  },
  {
    id: 'artifact-production-plan',
    name: 'Оперативный план добычи',
    description: 'Сменные и недельные планы добычи.'
  },
  {
    id: 'artifact-deviation-dashboard',
    name: 'Дашборд отклонений',
    description: 'Витрина отклонений факта от плана по ключевым метрикам.'
  },
  {
    id: 'artifact-pipeline-schedule',
    name: 'График прокачки',
    description: 'Оптимизированные расписания прокачки и загрузки резервуаров.'
  },
  {
    id: 'artifact-energy-balance',
    name: 'Баланс энергопотребления',
    description: 'Свод по потреблению и генерации энергии.'
  },
  {
    id: 'artifact-energy-alerts',
    name: 'Алерты по энергоэффективности',
    description: 'Уведомления о превышении целевых энергопоказателей.'
  },
  {
    id: 'artifact-investment-passport',
    name: 'Инвестиционный паспорт',
    description: 'Презентация инвестиционного проекта и финансовые метрики.'
  },
  {
    id: 'artifact-portfolio-report',
    name: 'Отчёт по портфелю',
    description: 'Агрегированные показатели по инвестиционному портфелю.'
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
