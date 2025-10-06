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
          },
          {
            id: 'well-optimization',
            name: 'Оптимизация работы',
            description: 'Оптимизация режимов работы скважин, подбор мероприятий'
          }
        ]
      },
      {
        id: 'drilling',
        name: 'Бурение',
        description: 'Планирование и контроль буровых работ'
      },
      {
        id: 'production-operations',
        name: 'Операции добычи',
        description: 'Оперативное управление добычей и поддерживающими сервисами'
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
      },
      {
        id: 'economics-reporting',
        name: 'Финансовая отчётность',
        description: 'Регламентированная отчётность и раскрытие данных'
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
      },
      {
        id: 'supply-chain',
        name: 'Снабжение',
        description: 'Планирование снабжения и управление складами'
      }
    ]
  },
  {
    id: 'hse',
    name: 'Промышленная безопасность',
    description: 'Охрана труда, экологический контроль и управление инцидентами',
    children: [
      {
        id: 'hse-monitoring',
        name: 'Мониторинг HSE',
        description: 'Мониторинг показателей безопасности и охраны окружающей среды'
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
  },
  {
    id: 'module-well-optimizer',
    name: 'Оптимизация режимов скважины',
    description:
      'Определяет оптимальные настройки работы скважины на основе прогноза добычи и экономических метрик.',
    domains: ['upstream', 'well', 'well-optimization', 'economics-well'],
    team: 'Field Analytics',
    owner: 'Иван Терехов',
    status: 'in-dev',
    repository: 'https://git.example.com/upstream/well-optimizer',
    api: 'REST /api/v1/well/optimization',
    dependencies: ['module-production-forecast', 'module-cost-service'],
    produces: ['optimization-recommendations'],
    reuseScore: 0.75,
    metrics: {
      tests: 130,
      coverage: 81,
      latencyMs: 640
    }
  },
  {
    id: 'module-digital-twin',
    name: 'Цифровой двойник промысла',
    description:
      'Интегрированная модель промысла, объединяющая телеметрию, прогнозы и логистику для ситуационного анализа.',
    domains: ['upstream', 'production-operations', 'well-monitoring', 'pipeline'],
    team: 'Operations Intelligence',
    owner: 'Наталья Коваль',
    status: 'in-dev',
    repository: 'https://git.example.com/operations/digital-twin',
    api: 'GraphQL /graphql',
    dependencies: ['module-well-telemetry', 'module-production-forecast', 'module-pipeline-monitoring'],
    produces: ['operations-dashboard'],
    reuseScore: 0.65,
    metrics: {
      tests: 110,
      coverage: 74,
      latencyMs: 950
    }
  },
  {
    id: 'module-portfolio-optimizer',
    name: 'Оптимизация портфеля проектов',
    description: 'Строит сценарии инвестиций, рассчитывает NPV и IRR по портфелю проектов.',
    domains: ['economics', 'economics-portfolio', 'economics-reporting'],
    team: 'Economic Insights',
    owner: 'Мария Лебедева',
    status: 'production',
    repository: 'https://git.example.com/economics/portfolio-optimizer',
    api: 'REST /api/v1/portfolio/optimize',
    dependencies: ['module-normative-directory'],
    produces: ['portfolio-scenarios'],
    reuseScore: 0.82,
    metrics: {
      tests: 210,
      coverage: 90,
      latencyMs: 870
    }
  },
  {
    id: 'module-supply-planner',
    name: 'Планировщик снабжения',
    description: 'Оптимизация графиков поставок и складских запасов для буровых площадок.',
    domains: ['logistics', 'supply-chain', 'drilling'],
    team: 'Logistics Hub',
    owner: 'Андрей Романов',
    status: 'production',
    repository: 'https://git.example.com/logistics/supply-planner',
    api: 'REST /api/v1/supply/plan',
    dependencies: ['module-asset-registry'],
    produces: ['supply-orders'],
    reuseScore: 0.68,
    metrics: {
      tests: 175,
      coverage: 86,
      latencyMs: 520
    }
  },
  {
    id: 'module-hse-monitoring',
    name: 'HSE мониторинг',
    description: 'Сбор и анализ показателей безопасности, управление инцидентами.',
    domains: ['hse', 'hse-monitoring', 'upstream'],
    team: 'Sustainability Office',
    owner: 'Ольга Фомина',
    status: 'production',
    repository: 'https://git.example.com/hse/monitoring',
    api: 'REST /api/v1/hse/incidents',
    dependencies: ['module-well-telemetry', 'module-pipeline-monitoring'],
    produces: ['hse-alerts'],
    reuseScore: 0.72,
    metrics: {
      tests: 190,
      coverage: 87,
      latencyMs: 610
    }
  },
  {
    id: 'module-reporting-hub',
    name: 'Хаб финансовой отчётности',
    description:
      'Консолидирует финансовые показатели и формирует регламентированную отчётность для акционеров.',
    domains: ['economics', 'economics-reporting'],
    team: 'Finance Core',
    owner: 'Дмитрий Орлов',
    status: 'production',
    repository: 'https://git.example.com/finance/reporting-hub',
    api: 'REST /api/v1/reporting',
    dependencies: ['module-normative-directory', 'module-portfolio-optimizer'],
    produces: ['financial-reports'],
    reuseScore: 0.77,
    metrics: {
      tests: 220,
      coverage: 93,
      latencyMs: 680
    }
  },
  {
    id: 'module-maintenance-planner',
    name: 'Планировщик ремонтов',
    description: 'Формирует расписание ППР на основе телеметрии и отчётов HSE.',
    domains: ['upstream', 'production-operations', 'hse-monitoring'],
    team: 'Operations Intelligence',
    owner: 'Наталья Коваль',
    status: 'in-dev',
    repository: 'https://git.example.com/operations/maintenance-planner',
    api: 'REST /api/v1/maintenance/plan',
    dependencies: ['module-hse-monitoring', 'module-well-telemetry'],
    produces: ['maintenance-plans'],
    reuseScore: 0.61,
    metrics: {
      tests: 115,
      coverage: 78,
      latencyMs: 720
    }
  },
  {
    id: 'module-legacy-forecast',
    name: 'Старый прогноз добычи',
    description: 'Историческая система прогнозирования без поддержки современных моделей.',
    domains: ['upstream', 'well-production'],
    team: 'Legacy Ops',
    owner: 'Сергей Петров',
    status: 'deprecated',
    repository: 'https://git.example.com/legacy/forecast',
    api: 'REST /api/v1/legacy/forecast',
    dependencies: [],
    produces: ['legacy-production-profiles'],
    reuseScore: 0.15,
    metrics: {
      tests: 60,
      coverage: 42,
      latencyMs: 1400
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
  },
  {
    id: 'artifact-optimization-recommendations',
    name: 'Рекомендации по оптимизации',
    description: 'Набор рекомендаций по оптимальным режимам работы скважин.'
  },
  {
    id: 'artifact-operations-dashboard',
    name: 'Ситуационный дашборд',
    description: 'Интерактивная панель ключевых показателей промысла.'
  },
  {
    id: 'artifact-portfolio-scenarios',
    name: 'Сценарии портфеля',
    description: 'Набор сценариев инвестиционного портфеля компании.'
  },
  {
    id: 'artifact-supply-orders',
    name: 'Заявки на снабжение',
    description: 'План поставок и обеспеченность материалами.'
  },
  {
    id: 'artifact-hse-alerts',
    name: 'Оповещения HSE',
    description: 'Уведомления о нарушениях и инцидентах безопасности.'
  },
  {
    id: 'artifact-financial-reports',
    name: 'Финансовые отчёты',
    description: 'Набор регламентированных отчётов по компании.'
  },
  {
    id: 'artifact-maintenance-plans',
    name: 'Планы ремонтов',
    description: 'Согласованное расписание ППР с указанием ресурсов.'
  },
  {
    id: 'artifact-legacy-production-profiles',
    name: 'Устаревшие профили добычи',
    description: 'Исторические прогнозы добычи из старой системы.'
  }
];
