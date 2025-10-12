export type DomainNode = {
  id: string;
  name: string;
  description?: string;
  children?: DomainNode[];
  /**
   * Корневые домены используются как группирующие папки и не попадают в граф или статистику.
   */
  isCatalogRoot?: boolean;
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

export type RidOwner = {
  company: string;
  division: string;
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
  baselineUsers: number;
};

export type ModuleNode = {
  id: string;
  name: string;
  description: string;
  domains: string[];
  team: string;
  productName: string;
  projectTeam: TeamMember[];
  technologyStack: string[];
  localization: string;
  ridOwner: RidOwner;
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
    id: 'infrastructure-planning',
    name: 'Инфраструктурное планирование',
    description:
      'Концептуальное проектирование и реинжиниринг наземной инфраструктуры месторождений',
    children: [
      {
        id: 'data-preparation',
        name: 'Подготовка исходных данных',
        description:
          'Сбор и нормализация исходных данных для моделирования схем обустройства'
      },
      {
        id: 'layout-optimization',
        name: 'Оптимизация размещения',
        description:
          'Автоматическое размещение объектов с учётом технологических и топографических ограничений'
      },
      {
        id: 'economic-evaluation',
        name: 'Экономическая оценка',
        description:
          'Формирование экономических показателей и подготовка досье по варианту инфраструктуры'
      }
    ]
  },
  {
    id: 'digital-operations',
    name: 'Цифровое управление добычей',
    description: 'Мониторинг, оптимизация и дистанционное управление объектами добычи',
    children: [
      {
        id: 'real-time-monitoring',
        name: 'Онлайн-мониторинг',
        description: 'Сбор и визуализация телеметрии наземной инфраструктуры в реальном времени'
      },
      {
        id: 'production-optimization',
        name: 'Оптимизация режимов',
        description: 'Рекомендации по повышению эффективности работы фонда'
      },
      {
        id: 'remote-control',
        name: 'Дистанционное управление',
        description: 'Удалённое управление производственными узлами и интеграция с АСУТП'
      }
    ]
  },
  {
    id: 'workover-operations',
    name: 'Внутрискважинные операции',
    description: 'Планирование, контроль и аналитика работ по ремонту скважин',
    children: [
      {
        id: 'workover-planning',
        name: 'Планирование ГТМ и ТКРС',
        description: 'Формирование и согласование программ работ по скважинам'
      },
      {
        id: 'field-execution',
        name: 'Исполнение в поле',
        description: 'Контроль исполнения ремонтов и взаимодействие с подрядчиками'
      },
      {
        id: 'quality-analytics',
        name: 'Аналитика качества работ',
        description: 'Оценка эффективности ремонтов и выявление узких мест процессов'
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
    id: 'module-infraplan-datahub',
    name: 'INFRAPLAN DataHub',
    description:
      'Консолидирует инженерные и производственные данные, нормализует их и подготавливает к инфраструктурному моделированию.',
    domains: ['data-preparation'],
    team: 'INFRAPLAN Data Services',
    productName: 'Nedra.Production INFRAPLAN',
    projectTeam: [
      { id: 'infraplan-owner', fullName: 'Алексей Сорокин', role: 'Владелец продукта' },
      { id: 'infraplan-rd', fullName: 'Виктория Бережная', role: 'Эксперт R&D' },
      { id: 'infraplan-analyst', fullName: 'Мария Гусева', role: 'Аналитик' },
      { id: 'infraplan-backend', fullName: 'Сергей Трофимов', role: 'Backend' },
      { id: 'infraplan-frontend', fullName: 'Юлия Рогова', role: 'Frontend' },
      { id: 'infraplan-architect', fullName: 'Дмитрий Валов', role: 'Архитектор' },
      { id: 'infraplan-tester', fullName: 'Лилия Нуриева', role: 'Тестировщик' }
    ],
    technologyStack: ['TypeScript', 'NestJS', 'PostgreSQL', 'Apache Airflow'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: {
      company: 'АО «Nedra Digital»',
      division: 'Дирекция концептуального проектирования'
    },
    userStats: { companies: 14, licenses: 620 },
    status: 'production',
    repository: 'https://git.nedra.digital/infraplan/data-hub',
    api: 'REST /api/v2/infraplan/source-packs',
    specificationUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=80101',
    apiContractsUrl: 'https://kb.nedra.digital/display/IP/API+Infraplan+DataHub',
    techDesignUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=80212',
    architectureDiagramUrl: 'https://design.nedra.digital/diagrams/infraplan-datahub',
    licenseServerIntegrated: true,
    libraries: [
      { name: '@nestjs/core', version: '10.3.2' },
      { name: 'typeorm', version: '0.3.20' },
      { name: 'airflow-client', version: '2.9.0' }
    ],
    clientType: 'web',
    deploymentTool: 'kubernetes',
    dependencies: [],
    produces: ['artifact-infraplan-source-pack'],
    reuseScore: 0.81,
    metrics: {
      tests: 194,
      coverage: 92,
      automationRate: 89
    },
    dataIn: [
      {
        id: 'raw-geodata',
        label: 'Геодезические данные месторождений'
      },
      {
        id: 'production-limits',
        label: 'Технологические ограничения добычи'
      }
    ],
    dataOut: [
      {
        id: 'normalized-inputs',
        label: 'Стандартизированный пакет исходных данных',
        consumerIds: [
          'module-infraplan-layout',
          'module-infraplan-economics',
          'module-dtwin-optimizer'
        ]
      }
    ],
    formula: 'normalized = preprocess(raw) ⊕ constraints',
    nonFunctional: {
      responseTimeMs: 350,
      throughputRps: 160,
      resourceConsumption: '4 vCPU / 16 GB RAM',
      baselineUsers: 95
    }
  },
  {
    id: 'module-infraplan-layout',
    name: 'INFRAPLAN Layout Engine',
    description:
      'Автоматизирует подбор вариантов размещения объектов обустройства с учётом рельефа, технологических и экологических ограничений.',
    domains: ['layout-optimization'],
    team: 'INFRAPLAN Modeling',
    productName: 'Nedra.Production INFRAPLAN',
    projectTeam: [
      { id: 'layout-owner', fullName: 'Надежда Малахова', role: 'Владелец продукта' },
      { id: 'layout-rd', fullName: 'Павел Колосов', role: 'Эксперт R&D' },
      { id: 'layout-analyst', fullName: 'Олеся Харитонова', role: 'Аналитик' },
      { id: 'layout-backend', fullName: 'Игорь Фирсов', role: 'Backend' },
      { id: 'layout-frontend', fullName: 'Григорий Ким', role: 'Frontend' },
      { id: 'layout-architect', fullName: 'Ирина Цой', role: 'Архитектор' },
      { id: 'layout-tester', fullName: 'Полина Крючкова', role: 'Тестировщик' }
    ],
    technologyStack: ['Python', 'FastAPI', 'PostGIS', 'OptaPlanner'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: {
      company: 'АО «Nedra Digital»',
      division: 'Дирекция концептуального проектирования'
    },
    userStats: { companies: 9, licenses: 380 },
    status: 'production',
    repository: 'https://git.nedra.digital/infraplan/layout-engine',
    api: 'REST /api/v1/infraplan/layouts',
    specificationUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=81145',
    apiContractsUrl: 'https://kb.nedra.digital/display/IP/Layout+API',
    techDesignUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=81192',
    architectureDiagramUrl: 'https://design.nedra.digital/diagrams/infraplan-layout',
    licenseServerIntegrated: true,
    libraries: [
      { name: 'fastapi', version: '0.111.0' },
      { name: 'geopandas', version: '0.14.3' },
      { name: 'optapy', version: '9.43.0' }
    ],
    clientType: 'web',
    deploymentTool: 'kubernetes',
    dependencies: ['module-infraplan-datahub'],
    produces: ['artifact-infraplan-layout'],
    reuseScore: 0.77,
    metrics: {
      tests: 156,
      coverage: 88,
      automationRate: 84
    },
    dataIn: [
      {
        id: 'normalized-inputs-ref',
        label: 'Стандартизированный пакет исходных данных',
        sourceId: 'artifact-infraplan-source-pack'
      },
      {
        id: 'topology-constraints',
        label: 'Ограничения по рельефу и охранным зонам'
      }
    ],
    dataOut: [
      {
        id: 'layout-scenarios',
        label: 'Сценарии размещения объектов',
        consumerIds: ['module-infraplan-economics']
      }
    ],
    formula: 'total_cost = Σ(distance_i * cost_i) + Σ(site_j * capex_j)',
    nonFunctional: {
      responseTimeMs: 540,
      throughputRps: 95,
      resourceConsumption: '8 vCPU / 32 GB RAM',
      baselineUsers: 60
    }
  },
  {
    id: 'module-infraplan-economics',
    name: 'INFRAPLAN Economics',
    description:
      'Расчитывает экономическую эффективность вариантов обустройства и формирует инвестиционные досье.',
    domains: ['economic-evaluation'],
    team: 'INFRAPLAN Economics',
    productName: 'Nedra.Production INFRAPLAN',
    projectTeam: [
      { id: 'econ-owner', fullName: 'Светлана Дорофеева', role: 'Владелец продукта' },
      { id: 'econ-rd', fullName: 'Антон Власов', role: 'Эксперт R&D' },
      { id: 'econ-analyst', fullName: 'Татьяна Бортникова', role: 'Аналитик' },
      { id: 'econ-backend', fullName: 'Леонид Архипов', role: 'Backend' },
      { id: 'econ-frontend', fullName: 'Андрей Усов', role: 'Frontend' },
      { id: 'econ-architect', fullName: 'Валерий Макаров', role: 'Архитектор' },
      { id: 'econ-tester', fullName: 'Елизавета Федорова', role: 'Тестировщик' }
    ],
    technologyStack: ['C#', '.NET 8', 'MS SQL', 'Power BI'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: {
      company: 'АО «Nedra Digital»',
      division: 'Дирекция концептуального проектирования'
    },
    userStats: { companies: 11, licenses: 450 },
    status: 'production',
    repository: 'https://git.nedra.digital/infraplan/economics',
    api: 'REST /api/v1/infraplan/economics',
    specificationUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=82133',
    apiContractsUrl: 'https://kb.nedra.digital/display/IP/Economics+API',
    techDesignUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=82178',
    architectureDiagramUrl: 'https://design.nedra.digital/diagrams/infraplan-economics',
    licenseServerIntegrated: true,
    libraries: [
      { name: 'AutoMapper', version: '13.0.1' },
      { name: 'MediatR', version: '12.1.1' },
      { name: 'ClosedXML', version: '0.102.4' }
    ],
    clientType: 'desktop',
    deploymentTool: 'kubernetes',
    dependencies: ['module-infraplan-datahub', 'module-infraplan-layout'],
    produces: ['artifact-infraplan-economic-report'],
    reuseScore: 0.84,
    metrics: {
      tests: 208,
      coverage: 93,
      automationRate: 88
    },
    dataIn: [
      {
        id: 'source-pack-input',
        label: 'Стандартизированный пакет исходных данных',
        sourceId: 'artifact-infraplan-source-pack'
      },
      {
        id: 'layout-input',
        label: 'Сценарии размещения объектов',
        sourceId: 'artifact-infraplan-layout'
      }
    ],
    dataOut: [
      {
        id: 'investment-scenarios',
        label: 'Инвестиционные сценарии по вариантам',
        consumerIds: []
      }
    ],
    formula: 'NPV_variant = Σ((cash_flow_t - opex_t) / (1 + WACC)^t) - capex_variant',
    nonFunctional: {
      responseTimeMs: 780,
      throughputRps: 55,
      resourceConsumption: '10 vCPU / 40 GB RAM',
      baselineUsers: 45
    }
  },
  {
    id: 'module-dtwin-monitoring',
    name: 'DIGITAL TWIN Monitoring',
    description:
      'Собирает телеметрию наземной инфраструктуры в реальном времени и формирует интегрированное хранилище цифрового двойника.',
    domains: ['real-time-monitoring'],
    team: 'Digital Twin Telemetry',
    productName: 'Nedra.Production DIGITAL TWIN',
    projectTeam: [
      { id: 'dtwin-mon-owner', fullName: 'Егор Панин', role: 'Владелец продукта' },
      { id: 'dtwin-mon-rd', fullName: 'Раиса Чистякова', role: 'Эксперт R&D' },
      { id: 'dtwin-mon-analyst', fullName: 'Илья Константинов', role: 'Аналитик' },
      { id: 'dtwin-mon-backend', fullName: 'Даниил Аргунов', role: 'Backend' },
      { id: 'dtwin-mon-frontend', fullName: 'Екатерина Руднева', role: 'Frontend' },
      { id: 'dtwin-mon-architect', fullName: 'Глеб Лапшин', role: 'Архитектор' },
      { id: 'dtwin-mon-tester', fullName: 'Алина Токарева', role: 'Тестировщик' }
    ],
    technologyStack: ['Go', 'gRPC', 'Apache Kafka', 'ClickHouse'],
    localization: 'Мультиязычная (ru, en, ar)',
    ridOwner: {
      company: 'АО «Nedra Digital»',
      division: 'Операционный центр цифровых двойников'
    },
    userStats: { companies: 12, licenses: 2100 },
    status: 'production',
    repository: 'https://git.nedra.digital/dtwin/monitoring',
    api: 'gRPC dtwin.Telemetry/Stream',
    specificationUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=83114',
    apiContractsUrl: 'https://kb.nedra.digital/display/DT/Telemetry+API',
    techDesignUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=83180',
    architectureDiagramUrl: 'https://design.nedra.digital/diagrams/dtwin-monitoring',
    licenseServerIntegrated: true,
    libraries: [
      { name: 'segmentio/kafka-go', version: '0.4.46' },
      { name: 'prometheus/client_golang', version: '1.19.0' },
      { name: 'clickhouse-go', version: '2.0.5' }
    ],
    clientType: 'web',
    deploymentTool: 'kubernetes',
    dependencies: [],
    produces: ['artifact-dtwin-telemetry-cube'],
    reuseScore: 0.9,
    metrics: {
      tests: 312,
      coverage: 95,
      automationRate: 92
    },
    dataIn: [
      {
        id: 'scada-stream',
        label: 'Поток телеметрии АСУ ТП'
      },
      {
        id: 'field-sensor-payload',
        label: 'Данные датчиков и подключённых устройств'
      },
      {
        id: 'equipment-passports',
        label: 'Паспорта оборудования и технологические схемы'
      }
    ],
    dataOut: [
      {
        id: 'telemetry-cube',
        label: 'Интегрированный куб телеметрии',
        consumerIds: ['module-dtwin-optimizer']
      }
    ],
    formula: 'metric = smooth(raw_signal, window=5)',
    nonFunctional: {
      responseTimeMs: 180,
      throughputRps: 520,
      resourceConsumption: '12 vCPU / 48 GB RAM',
      baselineUsers: 320
    }
  },
  {
    id: 'module-dtwin-optimizer',
    name: 'DIGITAL TWIN Optimizer',
    description:
      'Генерирует рекомендации по управлению режимами объектов и прогнозирует эффект от внедрения цифрового двойника.',
    domains: ['production-optimization'],
    team: 'Digital Twin Orchestration',
    productName: 'Nedra.Production DIGITAL TWIN',
    projectTeam: [
      { id: 'dtwin-opt-owner', fullName: 'Тимур Алиев', role: 'Владелец продукта' },
      { id: 'dtwin-opt-rd', fullName: 'Елизар Копылов', role: 'Эксперт R&D' },
      { id: 'dtwin-opt-analyst', fullName: 'Жанна Алимбекова', role: 'Аналитик' },
      { id: 'dtwin-opt-backend', fullName: 'Пётр Швецов', role: 'Backend' },
      { id: 'dtwin-opt-frontend', fullName: 'Анастасия Кручинина', role: 'Frontend' },
      { id: 'dtwin-opt-architect', fullName: 'Кирилл Рыбаков', role: 'Архитектор' },
      { id: 'dtwin-opt-tester', fullName: 'Софья Герасимова', role: 'Тестировщик' }
    ],
    technologyStack: ['Python', 'PyTorch', 'FastAPI', 'Redis'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: {
      company: 'АО «Nedra Digital»',
      division: 'Операционный центр цифровых двойников'
    },
    userStats: { companies: 10, licenses: 1500 },
    status: 'production',
    repository: 'https://git.nedra.digital/dtwin/optimizer',
    api: 'REST /api/v1/dtwin/optimization-orders',
    specificationUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=84102',
    apiContractsUrl: 'https://kb.nedra.digital/display/DT/Optimizer+API',
    techDesignUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=84164',
    architectureDiagramUrl: 'https://design.nedra.digital/diagrams/dtwin-optimizer',
    licenseServerIntegrated: true,
    libraries: [
      { name: 'fastapi', version: '0.111.0' },
      { name: 'torch', version: '2.2.2' },
      { name: 'redis', version: '5.0.1' }
    ],
    clientType: 'web',
    deploymentTool: 'kubernetes',
    dependencies: ['module-dtwin-monitoring'],
    produces: ['artifact-dtwin-optimization-orders'],
    reuseScore: 0.88,
    metrics: {
      tests: 248,
      coverage: 91,
      automationRate: 90
    },
    dataIn: [
      {
        id: 'telemetry-cube-input',
        label: 'Интегрированный куб телеметрии',
        sourceId: 'artifact-dtwin-telemetry-cube'
      },
      {
        id: 'infraplan-context',
        label: 'Инфраструктурный контекст из INFRAPLAN',
        sourceId: 'artifact-infraplan-source-pack'
      },
      {
        id: 'operational-constraints',
        label: 'Ограничения по режимам и безопасные диапазоны'
      }
    ],
    dataOut: [
      {
        id: 'optimization-orders',
        label: 'Команды оптимизации режимов',
        consumerIds: ['module-dtwin-remote-control']
      }
    ],
    formula: 'optimal_mode = argmax(strategy_score)',
    nonFunctional: {
      responseTimeMs: 260,
      throughputRps: 210,
      resourceConsumption: '16 vCPU / 64 GB RAM (GPU)',
      baselineUsers: 240
    }
  },
  {
    id: 'module-dtwin-remote-control',
    name: 'DIGITAL TWIN Remote Ops',
    description:
      'Обеспечивает дистанционное управление производственными узлами и обратную связь по выполнению команд.',
    domains: ['remote-control'],
    team: 'Digital Twin Remote Ops',
    productName: 'Nedra.Production DIGITAL TWIN',
    projectTeam: [
      { id: 'dtwin-remote-owner', fullName: 'Оксана Кривцова', role: 'Владелец продукта' },
      { id: 'dtwin-remote-rd', fullName: 'Игорь Шамов', role: 'Эксперт R&D' },
      { id: 'dtwin-remote-analyst', fullName: 'Руслан Сабиров', role: 'Аналитик' },
      { id: 'dtwin-remote-backend', fullName: 'Тарас Мельник', role: 'Backend' },
      { id: 'dtwin-remote-frontend', fullName: 'Елена Сучкова', role: 'Frontend' },
      { id: 'dtwin-remote-architect', fullName: 'Геннадий Борисов', role: 'Архитектор' },
      { id: 'dtwin-remote-tester', fullName: 'Зульфия Хасанова', role: 'Тестировщик' }
    ],
    technologyStack: ['TypeScript', 'Node.js', 'gRPC', 'WebSocket'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: {
      company: 'АО «Nedra Digital»',
      division: 'Операционный центр цифровых двойников'
    },
    userStats: { companies: 5, licenses: 420 },
    status: 'in-dev',
    repository: 'https://git.nedra.digital/dtwin/remote-ops',
    api: 'gRPC dtwin.RemoteControl/Dispatch',
    specificationUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=85133',
    apiContractsUrl: 'https://kb.nedra.digital/display/DT/Remote+Ops+API',
    techDesignUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=85188',
    architectureDiagramUrl: 'https://design.nedra.digital/diagrams/dtwin-remote-ops',
    licenseServerIntegrated: false,
    libraries: [
      { name: '@grpc/grpc-js', version: '1.10.4' },
      { name: 'ws', version: '8.17.1' },
      { name: '@nestjs/microservices', version: '10.3.2' }
    ],
    clientType: 'web',
    deploymentTool: 'docker',
    dependencies: ['module-dtwin-optimizer'],
    produces: ['artifact-dtwin-remote-commands'],
    reuseScore: 0.64,
    metrics: {
      tests: 132,
      coverage: 85,
      automationRate: 78
    },
    dataIn: [
      {
        id: 'optimization-orders-input',
        label: 'Команды оптимизации режимов',
        sourceId: 'artifact-dtwin-optimization-orders'
      },
      {
        id: 'scada-feedback',
        label: 'Обратная связь от исполнительных устройств'
      }
    ],
    dataOut: [
      {
        id: 'remote-command-stream',
        label: 'Поток дистанционных команд',
        consumerIds: []
      }
    ],
    formula: 'command = translate(order, device_profile)',
    nonFunctional: {
      responseTimeMs: 140,
      throughputRps: 95,
      resourceConsumption: '6 vCPU / 18 GB RAM',
      baselineUsers: 120
    }
  },
  {
    id: 'module-wwo-planner',
    name: 'WWO Planner',
    description:
      'Формирует и согласует программы ремонтно-изоляционных и капитальных работ по скважинам.',
    domains: ['workover-planning'],
    team: 'WWO Planning Office',
    productName: 'Nedra.Production WWO',
    projectTeam: [
      { id: 'wwo-plan-owner', fullName: 'Галина Кручина', role: 'Владелец продукта' },
      { id: 'wwo-plan-rd', fullName: 'Владимир Романов', role: 'Эксперт R&D' },
      { id: 'wwo-plan-analyst', fullName: 'Сергей Ежов', role: 'Аналитик' },
      { id: 'wwo-plan-backend', fullName: 'Ирина Сафонова', role: 'Backend' },
      { id: 'wwo-plan-frontend', fullName: 'Степан Юрин', role: 'Frontend' },
      { id: 'wwo-plan-architect', fullName: 'Рита Лапина', role: 'Архитектор' },
      { id: 'wwo-plan-tester', fullName: 'Дарья Мартынова', role: 'Тестировщик' }
    ],
    technologyStack: ['Java', 'Spring Boot', 'Camunda', 'Oracle DB'],
    localization: 'Только русский язык',
    ridOwner: {
      company: 'АО «Nedra Digital»',
      division: 'Центр внутрискважинных операций'
    },
    userStats: { companies: 8, licenses: 730 },
    status: 'production',
    repository: 'https://git.nedra.digital/wwo/planner',
    api: 'REST /api/v1/wwo/plans',
    specificationUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=86172',
    apiContractsUrl: 'https://kb.nedra.digital/display/WWO/Planner+API',
    techDesignUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=86218',
    architectureDiagramUrl: 'https://design.nedra.digital/diagrams/wwo-planner',
    licenseServerIntegrated: true,
    libraries: [
      { name: 'spring-boot-starter-web', version: '3.3.2' },
      { name: 'camunda-bpm-spring-boot-starter', version: '7.20.0' },
      { name: 'oracle-ojdbc8', version: '23.2.0.0' }
    ],
    clientType: 'desktop',
    deploymentTool: 'kubernetes',
    dependencies: [],
    produces: ['artifact-wwo-plan'],
    reuseScore: 0.79,
    metrics: {
      tests: 188,
      coverage: 86,
      automationRate: 82
    },
    dataIn: [
      {
        id: 'operations-history',
        label: 'История внутрискважинных работ',
        sourceId: 'artifact-wwo-operations-log'
      },
      {
        id: 'resource-register',
        label: 'Каталог бригад и оборудования'
      }
    ],
    dataOut: [
      {
        id: 'approved-workover-plan',
        label: 'Утверждённые программы работ по скважинам',
        consumerIds: ['module-wwo-execution', 'module-wwo-analytics']
      }
    ],
    formula: 'schedule = optimize(tasks, crews, constraints)',
    nonFunctional: {
      responseTimeMs: 620,
      throughputRps: 75,
      resourceConsumption: '8 vCPU / 28 GB RAM',
      baselineUsers: 210
    }
  },
  {
    id: 'module-wwo-execution',
    name: 'WWO Field Execution',
    description:
      'Контролирует выполнение ремонтных и изоляционных работ, собирает фактические параметры и фотоотчёты с площадки.',
    domains: ['field-execution'],
    team: 'WWO Field Operations',
    productName: 'Nedra.Production WWO',
    projectTeam: [
      { id: 'wwo-exec-owner', fullName: 'Фарид Мансуров', role: 'Владелец продукта' },
      { id: 'wwo-exec-rd', fullName: 'Маргарита Курганская', role: 'Эксперт R&D' },
      { id: 'wwo-exec-analyst', fullName: 'Даниил Сомов', role: 'Аналитик' },
      { id: 'wwo-exec-backend', fullName: 'Руслан Абдулов', role: 'Backend' },
      { id: 'wwo-exec-frontend', fullName: 'Алёна Лещёва', role: 'Frontend' },
      { id: 'wwo-exec-architect', fullName: 'Павел Саврасов', role: 'Архитектор' },
      { id: 'wwo-exec-tester', fullName: 'Инга Хамзатова', role: 'Тестировщик' }
    ],
    technologyStack: ['Kotlin', 'Android', 'RealmDB', 'MQTT'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: {
      company: 'АО «Nedra Digital»',
      division: 'Центр внутрискважинных операций'
    },
    userStats: { companies: 6, licenses: 1250 },
    status: 'production',
    repository: 'https://git.nedra.digital/wwo/execution',
    api: 'REST /api/v1/wwo/operations-log',
    specificationUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=87155',
    apiContractsUrl: 'https://kb.nedra.digital/display/WWO/Execution+API',
    techDesignUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=87192',
    architectureDiagramUrl: 'https://design.nedra.digital/diagrams/wwo-execution',
    licenseServerIntegrated: true,
    libraries: [
      { name: 'ktor', version: '2.3.12' },
      { name: 'realm-android', version: '10.16.1' },
      { name: 'eclipse-paho-mqtt', version: '1.2.5' }
    ],
    clientType: 'desktop',
    deploymentTool: 'docker',
    dependencies: ['module-wwo-planner'],
    produces: ['artifact-wwo-operations-log'],
    reuseScore: 0.71,
    metrics: {
      tests: 142,
      coverage: 83,
      automationRate: 79
    },
    dataIn: [
      {
        id: 'workover-plan-input',
        label: 'Утверждённые программы работ',
        sourceId: 'artifact-wwo-plan'
      },
      {
        id: 'field-directives',
        label: 'Локальные распоряжения и регламенты'
      }
    ],
    dataOut: [
      {
        id: 'operations-log',
        label: 'Фактический журнал операций',
        consumerIds: ['module-wwo-analytics']
      }
    ],
    formula: 'compliance_rate = completed_operations / planned_operations',
    nonFunctional: {
      responseTimeMs: 210,
      throughputRps: 120,
      resourceConsumption: '4 vCPU / 12 GB RAM',
      baselineUsers: 480
    }
  },
  {
    id: 'module-wwo-analytics',
    name: 'WWO Analytics',
    description:
      'Анализирует эффективность ремонтов, выявляет отклонения и поддерживает управленческие решения по фонду скважин.',
    domains: ['quality-analytics'],
    team: 'WWO Analytics Lab',
    productName: 'Nedra.Production WWO',
    projectTeam: [
      { id: 'wwo-analytics-owner', fullName: 'Ольга Вершинина', role: 'Владелец продукта' },
      { id: 'wwo-analytics-rd', fullName: 'Денис Лаптев', role: 'Эксперт R&D' },
      { id: 'wwo-analytics-analyst', fullName: 'Жанна Егорова', role: 'Аналитик' },
      { id: 'wwo-analytics-backend', fullName: 'Никита Яшин', role: 'Backend' },
      { id: 'wwo-analytics-frontend', fullName: 'Инна Миронова', role: 'Frontend' },
      { id: 'wwo-analytics-architect', fullName: 'Марк Федоров', role: 'Архитектор' },
      { id: 'wwo-analytics-tester', fullName: 'Яна Андреева', role: 'Тестировщик' }
    ],
    technologyStack: ['TypeScript', 'React', 'Apache Superset', 'GraphQL'],
    localization: 'Мультиязычная (ru, en)',
    ridOwner: {
      company: 'АО «Nedra Digital»',
      division: 'Центр внутрискважинных операций'
    },
    userStats: { companies: 7, licenses: 980 },
    status: 'in-dev',
    repository: 'https://git.nedra.digital/wwo/analytics',
    api: 'GraphQL /wwo/analytics',
    specificationUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=88104',
    apiContractsUrl: 'https://kb.nedra.digital/display/WWO/Analytics+API',
    techDesignUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=88156',
    architectureDiagramUrl: 'https://design.nedra.digital/diagrams/wwo-analytics',
    licenseServerIntegrated: true,
    libraries: [
      { name: 'react', version: '18.3.1' },
      { name: '@apollo/client', version: '3.10.5' },
      { name: '@consta/charts', version: '1.0.0' }
    ],
    clientType: 'web',
    deploymentTool: 'kubernetes',
    dependencies: ['module-wwo-planner', 'module-wwo-execution'],
    produces: ['artifact-wwo-performance-dashboard'],
    reuseScore: 0.67,
    metrics: {
      tests: 118,
      coverage: 82,
      automationRate: 76
    },
    dataIn: [
      {
        id: 'operations-log-input',
        label: 'Фактический журнал операций',
        sourceId: 'artifact-wwo-operations-log'
      },
      {
        id: 'plan-baseline',
        label: 'Утверждённые программы работ',
        sourceId: 'artifact-wwo-plan'
      },
      {
        id: 'quality-standards',
        label: 'Стандарты и регламенты работ'
      }
    ],
    dataOut: [
      {
        id: 'workover-kpi',
        label: 'Индекс эффективности внутрискважинных работ'
      }
    ],
    formula: 'kpi = Σ(metric_i * weight_i)',
    nonFunctional: {
      responseTimeMs: 480,
      throughputRps: 90,
      resourceConsumption: '6 vCPU / 20 GB RAM',
      baselineUsers: 260
    }
  },
  {
    id: 'module-lab-experiments',
    name: 'Digital Lab Experiments',
    description:
      'Площадка для быстрых продуктовых экспериментов, собирающая телеметрию и мгновенно распространяющая результаты в продуктовые команды.',
    domains: ['real-time-monitoring', 'production-optimization'],
    team: 'Лаборатория цифровых испытаний',
    productName: 'Digital Operations Suite',
    projectTeam: [
      { id: 'lab-owner', fullName: 'Кира Левина', role: 'Владелец продукта' },
      { id: 'lab-architect', fullName: 'Евгений Власов', role: 'Архитектор' },
      { id: 'lab-backend', fullName: 'Тимур Назаров', role: 'Backend' },
      { id: 'lab-frontend', fullName: 'Лидия Костина', role: 'Frontend' }
    ],
    technologyStack: ['TypeScript', 'FastAPI', 'Apache Kafka', 'ClickHouse'],
    localization: 'ru',
    ridOwner: { company: 'АО «Nedra Digital»', division: 'Дирекция цифровых операций' },
    userStats: { companies: 3, licenses: 140 },
    status: 'in-dev',
    repository: 'https://git.nedra.digital/labs/digital-experiments',
    api: 'gRPC telemetry.TelemetryService',
    specificationUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=98501',
    apiContractsUrl: 'https://kb.nedra.digital/display/LABS/Telemetry+Contracts',
    techDesignUrl: 'https://kb.nedra.digital/pages/viewpage.action?pageId=98540',
    architectureDiagramUrl: 'https://design.nedra.digital/diagrams/lab-experiments',
    licenseServerIntegrated: false,
    libraries: [
      { name: '@nestjs/microservices', version: '10.3.2' },
      { name: 'kafkajs', version: '2.2.4' },
      { name: '@apollo/client', version: '3.10.8' }
    ],
    clientType: 'web',
    deploymentTool: 'kubernetes',
    dependencies: ['module-dtwin-monitoring'],
    produces: [],
    reuseScore: 0.34,
    metrics: {
      tests: 84,
      coverage: 78,
      automationRate: 71
    },
    dataIn: [
      {
        id: 'lab-live-stream',
        label: 'Поток телеметрии промышленных датчиков',
        sourceId: 'artifact-dtwin-telemetry-cube'
      },
      {
        id: 'lab-layout-scenarios',
        label: 'Сценарии размещения для экспериментов',
        sourceId: 'artifact-infraplan-layout'
      }
    ],
    dataOut: [
      {
        id: 'lab-insights',
        label: 'Отчёт по проведённым экспериментам',
        consumerIds: ['module-dtwin-optimizer', 'module-wwo-analytics']
      }
    ],
    formula: 'insight = normalize(stream) ⊕ simulate(layout)',
    nonFunctional: {
      responseTimeMs: 220,
      throughputRps: 210,
      resourceConsumption: '5 vCPU / 12 GB RAM',
      baselineUsers: 65
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
  producedBy?: string;
  consumerIds: string[];
  dataType: string;
  sampleUrl: string;
};

export const artifacts: ArtifactNode[] = [
  {
    id: 'artifact-infraplan-source-pack',
    name: 'Пакет исходных данных INFRAPLAN',
    description:
      'Нормализованный набор инженерных и технологических данных для моделирования инфраструктуры.',
    domainId: 'data-preparation',
    producedBy: 'module-infraplan-datahub',
    consumerIds: [
      'module-infraplan-layout',
      'module-infraplan-economics',
      'module-dtwin-optimizer'
    ],
    dataType: 'Инженерные данные',
    sampleUrl: 'https://storage.nedra.digital/samples/infraplan-source-pack.zip'
  },
  {
    id: 'artifact-infraplan-layout',
    name: 'Сценарии размещения объектов',
    description:
      'Набор оптимизированных конфигураций размещения площадных и линейных объектов обустройства.',
    domainId: 'layout-optimization',
    producedBy: 'module-infraplan-layout',
    consumerIds: ['module-infraplan-economics'],
    dataType: 'Геомодели',
    sampleUrl: 'https://storage.nedra.digital/samples/infraplan-layout.json'
  },
  {
    id: 'artifact-infraplan-economic-report',
    name: 'Экономический отчёт INFRAPLAN',
    description:
      'Инвестиционные показатели по каждому варианту инфраструктуры с расчётом NPV, IRR и срока окупаемости.',
    domainId: 'economic-evaluation',
    producedBy: 'module-infraplan-economics',
    consumerIds: [],
    dataType: 'Финансовая аналитика',
    sampleUrl: 'https://storage.nedra.digital/samples/infraplan-economics.pdf'
  },
  {
    id: 'artifact-dtwin-telemetry-cube',
    name: 'Куб телеметрии DIGITAL TWIN',
    description:
      'Агрегированные данные телеметрии по объектам наземной инфраструктуры в режиме реального времени.',
    domainId: 'real-time-monitoring',
    producedBy: 'module-dtwin-monitoring',
    consumerIds: ['module-dtwin-optimizer'],
    dataType: 'Потоковые данные',
    sampleUrl: 'https://storage.nedra.digital/samples/dtwin-telemetry.parquet'
  },
  {
    id: 'artifact-dtwin-optimization-orders',
    name: 'Пакет команд оптимизации',
    description:
      'Рекомендации цифрового двойника по изменению режимов работы оборудования и инфраструктуры.',
    domainId: 'production-optimization',
    producedBy: 'module-dtwin-optimizer',
    consumerIds: ['module-dtwin-remote-control'],
    dataType: 'Управляющие команды',
    sampleUrl: 'https://storage.nedra.digital/samples/dtwin-optimization-orders.json'
  },
  {
    id: 'artifact-dtwin-remote-commands',
    name: 'Поток дистанционных команд',
    description:
      'Структурированный поток управляющих команд, передаваемых на исполнительные устройства.',
    domainId: 'remote-control',
    producedBy: 'module-dtwin-remote-control',
    consumerIds: [],
    dataType: 'Управляющие сигналы',
    sampleUrl: 'https://storage.nedra.digital/samples/dtwin-remote-commands.avro'
  },
  {
    id: 'artifact-wwo-plan',
    name: 'План внутрискважинных работ',
    description:
      'Утверждённый календарь ГТМ и ТКРС по фонду скважин с назначением подрядчиков и ресурсов.',
    domainId: 'workover-planning',
    producedBy: 'module-wwo-planner',
    consumerIds: ['module-wwo-execution', 'module-wwo-analytics'],
    dataType: 'Производственный план',
    sampleUrl: 'https://storage.nedra.digital/samples/wwo-plan.xlsx'
  },
  {
    id: 'artifact-wwo-operations-log',
    name: 'Журнал исполнения WWO',
    description:
      'Фактический журнал проведения ремонтных работ с показателями продолжительности и качественными отметками.',
    domainId: 'field-execution',
    producedBy: 'module-wwo-execution',
    consumerIds: ['module-wwo-analytics', 'module-wwo-planner'],
    dataType: 'Операционные данные',
    sampleUrl: 'https://storage.nedra.digital/samples/wwo-operations-log.csv'
  },
  {
    id: 'artifact-wwo-performance-dashboard',
    name: 'Дашборд эффективности WWO',
    description:
      'Набор визуализаций KPI по ремонтам, экономическому эффекту и соблюдению регламентов.',
    domainId: 'quality-analytics',
    producedBy: 'module-wwo-analytics',
    consumerIds: [],
    dataType: 'BI-отчёт',
    sampleUrl: 'https://storage.nedra.digital/samples/wwo-performance-dashboard.pdf'
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

export type ReuseTrendPoint = {
  period: string;
  averageScore: number;
};

export const reuseIndexHistory: ReuseTrendPoint[] = [
  { period: '2023-11', averageScore: 0.42 },
  { period: '2023-12', averageScore: 0.44 },
  { period: '2024-01', averageScore: 0.45 },
  { period: '2024-02', averageScore: 0.47 },
  { period: '2024-03', averageScore: 0.5 },
  { period: '2024-04', averageScore: 0.53 },
  { period: '2024-05', averageScore: 0.55 },
  { period: '2024-06', averageScore: 0.57 },
  { period: '2024-07', averageScore: 0.6 },
  { period: '2024-08', averageScore: 0.62 },
  { period: '2024-09', averageScore: 0.65 },
  { period: '2024-10', averageScore: 0.66 }
];
