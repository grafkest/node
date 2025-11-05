import { Badge } from '@consta/uikit/Badge';
import { Card } from '@consta/uikit/Card';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import React, { useMemo, useState } from 'react';
import GanttTimeline, {
  type GanttTimelineRow,
  type GanttTimelineTaskKind,
  timelineScaleTabs,
  type TimelineScaleTab
} from './GanttTimeline';
import styles from './EmployeeWorkloadTrack.module.css';

type WorkloadKind = GanttTimelineTaskKind;

type WorkloadTask = {
  id: string;
  name: string;
  start: string;
  end: string;
  kind: WorkloadKind;
  badge: string;
  description?: string;
};

type EmployeeWorkload = {
  id: string;
  fullName: string;
  position: string;
  rank: number;
  workload: number;
  availability: string;
  focus: string;
  tasks: WorkloadTask[];
};

const mockEmployees: EmployeeWorkload[] = [
  {
    id: 'emp-1',
    fullName: 'Андреева М. И.',
    position: 'UX-исследователь',
    rank: 1,
    workload: 0.78,
    availability: 'Свободна с 12 июня',
    focus: 'Приоритет — пользовательские исследования',
    tasks: [
      {
        id: 'task-1',
        name: 'Расчёт юнит-экономики',
        start: '2022-11-07',
        end: '2023-01-24',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-2',
        name: 'Аналитика маршрутов клиента',
        start: '2023-02-03',
        end: '2023-04-18',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-3',
        name: 'Интервью по продукту Сервис X',
        start: '2023-05-02',
        end: '2023-06-30',
        kind: 'out-of-project',
        badge: 'Вне проекта',
        description: 'Оценка экспертизы для нового направления'
      }
    ]
  },
  {
    id: 'emp-2',
    fullName: 'Дмитриев К. Л.',
    position: 'Продуктовый аналитик',
    rank: 2,
    workload: 0.64,
    availability: 'Свободен с 3 июля',
    focus: 'Фокус — аналитика продуктовых метрик',
    tasks: [
      {
        id: 'task-4',
        name: 'Актуализация проекта «Цифровой профиль»',
        start: '2022-12-05',
        end: '2023-02-28',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-5',
        name: 'Поддержка витрины показателей',
        start: '2023-03-06',
        end: '2023-05-26',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-6',
        name: 'Концепция расчёта LTV',
        start: '2023-06-05',
        end: '2023-07-21',
        kind: 'out-of-project',
        badge: 'Вне проекта'
      }
    ]
  },
  {
    id: 'emp-3',
    fullName: 'Котова Д. А.',
    position: 'Менеджер проекта',
    rank: 3,
    workload: 0.88,
    availability: 'Свободна с 1 августа',
    focus: 'Работает с кросс-командными поставками',
    tasks: [
      {
        id: 'task-7',
        name: 'Расширение экосистемы партнёров',
        start: '2023-01-16',
        end: '2023-03-31',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-8',
        name: 'Интеграция API поставщиков',
        start: '2023-04-10',
        end: '2023-06-23',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-9',
        name: 'Запуск пилота «Экспресс-логистика»',
        start: '2023-07-03',
        end: '2023-08-18',
        kind: 'out-of-project',
        badge: 'Вне проекта'
      }
    ]
  },
  {
    id: 'emp-4',
    fullName: 'Маркелов Я. О.',
    position: 'Аналитик данных',
    rank: 4,
    workload: 0.54,
    availability: 'Свободен с 15 мая',
    focus: 'Подходит на задачи по ML и BI',
    tasks: [
      {
        id: 'task-10',
        name: 'Миграция отчётности',
        start: '2022-11-14',
        end: '2023-01-27',
        kind: 'training',
        badge: 'Развитие'
      },
      {
        id: 'task-11',
        name: 'Подготовка витрин ML',
        start: '2023-02-06',
        end: '2023-04-21',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-12',
        name: 'Разработка модели прогноза спроса',
        start: '2023-05-08',
        end: '2023-06-30',
        kind: 'out-of-project',
        badge: 'Вне проекта'
      }
    ]
  }
];

const EmployeeWorkloadTrack: React.FC = () => {
  const [scale, setScale] = useState<TimelineScaleTab>(timelineScaleTabs[1]);

  const timelineRows = useMemo<GanttTimelineRow[]>(() => {
    return mockEmployees.map((employee) => {
      const sortedTasks = employee.tasks
        .slice()
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      const tasks = sortedTasks.map((task) => ({
        id: task.id,
        name: task.name,
        start: task.start,
        end: task.end,
        kind: task.kind,
        badge: task.badge,
        description: task.description
      }));

      const sidebar = (
        <div className={styles.employeeCell}>
          <div className={styles.employeeMeta}>
            <Badge size="xs" status="success" label={`№${employee.rank}`} />
            <Text size="s" weight="semibold">
              {employee.fullName}
            </Text>
          </div>
          <Text size="xs" view="secondary">
            {employee.position}
          </Text>
          <div className={styles.employeeStats}>
            <div className={styles.employeeStatItem}>
              <Text size="2xs" view="secondary">
                Загруженность
              </Text>
              <Text size="xs" weight="semibold">
                {Math.round(employee.workload * 100)}%
              </Text>
            </div>
            <div className={styles.employeeStatItem}>
              <Text size="2xs" view="secondary">
                Доступность
              </Text>
              <Text size="xs" weight="semibold">
                {employee.availability}
              </Text>
            </div>
          </div>
          <Text size="2xs" view="secondary">
            {employee.focus}
          </Text>
        </div>
      );

      return { id: employee.id, sidebar, tasks };
    });
  }, []);

  return (
    <Card className={styles.card} verticalSpace="xl" horizontalSpace="xl">
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <Text size="s" weight="semibold">
            Загруженность сотрудников
          </Text>
          <div className={styles.summary}>
            <Text size="xs" view="secondary">
              Сотрудники: {mockEmployees.length}
            </Text>
            <Text size="xs" view="secondary">
              Показаны кандидаты с учетом загрузки по задачам
            </Text>
          </div>
        </div>
        <Tabs<TimelineScaleTab>
          size="s"
          items={timelineScaleTabs}
          value={scale}
          getItemLabel={(item) => item.label}
          getItemKey={(item) => item.value}
          onChange={setScale}
        />
      </header>
      <div className={styles.legend} aria-hidden={true}>
        <div className={styles.legendItem}>
          <span className={styles.legendMarker} data-kind="project" />
          <Text size="2xs" view="secondary">
            Проектные задачи
          </Text>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendMarker} data-kind="out-of-project" />
          <Text size="2xs" view="secondary">
            Вне проекта
          </Text>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendMarker} data-kind="training" />
          <Text size="2xs" view="secondary">
            Развитие и обучение
          </Text>
        </div>
      </div>
      <GanttTimeline axisLabel="Сотрудник" scale={scale.value} rows={timelineRows} />
    </Card>
  );
};

export default EmployeeWorkloadTrack;
