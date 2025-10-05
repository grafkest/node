export type DomainNode = {
  id: string;
  name: string;
  description?: string;
  children?: DomainNode[];
};

export type ModuleStatus = 'in-dev' | 'production' | 'deprecated';

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
};

export const domainTree: DomainNode[] = [
  {
    id: 'upstream',
    name: 'Добыча нефти и газа',
    description: 'Технологии добычи, бурение, мониторинг скважин',
    children: [
      {
        id: 'well',
        name: 'Скважины',
        description: 'Карточки скважин, расчёт дебита, мониторинг состояний',
        children: [
          {
            id: 'well-monitoring',
            name: 'Мониторинг',
            description: 'Сбор телеметрии и построение витрин состояния'
          },
          {
            id: 'well-production',
            name: 'Прогноз добычи',
            description: 'Прогнозирование добычи и расчёт показателей эффективности'
          }
        ]
      },
      {
        id: 'drilling',
        name: 'Бурение',
        description: 'Планирование и контроль буровых работ'
      }
    ]
  },
  {
    id: 'economics',
    name: 'Экономика',
    description: 'Финансовые расчёты, бюджетирование и аналитика',
    children: [
      {
        id: 'economics-well',
        name: 'Экономика скважин',
        description: 'NPV, OPEX, CAPEX и окупаемость проектов'
      },
      {
        id: 'economics-portfolio',
        name: 'Портфель проектов',
        description: 'Приоритизация, сценарное моделирование'
      }
    ]
  },
  {
    id: 'logistics',
    name: 'Логистика и транспорт',
    description: 'Перемещение нефти и ресурсов',
    children: [
      {
        id: 'pipeline',
        name: 'Трубопроводы',
        description: 'Диспетчеризация, планирование прокачки'
      }
    ]
  }
];

export const modules: ModuleNode[] = [
  {
    id: 'module-npv',
    name: 'Расчёт NPV скважины',
    description:
      'Рассчитывает чистую приведённую стоимость по фактическим и прогнозным данным добычи.',
    domains: ['economics', 'economics-well', 'well-production'],
    team: 'Economic Insights',
    owner: 'Мария Лебедева',
    status: 'production',
    repository: 'https://git.example.com/economics/npv',
    api: 'REST /api/v1/well/npv',
    dependencies: ['module-production-forecast', 'module-cost-service'],
    produces: ['economics-report'],
    reuseScore: 0.8,
    metrics: {
      tests: 180,
      coverage: 92,
      latencyMs: 550
    }
  },
  {
    id: 'module-production-forecast',
    name: 'Прогноз добычи',
    description:
      'Модуль машинного обучения для прогнозирования дебита скважин по телеметрии.',
    domains: ['upstream', 'well', 'well-production'],
    team: 'Field Analytics',
    owner: 'Иван Терехов',
    status: 'production',
    repository: 'https://git.example.com/upstream/production-forecast',
    api: 'gRPC forecast.ForecastService',
    dependencies: ['module-well-telemetry'],
    produces: ['production-profiles'],
    reuseScore: 0.9,
    metrics: {
      tests: 240,
      coverage: 88,
      latencyMs: 780
    }
  },
  {
    id: 'module-well-telemetry',
    name: 'Телеметрия скважин',
    description: 'Потоковая обработка телеметрии и агрегация витрин.',
    domains: ['upstream', 'well', 'well-monitoring'],
    team: 'IoT Platform',
    owner: 'Виктория Осипова',
    status: 'production',
    repository: 'https://git.example.com/platform/well-telemetry',
    api: 'Kafka topics telemetry.*',
    dependencies: [],
    produces: ['telemetry-aggregates'],
    reuseScore: 0.7,
    metrics: {
      tests: 120,
      coverage: 76,
      latencyMs: 310
    }
  },
  {
    id: 'module-cost-service',
    name: 'Расчёт стоимости скважины',
    description: 'Подсчёт операционных и капитальных затрат с учётом сценариев.',
    domains: ['economics', 'economics-well'],
    team: 'Economic Insights',
    owner: 'Мария Лебедева',
    status: 'in-dev',
    repository: 'https://git.example.com/economics/cost-service',
    api: 'REST /api/v1/well/costs',
    dependencies: ['module-normative-directory'],
    produces: ['cost-breakdown'],
    reuseScore: 0.6,
    metrics: {
      tests: 90,
      coverage: 71,
      latencyMs: 890
    }
  },
  {
    id: 'module-normative-directory',
    name: 'Нормативный справочник',
    description: 'Хранит нормативы и тарифы, используется несколькими командами.',
    domains: ['economics', 'economics-portfolio'],
    team: 'Reference Data',
    owner: 'Алексей Махов',
    status: 'production',
    repository: 'https://git.example.com/common/normative',
    api: 'REST /api/v1/normative',
    dependencies: [],
    produces: ['normative-datasets'],
    reuseScore: 0.95,
    metrics: {
      tests: 200,
      coverage: 97,
      latencyMs: 420
    }
  },
  {
    id: 'module-legacy-cost',
    name: 'Старый расчёт себестоимости',
    description: 'Устаревший расчёт себестоимости без актуальных нормативов.',
    domains: ['economics', 'economics-well'],
    team: 'Legacy Ops',
    owner: 'Сергей Петров',
    status: 'deprecated',
    repository: 'https://git.example.com/legacy/cost',
    api: 'REST /api/v1/legacy/costs',
    dependencies: [],
    produces: ['legacy-costs'],
    reuseScore: 0.2,
    metrics: {
      tests: 45,
      coverage: 38,
      latencyMs: 1600
    }
  },
  {
    id: 'module-pipeline-monitoring',
    name: 'Мониторинг трубопроводов',
    description: 'Визуализация состояния трубопроводов и аварийных сигналов.',
    domains: ['logistics', 'pipeline'],
    team: 'Logistics Hub',
    owner: 'Андрей Романов',
    status: 'production',
    repository: 'https://git.example.com/logistics/pipeline-monitoring',
    api: 'REST /api/v1/pipeline/status',
    dependencies: ['module-asset-registry'],
    produces: ['pipeline-alerts'],
    reuseScore: 0.5,
    metrics: {
      tests: 150,
      coverage: 83,
      latencyMs: 460
    }
  },
  {
    id: 'module-asset-registry',
    name: 'Реестр активов',
    description: 'Справочник объектов инфраструктуры и оборудование.',
    domains: ['upstream', 'logistics'],
    team: 'Reference Data',
    owner: 'Алексей Махов',
    status: 'production',
    repository: 'https://git.example.com/common/assets',
    api: 'REST /api/v1/assets',
    dependencies: [],
    produces: ['asset-catalog'],
    reuseScore: 0.85,
    metrics: {
      tests: 160,
      coverage: 89,
      latencyMs: 390
    }
  }
];

export type GraphLink = {
  source: string;
  target: string;
  type: 'domain' | 'dependency' | 'produces';
};

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
    target: `artifact-${artifactId}`,
    type: 'produces'
  }));

  return [...domainLinks, ...dependencyLinks, ...produceLinks];
});

export type ArtifactNode = {
  id: string;
  name: string;
  description: string;
};

export const artifacts: ArtifactNode[] = [
  {
    id: 'artifact-economics-report',
    name: 'Экономический отчёт',
    description: 'Отчётность по ключевым экономическим показателям.'
  },
  {
    id: 'artifact-production-profiles',
    name: 'Профили добычи',
    description: 'Набор прогнозных кривых добычи для сценарного анализа.'
  },
  {
    id: 'artifact-telemetry-aggregates',
    name: 'Агрегаты телеметрии',
    description: 'Сводные показатели телеметрии для витрин и отчётности.'
  },
  {
    id: 'artifact-cost-breakdown',
    name: 'Структура затрат',
    description: 'Расшифровка затрат по статьям.'
  },
  {
    id: 'artifact-normative-datasets',
    name: 'Нормативные наборы',
    description: 'Единая точка доступа к нормативной информации.'
  },
  {
    id: 'artifact-legacy-costs',
    name: 'Устаревшие расчёты затрат',
    description: 'Набор результатов старой методики расчётов.'
  },
  {
    id: 'artifact-pipeline-alerts',
    name: 'Оповещения трубопроводов',
    description: 'События и предупреждения по состоянию трубопроводов.'
  },
  {
    id: 'artifact-asset-catalog',
    name: 'Каталог активов',
    description: 'Карточки оборудования и объектов инфраструктуры.'
  }
];
