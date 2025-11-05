import { Badge } from '@consta/uikit/Badge';
import { Card } from '@consta/uikit/Card';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import React, { useMemo, useState } from 'react';
import styles from './EmployeeWorkloadTrack.module.css';

type WorkloadKind = 'project' | 'out-of-project' | 'training';

type WorkloadTask = {
  id: string;
  name: string;
  start: string;
  end: string;
  kind: WorkloadKind;
  lane?: number;
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

const scaleTabs = [
  { label: 'Неделя', value: 'week' },
  { label: 'Месяц', value: 'month' }
] as const;

type ScaleTab = (typeof scaleTabs)[number];

type MonthSegment = {
  label: string;
  start: Date;
};

const timelineStart = new Date('2022-11-01T00:00:00');
const timelineEnd = new Date('2023-08-31T23:59:59');

const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'short', year: 'numeric' });
const periodFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' });

const taskBadgeStatus: Record<WorkloadKind, 'system' | 'warning' | 'success'> = {
  project: 'system',
  'out-of-project': 'warning',
  training: 'success'
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
        lane: 0,
        badge: 'Проект'
      },
      {
        id: 'task-2',
        name: 'Аналитика маршрутов клиента',
        start: '2023-02-03',
        end: '2023-04-18',
        kind: 'project',
        lane: 1,
        badge: 'Проект'
      },
      {
        id: 'task-3',
        name: 'Интервью по продукту Сервис X',
        start: '2023-05-02',
        end: '2023-06-30',
        kind: 'out-of-project',
        lane: 0,
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
        lane: 0,
        badge: 'Проект'
      },
      {
        id: 'task-5',
        name: 'Поддержка витрины показателей',
        start: '2023-03-06',
        end: '2023-05-26',
        kind: 'project',
        lane: 1,
        badge: 'Проект'
      },
      {
        id: 'task-6',
        name: 'Концепция расчёта LTV',
        start: '2023-06-05',
        end: '2023-07-21',
        kind: 'out-of-project',
        lane: 0,
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
        lane: 0,
        badge: 'Проект'
      },
      {
        id: 'task-8',
        name: 'Интеграция API поставщиков',
        start: '2023-04-10',
        end: '2023-06-23',
        kind: 'project',
        lane: 1,
        badge: 'Проект'
      },
      {
        id: 'task-9',
        name: 'Запуск пилота «Экспресс-логистика»',
        start: '2023-07-03',
        end: '2023-08-18',
        kind: 'out-of-project',
        lane: 0,
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
        lane: 0,
        badge: 'Развитие'
      },
      {
        id: 'task-11',
        name: 'Подготовка витрин ML',
        start: '2023-02-06',
        end: '2023-04-21',
        kind: 'project',
        lane: 1,
        badge: 'Проект'
      },
      {
        id: 'task-12',
        name: 'Разработка модели прогноза спроса',
        start: '2023-05-08',
        end: '2023-06-30',
        kind: 'out-of-project',
        lane: 0,
        badge: 'Вне проекта'
      }
    ]
  }
];

const EmployeeWorkloadTrack: React.FC = () => {
  const [scale, setScale] = useState<ScaleTab>(scaleTabs[1]);

  const monthSegments = useMemo<MonthSegment[]>(() => {
    const segments: MonthSegment[] = [];
    let current = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
    const end = timelineEnd.getTime();

    while (current.getTime() <= end) {
      const labelRaw = monthFormatter.format(current);
      const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1);
      segments.push({ label, start: new Date(current) });
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }

    return segments;
  }, []);

  const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

  const renderTask = (task: WorkloadTask, index: number) => {
    const taskStart = new Date(task.start).getTime();
    const taskEnd = new Date(task.end).getTime();
    const normalizedStart = Math.max(taskStart, timelineStart.getTime());
    const normalizedEnd = Math.min(taskEnd, timelineEnd.getTime());
    const offset = ((normalizedStart - timelineStart.getTime()) / totalDuration) * 100;
    const width = Math.max(((normalizedEnd - normalizedStart) / totalDuration) * 100, 3);
    const laneIndex = task.lane ?? index;
    const top = 8 + laneIndex * 68;

    const periodLabel = `${periodFormatter.format(new Date(task.start))} – ${periodFormatter.format(
      new Date(task.end)
    )}`;

    return (
      <div
        key={task.id}
        className={styles.task}
        data-kind={task.kind}
        style={{ left: `${offset}%`, width: `${width}%`, top }}
      >
        <Text size="xs" weight="semibold" className={styles.taskName} truncate>
          {task.name}
        </Text>
        <div className={styles.taskMetaRow}>
          <Badge size="xs" status={taskBadgeStatus[task.kind]} label={task.badge} className={styles.taskBadge} />
          <Text size="2xs" view="secondary" className={styles.taskPeriod}>
            {periodLabel}
          </Text>
        </div>
        {task.description && (
          <Text size="2xs" view="secondary" className={styles.taskDescription}>
            {task.description}
          </Text>
        )}
      </div>
    );
  };

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
        <Tabs<ScaleTab>
          size="s"
          items={scaleTabs}
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
      <div className={styles.timeline}>
        <div className={styles.axisRow}>
          <div className={styles.axisHeaderCell}>
            <Text size="xs" view="secondary">
              Сотрудник
            </Text>
          </div>
          <div
            className={styles.axis}
            style={{ gridTemplateColumns: `repeat(${monthSegments.length}, minmax(0, 1fr))` }}
          >
            {monthSegments.map((segment) => (
              <div key={segment.label} className={styles.axisCell}>
                <Text size="2xs" view="secondary">
                  {segment.label}
                </Text>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.rows}>
          {mockEmployees.map((employee) => {
            const maxLane = employee.tasks.reduce((acc, task) => Math.max(acc, task.lane ?? 0), 0);
            const minHeight = Math.max(112, 68 * (maxLane + 1) + 28);

            return (
              <div key={employee.id} className={styles.row}>
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
                <div className={styles.timelineCell} style={{ minHeight }}>
                  <div className={styles.timelineLane} />
                  {employee.tasks.map((task, index) => renderTask(task, index))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default EmployeeWorkloadTrack;
