import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Card } from '@consta/uikit/Card';
import { Select } from '@consta/uikit/Select';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import React, { useCallback, useMemo, useState } from 'react';
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

type TaskPriority = 'low' | 'medium' | 'high';
type TaskStatus = 'new' | 'in-progress' | 'paused' | 'rejected' | 'completed';

type TaskListItem = {
  id: string;
  name: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  assigneeId: string | null;
  description: string;
};

type SelectOption<Value extends string> = {
  label: string;
  value: Value;
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

const priorityOptions: SelectOption<TaskPriority>[] = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' }
];

const statusOptions: SelectOption<TaskStatus>[] = [
  { label: 'Новая', value: 'new' },
  { label: 'В работе', value: 'in-progress' },
  { label: 'На паузе', value: 'paused' },
  { label: 'Отклонено', value: 'rejected' },
  { label: 'Выполнено', value: 'completed' }
];

const statusBadges: Record<TaskStatus, { label: string; badgeStatus: 'normal' | 'system' | 'success' | 'warning' | 'alert' | 'error' }> = {
  'new': { label: 'Новая', badgeStatus: 'system' },
  'in-progress': { label: 'В работе', badgeStatus: 'warning' },
  'paused': { label: 'На паузе', badgeStatus: 'alert' },
  'rejected': { label: 'Отклонено', badgeStatus: 'error' },
  'completed': { label: 'Выполнено', badgeStatus: 'success' }
};

const priorityBadges: Record<TaskPriority, { label: string; badgeStatus: 'normal' | 'system' | 'success' | 'warning' | 'alert' | 'error' }> = {
  'low': { label: 'Низкий', badgeStatus: 'normal' },
  'medium': { label: 'Средний', badgeStatus: 'warning' },
  'high': { label: 'Высокий', badgeStatus: 'alert' }
};

const initialTaskList: TaskListItem[] = [
  {
    id: 'team-task-1',
    name: 'Скрининг участков',
    priority: 'medium',
    dueDate: '2024-03-11',
    status: 'paused',
    assigneeId: 'emp-1',
    description:
      'Провести аналитический скрининг участков и подготовить рекомендации для инвест-совета.'
  },
  {
    id: 'team-task-2',
    name: 'Первичный расчёт экономики',
    priority: 'high',
    dueDate: '2024-02-15',
    status: 'in-progress',
    assigneeId: 'emp-2',
    description: 'Собрать исходные данные и подготовить первичный расчёт показателей экономики проекта.'
  },
  {
    id: 'team-task-3',
    name: 'Формирование паспорта инвест-проекта',
    priority: 'medium',
    dueDate: '2024-03-29',
    status: 'new',
    assigneeId: 'emp-3',
    description:
      'Согласовать исходные данные, актуализировать паспорт проекта и подтвердить ответственных исполнителей.'
  },
  {
    id: 'team-task-4',
    name: 'Разбор запускных параметров тепловой схемы',
    priority: 'low',
    dueDate: '2024-03-29',
    status: 'new',
    assigneeId: null,
    description: 'Подготовить рекомендации по корректировке запускных параметров и согласовать их с технологами.'
  },
  {
    id: 'team-task-5',
    name: 'Актуализация профилей добычи',
    priority: 'low',
    dueDate: '2024-03-29',
    status: 'new',
    assigneeId: 'emp-4',
    description: 'Собрать данные по текущим профилям добычи и обновить отчётность для инвестиционного комитета.'
  },
  {
    id: 'team-task-6',
    name: 'Расчёт кустов без учёта инфраструктуры',
    priority: 'medium',
    dueDate: '2024-03-29',
    status: 'new',
    assigneeId: null,
    description: 'Подготовить сравнительный анализ кустовых расчётов без учёта инфраструктурных ограничений.'
  },
  {
    id: 'team-task-7',
    name: 'Формирование сценариев отсечения КП',
    priority: 'medium',
    dueDate: '2024-03-29',
    status: 'new',
    assigneeId: null,
    description: 'Разработать сценарии отсечения КП и согласовать с командой архитекторов.'
  },
  {
    id: 'team-task-8',
    name: 'Расчёт экономики',
    priority: 'high',
    dueDate: '2024-04-12',
    status: 'rejected',
    assigneeId: 'emp-2',
    description: 'Подготовить альтернативный расчёт экономики с учётом новых вводных от финансового блока.'
  },
  {
    id: 'team-task-9',
    name: 'План даты ввода',
    priority: 'medium',
    dueDate: '2024-03-29',
    status: 'completed',
    assigneeId: 'emp-1',
    description: 'Согласовать график ввода объектов и передать его в проектный офис.'
  }
];

const EmployeeWorkloadTrack: React.FC = () => {
  const [scale, setScale] = useState<TimelineScaleTab>(timelineScaleTabs[1]);
  const [tasks, setTasks] = useState<TaskListItem[]>(initialTaskList);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialTaskList[0]?.id ?? null
  );
  const [taskDraft, setTaskDraft] = useState<{
    name: string;
    priority: TaskPriority;
    dueDate: string;
    status: TaskStatus;
    assigneeId: string | null;
    description: string;
  }>({
    name: '',
    priority: 'medium',
    dueDate: '',
    status: 'new',
    assigneeId: null,
    description: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

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

  const assigneeOptions = useMemo<SelectOption<string>[]>(() => {
    return mockEmployees.map((employee) => ({
      label: employee.fullName,
      value: employee.id
    }));
  }, []);

  const employeeNameMap = useMemo<Record<string, string>>(() => {
    return mockEmployees.reduce<Record<string, string>>((acc, employee) => {
      acc[employee.id] = employee.fullName;
      return acc;
    }, {});
  }, []);

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasks]);

  const formatDate = useCallback((value: string) => {
    if (!value) {
      return 'Не указана';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Не указана';
    }
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }, []);

  const calculateParallelTasks = useCallback(
    (assigneeId: string, referenceTask: TaskListItem) => {
      const dueDate = referenceTask.dueDate ? new Date(referenceTask.dueDate) : null;
      const employee = mockEmployees.find((item) => item.id === assigneeId);

      const overlappingProjectTasks = (() => {
        if (!employee || !dueDate || Number.isNaN(dueDate.getTime())) {
          return 0;
        }

        return employee.tasks.filter((projectTask) => {
          const startDate = new Date(projectTask.start);
          const endDate = new Date(projectTask.end);
          if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return false;
          }
          return startDate.getTime() <= dueDate.getTime() && dueDate.getTime() <= endDate.getTime();
        }).length;
      })();

      const overlappingTeamTasks = tasks.filter((task) => {
        if (task.id === referenceTask.id) {
          return false;
        }
        if (task.assigneeId !== assigneeId) {
          return false;
        }
        if (!dueDate || !task.dueDate) {
          return true;
        }
        const compareDate = new Date(task.dueDate);
        if (Number.isNaN(compareDate.getTime())) {
          return true;
        }
        return compareDate.getTime() === dueDate.getTime();
      }).length;

      return overlappingProjectTasks + overlappingTeamTasks;
    },
    [tasks]
  );

  const getAssigneeLoadLevel = useCallback(
    (assigneeId: string, task: TaskListItem) => {
      const parallelTasks = calculateParallelTasks(assigneeId, task);
      if (parallelTasks === 0) {
        return 'free';
      }
      if (parallelTasks === 1) {
        return 'focus';
      }
      return 'busy';
    },
    [calculateParallelTasks]
  );

  const handleAssignTask = useCallback((taskId: string, assigneeId: string | null) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              assigneeId
            }
          : task
      )
    );
  }, []);

  const handleSubmitTask = useCallback(() => {
    if (!taskDraft.name.trim() || !taskDraft.dueDate) {
      setFormError('Укажите наименование задачи и дату реализации.');
      return;
    }

    const newTask: TaskListItem = {
      id: `team-task-${Date.now()}`,
      name: taskDraft.name.trim(),
      priority: taskDraft.priority,
      dueDate: taskDraft.dueDate,
      status: taskDraft.status,
      assigneeId: taskDraft.assigneeId,
      description: taskDraft.description.trim() || 'Описание будет добавлено позже.'
    };

    setTasks((prev) => [newTask, ...prev]);
    setTaskDraft({
      name: '',
      priority: 'medium',
      dueDate: '',
      status: 'new',
      assigneeId: null,
      description: ''
    });
    setFormError(null);
    setSelectedTaskId(newTask.id);
  }, [taskDraft]);

  return (
    <div className={styles.layout}>
      <Card
        className={`${styles.card} ${styles.taskCard}`}
        verticalSpace="xl"
        horizontalSpace="xl"
      >
        <header className={styles.taskHeader}>
          <div className={styles.taskHeaderInfo}>
            <Text size="s" weight="semibold">
              Постановка задач
            </Text>
            <Text size="xs" view="secondary">
              Создавайте и назначайте задачи для своей команды
            </Text>
          </div>
          <Badge
            size="xs"
            view="stroked"
            status="system"
            label={`Активных задач: ${tasks.length}`}
          />
        </header>
        <form
          className={styles.taskForm}
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmitTask();
          }}
        >
          <div className={styles.taskFormFields}>
            <TextField
              size="s"
              label="Наименование"
              placeholder="Например, подготовить паспорт проекта"
              value={taskDraft.name}
              onChange={({ value }) => {
                setTaskDraft((prev) => ({
                  ...prev,
                  name: value ?? ''
                }));
              }}
            />
            <Select<SelectOption<TaskPriority>>
              size="s"
              label="Приоритет"
              items={priorityOptions}
              value={priorityOptions.find((item) => item.value === taskDraft.priority) ?? null}
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              onChange={(option) => {
                setTaskDraft((prev) => ({
                  ...prev,
                  priority: option?.value ?? prev.priority
                }));
              }}
            />
            <TextField
              size="s"
              type="date"
              label="Дата реализации"
              value={taskDraft.dueDate}
              onChange={({ value }) => {
                setTaskDraft((prev) => ({
                  ...prev,
                  dueDate: value ?? ''
                }));
              }}
            />
            <Select<SelectOption<TaskStatus>>
              size="s"
              label="Статус"
              items={statusOptions}
              value={statusOptions.find((item) => item.value === taskDraft.status) ?? null}
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              onChange={(option) => {
                setTaskDraft((prev) => ({
                  ...prev,
                  status: option?.value ?? prev.status
                }));
              }}
            />
            <Select<SelectOption<string>>
              size="s"
              label="Исполнитель"
              placeholder="Назначьте исполнителя"
              items={assigneeOptions}
              value={
                taskDraft.assigneeId
                  ? assigneeOptions.find((option) => option.value === taskDraft.assigneeId) ?? null
                  : null
              }
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              onChange={(option) => {
                setTaskDraft((prev) => ({
                  ...prev,
                  assigneeId: option?.value ?? null
                }));
              }}
            />
          </div>
          <TextField
            size="s"
            label="Описание"
            type="textarea"
            rows={3}
            placeholder="Кратко опишите ожидаемый результат"
            value={taskDraft.description}
            onChange={({ value }) => {
              setTaskDraft((prev) => ({
                ...prev,
                description: value ?? ''
              }));
            }}
          />
          {formError && (
            <Text size="xs" view="alert">
              {formError}
            </Text>
          )}
          <div className={styles.taskFormActions}>
            <Button type="submit" size="s" view="primary" label="Сохранить задачу" />
          </div>
        </form>
        <div className={styles.taskTable}>
          <div className={`${styles.taskRow} ${styles.taskRowHeader}`} aria-hidden={true}>
            <Text size="2xs" view="secondary">
              Наименование
            </Text>
            <Text size="2xs" view="secondary">
              Приоритет
            </Text>
            <Text size="2xs" view="secondary">
              Дата реализации
            </Text>
            <Text size="2xs" view="secondary">
              Статус
            </Text>
            <Text size="2xs" view="secondary">
              Исполнители
            </Text>
          </div>
          {tasks.map((task) => {
            const priorityBadge = priorityBadges[task.priority];
            const statusBadge = statusBadges[task.status];
            const assigneeName = task.assigneeId ? employeeNameMap[task.assigneeId] : null;
            const loadLevel = task.assigneeId ? getAssigneeLoadLevel(task.assigneeId, task) : null;

            return (
              <div
                key={task.id}
                className={`${styles.taskRow} ${
                  task.id === selectedTaskId ? styles.taskRowActive : ''
                }`}
              >
                <button
                  type="button"
                  className={styles.taskNameButton}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                  }}
                >
                  <Text size="xs" weight="semibold">
                    {task.name}
                  </Text>
                </button>
                <Badge
                  size="xs"
                  view="filled"
                  status={priorityBadge.badgeStatus}
                  label={priorityBadge.label}
                />
                <Text size="xs" view="secondary">
                  {formatDate(task.dueDate)}
                </Text>
                <Badge
                  size="xs"
                  view="filled"
                  status={statusBadge.badgeStatus}
                  label={statusBadge.label}
                />
                {assigneeName ? (
                  <div className={styles.assigneeInfo}>
                    <span className={styles.assigneeIndicator} data-level={loadLevel ?? 'free'} />
                    <Text size="xs" weight="semibold">
                      {assigneeName}
                    </Text>
                  </div>
                ) : (
                  <Select<SelectOption<string>>
                    size="xs"
                    placeholder="Назначить"
                    items={assigneeOptions}
                    value={null}
                    getItemLabel={(item) => item.label}
                    getItemKey={(item) => item.value}
                    onChange={(option) => {
                      handleAssignTask(task.id, option?.value ?? null);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        {selectedTask && (
          <div className={styles.taskDetails}>
            <Text size="s" weight="semibold">
              {selectedTask.name}
            </Text>
            <div className={styles.taskDetailsMeta}>
              <Badge
                size="xs"
                view="filled"
                status={priorityBadges[selectedTask.priority].badgeStatus}
                label={priorityBadges[selectedTask.priority].label}
              />
              <Badge
                size="xs"
                view="filled"
                status={statusBadges[selectedTask.status].badgeStatus}
                label={statusBadges[selectedTask.status].label}
              />
              <Text size="xs" view="secondary">
                Срок: {formatDate(selectedTask.dueDate)}
              </Text>
              {selectedTask.assigneeId && (
                <div className={styles.taskDetailsAssignee}>
                  <span
                    className={styles.assigneeIndicator}
                    data-level={getAssigneeLoadLevel(selectedTask.assigneeId, selectedTask)}
                  />
                  <Text size="xs" weight="semibold">
                    {employeeNameMap[selectedTask.assigneeId]}
                  </Text>
                </div>
              )}
            </div>
            <Text size="xs" view="secondary">
              {selectedTask.description}
            </Text>
          </div>
        )}
      </Card>
      <Card
        className={`${styles.card} ${styles.workloadCard}`}
        verticalSpace="xl"
        horizontalSpace="xl"
      >
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
    </div>
  );
};

export default EmployeeWorkloadTrack;
