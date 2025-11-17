/* eslint-disable react/prop-types */
import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Card } from '@consta/uikit/Card';
import { Select } from '@consta/uikit/Select';
import type { SelectProps } from '@consta/uikit/Select';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import GanttTimeline, {
  type GanttTimelineRow,
  type GanttTimelineTask,
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
  initiativeId?: string;
  kind: WorkloadKind;
  badge: string;
  description?: string;
};

const workloadBadgeStatuses: Record<WorkloadKind, 'system' | 'warning' | 'success'> = {
  project: 'system',
  'out-of-project': 'warning',
  training: 'success'
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

type TaskScheduleType = 'due-date' | 'start-duration' | 'date-range' | 'after-task';

type TaskSchedule =
  | { type: 'due-date'; dueDate: string }
  | { type: 'start-duration'; startDate: string; durationDays: number }
  | { type: 'date-range'; startDate: string; endDate: string }
  | { type: 'after-task'; predecessorId: string; durationDays: number };

type TaskRelationType = 'system' | 'initiative' | 'external' | 'methodology';

type TaskRelation =
  | { type: 'system'; targetId: string | null }
  | { type: 'initiative'; targetId: string | null }
  | { type: 'external' }
  | { type: 'methodology' };

type TaskListItem = {
  id: string;
  name: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: string | null;
  description: string;
  schedule: TaskSchedule;
  relation: TaskRelation;
};

type TaskDraft = {
  name: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigneeId: string | null;
  description: string;
  scheduleType: TaskScheduleType;
  dueDate: string;
  startDate: string;
  endDate: string;
  durationDays: string;
  predecessorId: string | null;
  relationType: TaskRelationType;
  relatedSystemId: string | null;
  relatedInitiativeId: string | null;
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
    availability: 'Свободна с 8 июля',
    focus: 'Приоритет — пользовательские исследования',
    tasks: [
      {
        id: 'task-1',
        name: 'Расчёт юнит-экономики',
        start: '2024-01-08',
        end: '2024-02-23',
        initiativeId: 'initiative-digital-2025',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-2',
        name: 'Аналитика маршрутов клиента',
        start: '2024-03-04',
        end: '2024-04-26',
        initiativeId: 'initiative-digital-2025',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-3',
        name: 'Интервью по продукту Сервис X',
        start: '2024-05-06',
        end: '2024-07-05',
        initiativeId: 'initiative-drone-monitoring',
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
    availability: 'Свободен с 15 июля',
    focus: 'Фокус — аналитика продуктовых метрик',
    tasks: [
      {
        id: 'task-4',
        name: 'Актуализация проекта «Цифровой профиль»',
        start: '2024-01-15',
        end: '2024-03-01',
        initiativeId: 'initiative-smart-wells',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-5',
        name: 'Поддержка витрины показателей',
        start: '2024-03-11',
        end: '2024-05-17',
        initiativeId: 'initiative-smart-wells',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-6',
        name: 'Концепция расчёта LTV',
        start: '2024-05-27',
        end: '2024-07-12',
        initiativeId: 'initiative-sustainable-drilling',
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
    availability: 'Свободна с 19 августа',
    focus: 'Работает с кросс-командными поставками',
    tasks: [
      {
        id: 'task-7',
        name: 'Расширение экосистемы партнёров',
        start: '2024-01-22',
        end: '2024-03-29',
        initiativeId: 'initiative-digital-2025',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-8',
        name: 'Интеграция API поставщиков',
        start: '2024-04-08',
        end: '2024-06-21',
        initiativeId: 'initiative-smart-wells',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-9',
        name: 'Запуск пилота «Экспресс-логистика»',
        start: '2024-07-01',
        end: '2024-08-16',
        initiativeId: 'initiative-drone-monitoring',
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
    availability: 'Свободен с 29 июля',
    focus: 'Подходит на задачи по ML и BI',
    tasks: [
      {
        id: 'task-10',
        name: 'Миграция отчётности',
        start: '2024-01-29',
        end: '2024-03-15',
        initiativeId: 'initiative-smart-wells',
        kind: 'training',
        badge: 'Развитие'
      },
      {
        id: 'task-11',
        name: 'Подготовка витрин ML',
        start: '2024-03-25',
        end: '2024-05-31',
        initiativeId: 'initiative-digital-2025',
        kind: 'project',
        badge: 'Проект'
      },
      {
        id: 'task-12',
        name: 'Разработка модели прогноза спроса',
        start: '2024-06-10',
        end: '2024-07-26',
        initiativeId: 'initiative-sustainable-drilling',
        kind: 'out-of-project',
        badge: 'Вне проекта'
      }
    ]
  }
];

const employeeById = new Map<string, EmployeeWorkload>(
  mockEmployees.map((employee) => [employee.id, employee] as const)
);

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

const scheduleTypeOptions: SelectOption<TaskScheduleType>[] = [
  { label: 'Сделать до даты', value: 'due-date' },
  { label: 'Дата начала + срок', value: 'start-duration' },
  { label: 'Период выполнения', value: 'date-range' },
  { label: 'После другой задачи', value: 'after-task' }
];

const systemOptions: SelectOption<string>[] = [
  { label: 'Платформа мониторинга промыслов', value: 'system-monitoring' },
  { label: 'Цифровой двойник месторождения', value: 'system-digital-twin' },
  { label: 'Система управления добычей', value: 'system-production-control' },
  { label: 'Лаборатория продвинутой аналитики', value: 'system-analytics-lab' }
];

const initiativeOptions: SelectOption<string>[] = [
  { label: 'Цифровизация добычи 2025', value: 'initiative-digital-2025' },
  { label: 'Экосистема интеллектуальных скважин', value: 'initiative-smart-wells' },
  { label: 'Программа беспилотного мониторинга', value: 'initiative-drone-monitoring' },
  { label: 'Устойчивое бурение', value: 'initiative-sustainable-drilling' }
];

const relationTypeOptions: SelectOption<TaskRelationType>[] = [
  { label: 'К системе', value: 'system' },
  { label: 'К инициативе', value: 'initiative' },
  { label: 'Внешний запрос', value: 'external' },
  { label: 'Методологическая активность', value: 'methodology' }
];

const relationLabels: Record<TaskRelationType, string> = {
  system: 'К системе',
  initiative: 'К инициативе',
  external: 'Внешний запрос',
  methodology: 'Методологическая активность'
};

const initialTaskList: TaskListItem[] = [
  {
    id: 'team-task-1',
    name: 'Скрининг участков',
    priority: 'medium',
    status: 'paused',
    assigneeId: 'emp-1',
    description:
      'Провести аналитический скрининг участков и подготовить рекомендации для инвест-совета.',
    schedule: { type: 'due-date', dueDate: '2024-03-11' },
    relation: { type: 'system', targetId: 'system-production-control' }
  },
  {
    id: 'team-task-2',
    name: 'Первичный расчёт экономики',
    priority: 'high',
    status: 'in-progress',
    assigneeId: 'emp-2',
    description: 'Собрать исходные данные и подготовить первичный расчёт показателей экономики проекта.',
    schedule: { type: 'start-duration', startDate: '2024-01-29', durationDays: 14 },
    relation: { type: 'initiative', targetId: 'initiative-digital-2025' }
  },
  {
    id: 'team-task-3',
    name: 'Формирование паспорта инвест-проекта',
    priority: 'medium',
    status: 'new',
    assigneeId: 'emp-3',
    description:
      'Согласовать исходные данные, актуализировать паспорт проекта и подтвердить ответственных исполнителей.',
    schedule: { type: 'date-range', startDate: '2024-02-19', endDate: '2024-03-29' },
    relation: { type: 'initiative', targetId: 'initiative-smart-wells' }
  },
  {
    id: 'team-task-4',
    name: 'Разбор запускных параметров тепловой схемы',
    priority: 'low',
    status: 'new',
    assigneeId: null,
    description: 'Подготовить рекомендации по корректировке запускных параметров и согласовать их с технологами.',
    schedule: { type: 'due-date', dueDate: '2024-03-29' },
    relation: { type: 'external' }
  },
  {
    id: 'team-task-5',
    name: 'Актуализация профилей добычи',
    priority: 'low',
    status: 'new',
    assigneeId: 'emp-4',
    description: 'Собрать данные по текущим профилям добычи и обновить отчётность для инвестиционного комитета.',
    schedule: { type: 'start-duration', startDate: '2024-02-12', durationDays: 21 },
    relation: { type: 'system', targetId: 'system-monitoring' }
  },
  {
    id: 'team-task-6',
    name: 'Расчёт кустов без учёта инфраструктуры',
    priority: 'medium',
    status: 'new',
    assigneeId: null,
    description: 'Подготовить сравнительный анализ кустовых расчётов без учёта инфраструктурных ограничений.',
    schedule: { type: 'after-task', predecessorId: 'team-task-5', durationDays: 7 },
    relation: { type: 'methodology' }
  },
  {
    id: 'team-task-7',
    name: 'Формирование сценариев отсечения КП',
    priority: 'medium',
    status: 'new',
    assigneeId: null,
    description: 'Разработать сценарии отсечения КП и согласовать с командой архитекторов.',
    schedule: { type: 'date-range', startDate: '2024-03-04', endDate: '2024-03-22' },
    relation: { type: 'system', targetId: 'system-digital-twin' }
  },
  {
    id: 'team-task-8',
    name: 'Расчёт экономики',
    priority: 'high',
    status: 'rejected',
    assigneeId: 'emp-2',
    description: 'Подготовить альтернативный расчёт экономики с учётом новых вводных от финансового блока.',
    schedule: { type: 'due-date', dueDate: '2024-04-12' },
    relation: { type: 'initiative', targetId: 'initiative-drone-monitoring' }
  },
  {
    id: 'team-task-9',
    name: 'План даты ввода',
    priority: 'medium',
    status: 'completed',
    assigneeId: 'emp-1',
    description: 'Согласовать график ввода объектов и передать его в проектный офис.',
    schedule: { type: 'start-duration', startDate: '2024-01-15', durationDays: 45 },
    relation: { type: 'system', targetId: 'system-analytics-lab' }
  }
];

const TEAM_TASKS_STORAGE_KEY = 'employee-workload-track:team-tasks';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object';
};

const isStoredTaskSchedule = (value: unknown): value is TaskSchedule => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'due-date':
      return typeof value.dueDate === 'string';
    case 'start-duration':
      return typeof value.startDate === 'string' && typeof value.durationDays === 'number';
    case 'date-range':
      return typeof value.startDate === 'string' && typeof value.endDate === 'string';
    case 'after-task':
      return typeof value.predecessorId === 'string' && typeof value.durationDays === 'number';
    default:
      return false;
  }
};

const isStoredTaskRelation = (value: unknown): value is TaskRelation => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'system':
    case 'initiative':
      return value.targetId === null || typeof value.targetId === 'string';
    case 'external':
    case 'methodology':
      return true;
    default:
      return false;
  }
};

const isStoredTask = (value: unknown): value is TaskListItem => {
  if (!isRecord(value)) {
    return false;
  }

  const { id, name, priority, status, assigneeId, description, schedule, relation } = value;

  if (typeof id !== 'string' || typeof name !== 'string' || typeof description !== 'string') {
    return false;
  }

  if (assigneeId !== null && typeof assigneeId !== 'string') {
    return false;
  }

  if (!['low', 'medium', 'high'].includes(priority as string)) {
    return false;
  }

  if (!['new', 'in-progress', 'paused', 'rejected', 'completed'].includes(status as string)) {
    return false;
  }

  if (!isStoredTaskSchedule(schedule)) {
    return false;
  }

  if (!isStoredTaskRelation(relation)) {
    return false;
  }

  return true;
};

const loadStoredTasks = (): TaskListItem[] | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(TEAM_TASKS_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const normalized = parsed.filter(isStoredTask).map((task) => ({
      ...task,
      assigneeId: task.assigneeId ?? null,
      schedule: { ...task.schedule },
      relation: { ...task.relation }
    }));

    return normalized;
  } catch {
    return null;
  }
};

const persistStoredTasks = (tasks: TaskListItem[]): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(TEAM_TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // ignore storage errors
  }
};

type TaskScheduleWindow = { start: Date; end: Date };

const formatIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const resolveTaskScheduleWindow = (
  task: TaskListItem,
  taskMap: Map<string, TaskListItem>,
  stack: Set<string> = new Set()
): TaskScheduleWindow | null => {
  if (stack.has(task.id)) {
    return null;
  }

  const nextStack = new Set(stack);
  nextStack.add(task.id);

  const { schedule } = task;

  switch (schedule.type) {
    case 'due-date': {
      const dueDate = parseDateValue(schedule.dueDate);
      if (!dueDate) {
        return null;
      }
      const day = startOfDay(dueDate);
      return { start: day, end: day };
    }
    case 'start-duration': {
      const startDate = parseDateValue(schedule.startDate);
      if (!startDate) {
        return null;
      }
      const dueDate = addDays(startDate, schedule.durationDays);
      return { start: startOfDay(startDate), end: startOfDay(dueDate) };
    }
    case 'date-range': {
      const startDate = parseDateValue(schedule.startDate);
      const endDate = parseDateValue(schedule.endDate);
      if (!startDate || !endDate || endDate.getTime() < startDate.getTime()) {
        return null;
      }
      return { start: startOfDay(startDate), end: startOfDay(endDate) };
    }
    case 'after-task': {
      const predecessor = schedule.predecessorId ? taskMap.get(schedule.predecessorId) : undefined;
      if (!predecessor) {
        return null;
      }
      const predecessorWindow = resolveTaskScheduleWindow(predecessor, taskMap, nextStack);
      if (!predecessorWindow) {
        return null;
      }
      const startDate = addDays(predecessorWindow.end, 1);
      const dueDate = addDays(predecessorWindow.end, schedule.durationDays);
      return { start: startOfDay(startDate), end: startOfDay(dueDate) };
    }
    default:
      return null;
  }
};

const defaultTaskDraft: TaskDraft = {
  name: '',
  priority: 'medium',
  status: 'new',
  assigneeId: null,
  description: '',
  scheduleType: 'due-date',
  dueDate: '',
  startDate: '',
  endDate: '',
  durationDays: '',
  predecessorId: null,
  relationType: 'system',
  relatedSystemId: systemOptions[0]?.value ?? null,
  relatedInitiativeId: initiativeOptions[0]?.value ?? null
};

const parseDateValue = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months, 1);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addYears = (date: Date, years: number): Date => {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years, 0, 1);
  result.setHours(0, 0, 0, 0);
  return result;
};

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const startOfWeek = (date: Date): Date => {
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setDate(result.getDate() - diff);
  return result;
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfYear = (date: Date): Date => new Date(date.getFullYear(), 0, 1);

const detailDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'long',
  year: 'numeric'
});

const formatTimelineTaskPeriod = (start: string, end: string): string => {
  const startDate = parseDateValue(start);
  const endDate = parseDateValue(end);
  if (!startDate || !endDate) {
    return 'Период не задан';
  }
  if (startDate.getTime() === endDate.getTime()) {
    return detailDateFormatter.format(startDate);
  }
  return `${detailDateFormatter.format(startDate)} — ${detailDateFormatter.format(endDate)}`;
};

const toDate = (value: Date | string): Date => {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
};

const capitalize = (value: string): string => {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const weekFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short'
});

const monthLabelFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric'
});

const yearLabelFormatter = new Intl.DateTimeFormat('ru-RU', {
  year: 'numeric'
});

const formatWeekLabel = (start: Date, endInclusive: Date): string => {
  const startLabel = capitalize(weekFormatter.format(start));
  const endLabel = capitalize(weekFormatter.format(endInclusive));
  if (startLabel === endLabel) {
    return startLabel;
  }
  return `${startLabel} – ${endLabel}`;
};

type PeriodOption = {
  label: string;
  value: string;
  start: Date;
  end: Date;
};

const buildWeekOptions = (baseStart: Date, minDate: Date, maxDate: Date): PeriodOption[] => {
  const earliest = startOfWeek(addDays(minDate, -7));
  const latest = startOfWeek(addDays(maxDate, 7));
  const options: PeriodOption[] = [];
  let cursor = earliest;
  let guard = 0;
  while (cursor <= latest && guard < 104) {
    const start = cursor;
    const end = addDays(start, 7);
    options.push({
      label: formatWeekLabel(start, addDays(end, -1)),
      value: start.toISOString(),
      start,
      end
    });
    cursor = addDays(cursor, 7);
    guard += 1;
  }
  if (options.length === 0) {
    const start = startOfWeek(baseStart);
    const end = addDays(start, 7);
    options.push({
      label: formatWeekLabel(start, addDays(end, -1)),
      value: start.toISOString(),
      start,
      end
    });
  }
  return options;
};

const buildMonthOptions = (baseStart: Date, minDate: Date, maxDate: Date): PeriodOption[] => {
  const earliest = startOfMonth(addMonths(minDate, -1));
  const latest = startOfMonth(addMonths(maxDate, 1));
  const options: PeriodOption[] = [];
  let cursor = earliest;
  let guard = 0;
  while (cursor <= latest && guard < 48) {
    const start = cursor;
    const end = addMonths(start, 1);
    options.push({
      label: capitalize(monthLabelFormatter.format(start)),
      value: start.toISOString(),
      start,
      end
    });
    cursor = addMonths(cursor, 1);
    guard += 1;
  }
  if (options.length === 0) {
    const start = startOfMonth(baseStart);
    const end = addMonths(start, 1);
    options.push({
      label: capitalize(monthLabelFormatter.format(start)),
      value: start.toISOString(),
      start,
      end
    });
  }
  return options;
};

const buildYearOptions = (baseStart: Date, minDate: Date, maxDate: Date): PeriodOption[] => {
  const earliest = startOfYear(addYears(minDate, -1));
  const latest = startOfYear(addYears(maxDate, 1));
  const options: PeriodOption[] = [];
  let cursor = earliest;
  let guard = 0;
  while (cursor <= latest && guard < 12) {
    const start = cursor;
    const end = addYears(start, 1);
    options.push({
      label: yearLabelFormatter.format(start),
      value: start.toISOString(),
      start,
      end
    });
    cursor = addYears(cursor, 1);
    guard += 1;
  }
  if (options.length === 0) {
    const start = startOfYear(baseStart);
    const end = addYears(start, 1);
    options.push({
      label: yearLabelFormatter.format(start),
      value: start.toISOString(),
      start,
      end
    });
  }
  return options;
};

const findPeriodContainingDate = (options: PeriodOption[], target: Date): PeriodOption | null => {
  return options.find((option) => target >= option.start && target < option.end) ?? null;
};

const getScheduleDueDate = (schedule: TaskSchedule): Date | null => {
  switch (schedule.type) {
    case 'due-date':
      return parseDateValue(schedule.dueDate);
    case 'start-duration': {
      const start = parseDateValue(schedule.startDate);
      if (!start) {
        return null;
      }
      return addDays(start, schedule.durationDays);
    }
    case 'date-range':
      return parseDateValue(schedule.endDate);
    case 'after-task':
      return null;
    default:
      return null;
  }
};

const formatDateDisplay = (value: string): string => {
  const date = parseDateValue(value);
  if (!date) {
    return 'Не указана';
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

const formatScheduleSummary = (
  task: TaskListItem,
  taskNameLookup: Map<string, string>
): string => {
  const { schedule } = task;
  switch (schedule.type) {
    case 'due-date':
      return `До ${formatDateDisplay(schedule.dueDate)}`;
    case 'start-duration':
      return `${formatDateDisplay(schedule.startDate)} · ${schedule.durationDays} дн.`;
    case 'date-range':
      return `${formatDateDisplay(schedule.startDate)} — ${formatDateDisplay(schedule.endDate)}`;
    case 'after-task': {
      const predecessorName = taskNameLookup.get(schedule.predecessorId) ?? 'другой задачи';
      return `После «${predecessorName}» · ${schedule.durationDays} дн.`;
    }
    default:
      return 'План не задан';
  }
};

const formatScheduleDetails = (
  task: TaskListItem,
  taskNameLookup: Map<string, string>
): string => {
  const { schedule } = task;
  switch (schedule.type) {
    case 'due-date':
      return `Выполнить до ${formatDateDisplay(schedule.dueDate)}`;
    case 'start-duration':
      return `Старт ${formatDateDisplay(schedule.startDate)}, длительность ${schedule.durationDays} дн.`;
    case 'date-range':
      return `Выполняется с ${formatDateDisplay(schedule.startDate)} по ${formatDateDisplay(schedule.endDate)}`;
    case 'after-task': {
      const predecessorName = taskNameLookup.get(schedule.predecessorId) ?? 'связанной задачи';
      return `После завершения «${predecessorName}», длительность ${schedule.durationDays} дн.`;
    }
    default:
      return 'Планирование не задано';
  }
};

const getRelationSummary = (
  relation: TaskRelation,
  maps: { systems: Record<string, string>; initiatives: Record<string, string> }
): string => {
  switch (relation.type) {
    case 'system':
      return relation.targetId
        ? `${relationLabels.system}: ${maps.systems[relation.targetId] ?? 'Не выбрана'}`
        : `${relationLabels.system}: Не выбрана`;
    case 'initiative':
      return relation.targetId
        ? `${relationLabels.initiative}: ${maps.initiatives[relation.targetId] ?? 'Не выбрана'}`
        : `${relationLabels.initiative}: Не выбрана`;
    case 'external':
      return relationLabels.external;
    case 'methodology':
      return relationLabels.methodology;
    default:
      return 'Контекст не задан';
  }
};

const parsePositiveInt = (value: string): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const buildScheduleFromDraft = (draft: TaskDraft): TaskSchedule | null => {
  switch (draft.scheduleType) {
    case 'due-date':
      return draft.dueDate ? { type: 'due-date', dueDate: draft.dueDate } : null;
    case 'start-duration': {
      const duration = parsePositiveInt(draft.durationDays);
      if (!draft.startDate || duration === null) {
        return null;
      }
      return { type: 'start-duration', startDate: draft.startDate, durationDays: duration };
    }
    case 'date-range': {
      if (!draft.startDate || !draft.endDate) {
        return null;
      }
      const startDateValue = parseDateValue(draft.startDate);
      const endDateValue = parseDateValue(draft.endDate);
      if (!startDateValue || !endDateValue) {
        return null;
      }
      if (endDateValue.getTime() < startDateValue.getTime()) {
        return null;
      }
      return { type: 'date-range', startDate: draft.startDate, endDate: draft.endDate };
    }
    case 'after-task': {
      const duration = parsePositiveInt(draft.durationDays);
      if (!draft.predecessorId || duration === null) {
        return null;
      }
      return { type: 'after-task', predecessorId: draft.predecessorId, durationDays: duration };
    }
    default:
      return null;
  }
};

const buildRelationFromDraft = (draft: TaskDraft): TaskRelation => {
  switch (draft.relationType) {
    case 'system':
      return { type: 'system', targetId: draft.relatedSystemId ?? null };
    case 'initiative':
      return { type: 'initiative', targetId: draft.relatedInitiativeId ?? null };
    case 'external':
      return { type: 'external' };
    case 'methodology':
      return { type: 'methodology' };
    default:
      return { type: 'external' };
  }
};

const createPreviewTaskFromDraft = (draft: TaskDraft, id = 'draft'): TaskListItem | null => {
  const schedule = buildScheduleFromDraft(draft);
  if (!schedule) {
    return null;
  }
  return {
    id,
    name: draft.name || 'Новая задача',
    priority: draft.priority,
    status: draft.status,
    assigneeId: draft.assigneeId,
    description: draft.description,
    schedule,
    relation: buildRelationFromDraft(draft)
  };
};

const mapTaskToDraft = (task: TaskListItem): TaskDraft => {
  const draft: TaskDraft = {
    name: task.name,
    priority: task.priority,
    status: task.status,
    assigneeId: task.assigneeId,
    description: task.description,
    scheduleType: task.schedule.type,
    dueDate: '',
    startDate: '',
    endDate: '',
    durationDays: '',
    predecessorId: null,
    relationType: task.relation.type,
    relatedSystemId:
      task.relation.type === 'system'
        ? task.relation.targetId ?? systemOptions[0]?.value ?? null
        : systemOptions[0]?.value ?? null,
    relatedInitiativeId:
      task.relation.type === 'initiative'
        ? task.relation.targetId ?? initiativeOptions[0]?.value ?? null
        : initiativeOptions[0]?.value ?? null
  };

  switch (task.schedule.type) {
    case 'due-date':
      draft.dueDate = task.schedule.dueDate;
      break;
    case 'start-duration':
      draft.startDate = task.schedule.startDate;
      draft.durationDays = String(task.schedule.durationDays);
      break;
    case 'date-range':
      draft.startDate = task.schedule.startDate;
      draft.endDate = task.schedule.endDate;
      break;
    case 'after-task':
      draft.predecessorId = task.schedule.predecessorId;
      draft.durationDays = String(task.schedule.durationDays);
      break;
    default:
      break;
  }

  return draft;
};

const viewTabs = [
  { label: 'Дорожка загрузки', value: 'timeline' },
  { label: 'Постановка задач', value: 'planner' }
] as const;

type ViewTab = (typeof viewTabs)[number];

type TimelineScale = TimelineScaleTab['value'];

const timelineModeTabs = [
  { label: 'Задачи сотрудников', value: 'tasks' },
  { label: 'Инициативы', value: 'initiatives' }
] as const;

type TimelineMode = (typeof timelineModeTabs)[number];

const EmployeeWorkloadTrack: React.FC = () => {
  const [scale, setScale] = useState<TimelineScaleTab>(timelineScaleTabs[1]);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>(timelineModeTabs[0]);
  const initialStoredTasks = useMemo(() => loadStoredTasks() ?? initialTaskList, []);

  const [tasks, setTasks] = useState<TaskListItem[]>(initialStoredTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialStoredTasks[0]?.id ?? null
  );
  const [activeView, setActiveView] = useState<ViewTab>(viewTabs[0]);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>(defaultTaskDraft);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const taskMap = useMemo(() => {
    const map = new Map<string, TaskListItem>();
    tasks.forEach((task) => {
      map.set(task.id, task);
    });
    return map;
  }, [tasks]);

  const teamTaskWindows = useMemo(() => {
    const windows = new Map<string, TaskScheduleWindow>();
    tasks.forEach((task) => {
      const window = resolveTaskScheduleWindow(task, taskMap);
      if (window) {
        windows.set(task.id, window);
      }
    });
    return windows;
  }, [taskMap, tasks]);

  useEffect(() => {
    persistStoredTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    if (tasks.length === 0) {
      if (selectedTaskId !== null) {
        setSelectedTaskId(null);
      }
      return;
    }

    if (!tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0]?.id ?? null);
    }
  }, [selectedTaskId, tasks]);

  const teamTimelineTasksByEmployee = useMemo(() => {
    const map = new Map<string, WorkloadTask[]>();
    tasks.forEach((task) => {
      if (!task.assigneeId) {
        return;
      }
      const window = teamTaskWindows.get(task.id);
      if (!window) {
        return;
      }
      const relationInitiativeId =
        task.relation.type === 'initiative' ? task.relation.targetId ?? undefined : undefined;
      const entry = map.get(task.assigneeId) ?? [];
      entry.push({
        id: task.id,
        name: task.name,
        start: formatIsoDate(window.start),
        end: formatIsoDate(window.end),
        initiativeId: relationInitiativeId,
        kind: 'project',
        badge: 'Команда',
        description: task.description
      });
      map.set(task.assigneeId, entry);
    });

    map.forEach((list) => {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });

    return map;
  }, [tasks, teamTaskWindows]);

  const baseStart = useMemo(() => {
    const now = new Date();
    return startOfDay(new Date(now.getFullYear(), 0, 1));
  }, []);

  const timelineDateTasks = useMemo(() => {
    const projectTasks = mockEmployees.flatMap((employee) =>
      employee.tasks.map((task) => ({
        start: startOfDay(toDate(task.start)),
        end: startOfDay(toDate(task.end))
      }))
    );

    const teamTasks = Array.from(teamTaskWindows.values()).map((window) => ({
      start: startOfDay(window.start),
      end: startOfDay(window.end)
    }));

    return [...projectTasks, ...teamTasks];
  }, [teamTaskWindows]);

  const minTaskStart = useMemo(() => {
    if (timelineDateTasks.length === 0) {
      return baseStart;
    }
    return timelineDateTasks.reduce((min, task) => (task.start < min ? task.start : min), timelineDateTasks[0].start);
  }, [baseStart, timelineDateTasks]);

  const maxTaskEnd = useMemo(() => {
    if (timelineDateTasks.length === 0) {
      return baseStart;
    }
    return timelineDateTasks.reduce((max, task) => (task.end > max ? task.end : max), timelineDateTasks[0].end);
  }, [baseStart, timelineDateTasks]);

  const periodOptions = useMemo(
    () => ({
      week: buildWeekOptions(baseStart, minTaskStart, maxTaskEnd),
      month: buildMonthOptions(baseStart, minTaskStart, maxTaskEnd),
      year: buildYearOptions(baseStart, minTaskStart, maxTaskEnd)
    }),
    [baseStart, maxTaskEnd, minTaskStart]
  );

  const [selectedPeriods, setSelectedPeriods] = useState<Record<TimelineScale, string | null>>(() => {
    const now = new Date();
    return {
      week: findPeriodContainingDate(periodOptions.week, now)?.value ?? periodOptions.week[0]?.value ?? null,
      month:
        findPeriodContainingDate(periodOptions.month, now)?.value ?? periodOptions.month[0]?.value ?? null,
      year: findPeriodContainingDate(periodOptions.year, now)?.value ?? periodOptions.year[0]?.value ?? null
    };
  });
  const [activeTimelineTaskId, setActiveTimelineTaskId] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    setSelectedPeriods((prev) => ({
      week:
        prev.week && periodOptions.week.some((option) => option.value === prev.week)
          ? prev.week
          : findPeriodContainingDate(periodOptions.week, now)?.value ?? periodOptions.week[0]?.value ?? null,
      month:
        prev.month && periodOptions.month.some((option) => option.value === prev.month)
          ? prev.month
          : findPeriodContainingDate(periodOptions.month, now)?.value ?? periodOptions.month[0]?.value ?? null,
      year:
        prev.year && periodOptions.year.some((option) => option.value === prev.year)
          ? prev.year
          : findPeriodContainingDate(periodOptions.year, now)?.value ?? periodOptions.year[0]?.value ?? null
    }));
  }, [periodOptions]);

  const currentPeriodOptions = periodOptions[scale.value];
  const selectedPeriodValue = selectedPeriods[scale.value];
  const activePeriod = currentPeriodOptions.find((option) => option.value === selectedPeriodValue) ?? null;
  const displayedPeriod = activePeriod ?? currentPeriodOptions[0] ?? null;
  const resolvedViewRange = displayedPeriod
    ? { start: displayedPeriod.start, end: displayedPeriod.end }
    : undefined;

  const timelineData = useMemo(() => {
    const taskLookup = new Map<string, { task: WorkloadTask; employee: EmployeeWorkload }>();

    const rows = mockEmployees.map((employee) => {
      const sortedTasks = employee.tasks
        .slice()
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      const baseTasks = sortedTasks.map((task) => ({
        id: task.id,
        name: task.name,
        start: task.start,
        end: task.end,
        initiativeId: task.initiativeId,
        kind: task.kind,
        badge: task.badge,
        description: task.description
      }));

      const teamTasks = teamTimelineTasksByEmployee.get(employee.id) ?? [];

      const mergedTasks =
        timelineMode.value === 'initiatives'
          ? mergeInitiativeTasks([...baseTasks, ...teamTasks])
          : [...baseTasks, ...teamTasks].sort(
              (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
            );

      mergedTasks.forEach((task) => {
        taskLookup.set(task.id, { task, employee });
      });

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

      return { id: employee.id, sidebar, tasks: mergedTasks };
    });

    return { timelineRows: rows, timelineTaskLookup: taskLookup };
  }, [mergeInitiativeTasks, teamTimelineTasksByEmployee, timelineMode.value]);

  const timelineTaskLookup = timelineData.timelineTaskLookup;
  const timelineRows = timelineData.timelineRows;

  useEffect(() => {
    if (activeTimelineTaskId && !timelineTaskLookup.has(activeTimelineTaskId)) {
      setActiveTimelineTaskId(null);
    }
  }, [activeTimelineTaskId, timelineTaskLookup]);

  const activeTimelineTask = activeTimelineTaskId
    ? timelineTaskLookup.get(activeTimelineTaskId) ?? null
    : null;

  const handleTimelineTaskClick = useCallback(
    ({ task }: { rowId: string; task: GanttTimelineTask }) => {
      setActiveTimelineTaskId(task.id);
    },
    []
  );

  const handleClearTimelineTask = useCallback(() => {
    setActiveTimelineTaskId(null);
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

  const systemNameMap = useMemo<Record<string, string>>(() => {
    return systemOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.value] = option.label;
      return acc;
    }, {});
  }, []);

  const initiativeNameMap = useMemo<Record<string, string>>(() => {
    return initiativeOptions.reduce<Record<string, string>>((acc, option) => {
      acc[option.value] = option.label;
      return acc;
    }, {});
  }, []);

  const mergeInitiativeTasks = useCallback(
    (tasks: WorkloadTask[]): WorkloadTask[] => {
      const tasksWithInitiative = tasks.filter((task) => task.initiativeId);
      const tasksWithoutInitiative = tasks.filter((task) => !task.initiativeId);
      const groupedTasks = new Map<string, WorkloadTask[]>();

      tasksWithInitiative.forEach((task) => {
        const list = groupedTasks.get(task.initiativeId ?? '') ?? [];
        list.push(task);
        groupedTasks.set(task.initiativeId ?? '', list);
      });

      const mergedSegments: WorkloadTask[] = [];

      groupedTasks.forEach((list, initiativeId) => {
        const sorted = list
          .slice()
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        let currentStart = startOfDay(toDate(sorted[0].start));
        let currentEnd = startOfDay(toDate(sorted[0].end));
        let segmentIndex = 0;
        let segmentNames = [sorted[0].name];

        const pushSegment = () => {
          const initiativeLabel = initiativeNameMap[initiativeId] ?? 'Инициатива';
          mergedSegments.push({
            id: `${initiativeId}-segment-${segmentIndex}`,
            name: initiativeLabel,
            start: formatIsoDate(currentStart),
            end: formatIsoDate(currentEnd),
            initiativeId,
            kind: 'project',
            badge: initiativeLabel,
            description: `Задачи: ${segmentNames.join(', ')}`
          });
        };

        for (let index = 1; index < sorted.length; index += 1) {
          const task = sorted[index];
          const taskStart = startOfDay(toDate(task.start));
          const taskEnd = startOfDay(toDate(task.end));
          const isContinuous = taskStart.getTime() <= addDays(currentEnd, 1).getTime();

          if (isContinuous) {
            if (taskEnd.getTime() > currentEnd.getTime()) {
              currentEnd = taskEnd;
            }
            segmentNames.push(task.name);
          } else {
            pushSegment();
            segmentIndex += 1;
            currentStart = taskStart;
            currentEnd = taskEnd;
            segmentNames = [task.name];
          }
        }

        pushSegment();
      });

      return [...mergedSegments, ...tasksWithoutInitiative].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
    },
    [initiativeNameMap]
  );

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task.id === selectedTaskId) ?? null;
  }, [selectedTaskId, tasks]);

  const taskNameLookup = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((task) => {
      map.set(task.id, task.name);
    });
    return map;
  }, [tasks]);

  const draftPreviewTask = useMemo(() => {
    return createPreviewTaskFromDraft(taskDraft, editingTaskId ?? 'draft-task');
  }, [editingTaskId, taskDraft]);

  const predecessorOptions = useMemo<SelectOption<string>[]>(() => {
    return tasks
      .filter((task) => task.id !== editingTaskId)
      .map((task) => ({ label: task.name, value: task.id }));
  }, [editingTaskId, tasks]);

  const calculateParallelTasks = useCallback(
    (assigneeId: string, referenceTask: TaskListItem) => {
      const dueDate =
        teamTaskWindows.get(referenceTask.id)?.end ?? getScheduleDueDate(referenceTask.schedule);
      const employee = mockEmployees.find((item) => item.id === assigneeId);

      const overlappingProjectTasks = (() => {
        if (!employee || !dueDate) {
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
        const compareDate = teamTaskWindows.get(task.id)?.end ?? getScheduleDueDate(task.schedule);
        if (!dueDate || !compareDate) {
          return true;
        }
        return compareDate.getTime() === dueDate.getTime();
      }).length;

      return overlappingProjectTasks + overlappingTeamTasks;
    },
    [tasks, teamTaskWindows]
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

  const getAssigneeRenderItem = useCallback(
    (
      contextTask: TaskListItem | null,
      previewTask: TaskListItem | null
    ): SelectProps<SelectOption<string>>['renderItem'] => {
      // eslint-disable-next-line react/display-name
      return ({ item, active, hovered, onMouseEnter, onClick, ref }) => {
        const referenceTask = contextTask ?? previewTask;
        const loadLevel = referenceTask
          ? getAssigneeLoadLevel(item.value, referenceTask)
          : 'free';

        return (
          <div
            ref={ref}
            className={styles.assigneeOption}
            data-active={active ? 'true' : 'false'}
            data-hovered={hovered ? 'true' : 'false'}
            onMouseEnter={onMouseEnter}
            onClick={(event) => {
              onClick(event);
            }}
          >
            <div className={styles.assigneeOptionContent}>
              <span className={styles.assigneeIndicator} data-level={loadLevel ?? 'free'} />
              <Text size="xs" weight="semibold">{item.label}</Text>
            </div>
          </div>
        );
      };
    },
    [getAssigneeLoadLevel]
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
    const trimmedName = taskDraft.name.trim();
    if (!trimmedName) {
      setFormError('Укажите наименование задачи.');
      return;
    }

    const schedule = buildScheduleFromDraft(taskDraft);
    if (!schedule) {
      switch (taskDraft.scheduleType) {
        case 'due-date':
          setFormError('Укажите дату, к которой нужно выполнить задачу.');
          break;
        case 'start-duration':
          setFormError('Укажите дату начала и корректный срок реализации.');
          break;
        case 'date-range':
          setFormError('Укажите корректный период выполнения задачи.');
          break;
        case 'after-task':
          setFormError('Выберите связанную задачу и срок реализации после неё.');
          break;
        default:
          setFormError('Заполните параметры планирования задачи.');
      }
      return;
    }

    if (schedule.type === 'after-task' && editingTaskId && schedule.predecessorId === editingTaskId) {
      setFormError('Связанная задача не может совпадать с редактируемой.');
      return;
    }

    if (taskDraft.relationType === 'system' && !taskDraft.relatedSystemId) {
      setFormError('Выберите систему, к которой относится задача.');
      return;
    }

    if (taskDraft.relationType === 'initiative' && !taskDraft.relatedInitiativeId) {
      setFormError('Выберите инициативу, к которой относится задача.');
      return;
    }

    const relation = buildRelationFromDraft(taskDraft);
    const taskId = editingTaskId ?? `team-task-${Date.now()}`;
    const normalizedDescription =
      taskDraft.description.trim() || 'Описание будет добавлено позже.';

    const nextTask: TaskListItem = {
      id: taskId,
      name: trimmedName,
      priority: taskDraft.priority,
      status: taskDraft.status,
      assigneeId: taskDraft.assigneeId,
      description: normalizedDescription,
      schedule,
      relation
    };

    setTasks((prev) =>
      editingTaskId
        ? prev.map((task) => (task.id === editingTaskId ? nextTask : task))
        : [nextTask, ...prev]
    );
    setTaskDraft(() => ({ ...defaultTaskDraft }));
    setEditingTaskId(null);
    setFormError(null);
    setSelectedTaskId(taskId);
  }, [editingTaskId, taskDraft]);

  const handleEditTask = useCallback(
    (task: TaskListItem) => {
      setTaskDraft(mapTaskToDraft(task));
      setEditingTaskId(task.id);
      setFormError(null);
      if (activeView.value !== 'planner') {
        setActiveView(viewTabs[1]);
      }
    },
    [activeView.value, setActiveView]
  );

  const handleCancelEdit = useCallback(() => {
    setTaskDraft(() => ({ ...defaultTaskDraft }));
    setEditingTaskId(null);
    setFormError(null);
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.viewTabs}>
        <Tabs<ViewTab>
          size="s"
          items={viewTabs}
          value={activeView}
          getItemLabel={(item) => item.label}
          getItemKey={(item) => item.value}
          onChange={setActiveView}
        />
      </div>
      {activeView.value === 'planner' ? (
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
              className={styles.fullWidthField}
              value={taskDraft.name}
              onChange={(value) => {
                setTaskDraft((prev) => ({
                  ...prev,
                  name: value ?? ''
                }));
              }}
            />
            <Select<SelectOption<TaskScheduleType>>
              size="s"
              className={styles.fullWidthField}
              label="Планирование"
              items={scheduleTypeOptions}
              value={
                scheduleTypeOptions.find((item) => item.value === taskDraft.scheduleType) ?? null
              }
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              onChange={(option) => {
                setTaskDraft((prev) => {
                  const nextType = option?.value ?? prev.scheduleType;
                  if (nextType === prev.scheduleType) {
                    return prev;
                  }
                  return {
                    ...prev,
                    scheduleType: nextType,
                    dueDate: '',
                    startDate: '',
                    endDate: '',
                    durationDays: '',
                    predecessorId: null
                  };
                });
              }}
            />
            {taskDraft.scheduleType === 'due-date' && (
              <TextField
                size="s"
                type="date"
                label="Срок до"
                value={taskDraft.dueDate}
                onChange={(value) => {
                  setTaskDraft((prev) => ({
                    ...prev,
                    dueDate: value ?? ''
                  }));
                }}
              />
            )}
            {taskDraft.scheduleType === 'start-duration' && (
              <>
                <TextField
                  size="s"
                  type="date"
                  label="Дата начала"
                  value={taskDraft.startDate}
                  onChange={(value) => {
                    setTaskDraft((prev) => ({
                      ...prev,
                      startDate: value ?? ''
                    }));
                  }}
                />
                <TextField
                  size="s"
                  type="number"
                  label="Срок, дни"
                  value={taskDraft.durationDays}
                  min={1}
                  onChange={(value) => {
                    setTaskDraft((prev) => ({
                      ...prev,
                      durationDays: value ?? ''
                    }));
                  }}
                />
              </>
            )}
            {taskDraft.scheduleType === 'date-range' && (
              <>
                <TextField
                  size="s"
                  type="date"
                  label="Дата начала"
                  value={taskDraft.startDate}
                  onChange={(value) => {
                    setTaskDraft((prev) => ({
                      ...prev,
                      startDate: value ?? ''
                    }));
                  }}
                />
                <TextField
                  size="s"
                  type="date"
                  label="Дата окончания"
                  value={taskDraft.endDate}
                  onChange={(value) => {
                    setTaskDraft((prev) => ({
                      ...prev,
                      endDate: value ?? ''
                    }));
                  }}
                />
              </>
            )}
            {taskDraft.scheduleType === 'after-task' && (
              <>
                <Select<SelectOption<string>>
                  size="s"
                  label="Связанная задача"
                  placeholder="Выберите задачу"
                  items={predecessorOptions}
                  value={
                    taskDraft.predecessorId
                      ? predecessorOptions.find((option) => option.value === taskDraft.predecessorId) ?? null
                      : null
                  }
                  getItemLabel={(item) => item.label}
                  getItemKey={(item) => item.value}
                  onChange={(option) => {
                    setTaskDraft((prev) => ({
                      ...prev,
                      predecessorId: option?.value ?? null
                    }));
                  }}
                />
                <TextField
                  size="s"
                  type="number"
                  label="Срок после, дни"
                  value={taskDraft.durationDays}
                  min={1}
                  onChange={(value) => {
                    setTaskDraft((prev) => ({
                      ...prev,
                      durationDays: value ?? ''
                    }));
                  }}
                />
              </>
            )}
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
              className={styles.fullWidthField}
              items={assigneeOptions}
              value={
                taskDraft.assigneeId
                  ? assigneeOptions.find((option) => option.value === taskDraft.assigneeId) ?? null
                  : null
              }
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              renderItem={getAssigneeRenderItem(draftPreviewTask, draftPreviewTask)}
              onChange={(option) => {
                setTaskDraft((prev) => ({
                  ...prev,
                  assigneeId: option?.value ?? null
                }));
              }}
            />
            <Select<SelectOption<TaskRelationType>>
              size="s"
              label="Контекст задачи"
              className={styles.fullWidthField}
              items={relationTypeOptions}
              value={
                relationTypeOptions.find((item) => item.value === taskDraft.relationType) ?? null
              }
              getItemLabel={(item) => item.label}
              getItemKey={(item) => item.value}
              onChange={(option) => {
                setTaskDraft((prev) => {
                  const nextType = option?.value ?? prev.relationType;
                  return {
                    ...prev,
                    relationType: nextType,
                    relatedSystemId:
                      nextType === 'system'
                        ? prev.relatedSystemId ?? systemOptions[0]?.value ?? null
                        : prev.relatedSystemId,
                    relatedInitiativeId:
                      nextType === 'initiative'
                        ? prev.relatedInitiativeId ?? initiativeOptions[0]?.value ?? null
                        : prev.relatedInitiativeId
                  };
                });
              }}
            />
            {taskDraft.relationType === 'system' && (
              <Select<SelectOption<string>>
                size="s"
                label="Система"
                items={systemOptions}
                value={
                  taskDraft.relatedSystemId
                    ? systemOptions.find((option) => option.value === taskDraft.relatedSystemId) ?? null
                    : null
                }
                getItemLabel={(item) => item.label}
                getItemKey={(item) => item.value}
                onChange={(option) => {
                  setTaskDraft((prev) => ({
                    ...prev,
                    relatedSystemId: option?.value ?? null
                  }));
                }}
              />
            )}
            {taskDraft.relationType === 'initiative' && (
              <Select<SelectOption<string>>
                size="s"
                label="Инициатива"
                items={initiativeOptions}
                value={
                  taskDraft.relatedInitiativeId
                    ? initiativeOptions.find((option) => option.value === taskDraft.relatedInitiativeId) ?? null
                    : null
                }
                getItemLabel={(item) => item.label}
                getItemKey={(item) => item.value}
                onChange={(option) => {
                  setTaskDraft((prev) => ({
                    ...prev,
                    relatedInitiativeId: option?.value ?? null
                  }));
                }}
              />
            )}
          </div>
          <TextField
            size="s"
            label="Описание"
            type="textarea"
            rows={3}
            placeholder="Кратко опишите ожидаемый результат"
            value={taskDraft.description}
            onChange={(value) => {
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
            {editingTaskId && (
              <Button
                type="button"
                size="s"
                view="secondary"
                label="Отменить"
                onClick={handleCancelEdit}
              />
            )}
            <Button
              type="submit"
              size="s"
              view="primary"
              label={editingTaskId ? 'Сохранить изменения' : 'Добавить задачу'}
            />
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
              Планирование
            </Text>
            <Text size="2xs" view="secondary">
              Статус
            </Text>
            <Text size="2xs" view="secondary">
              Исполнители
            </Text>
            <Text size="2xs" view="secondary">
              Контекст
            </Text>
          </div>
          {tasks.map((task) => {
            const priorityBadge = priorityBadges[task.priority];
            const statusBadge = statusBadges[task.status];
            const assigneeName = task.assigneeId ? employeeNameMap[task.assigneeId] : null;
            const loadLevel = task.assigneeId ? getAssigneeLoadLevel(task.assigneeId, task) : null;
            const scheduleSummary = formatScheduleSummary(task, taskNameLookup);
            const relationSummary = getRelationSummary(task.relation, {
              systems: systemNameMap,
              initiatives: initiativeNameMap
            });

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
                  {scheduleSummary}
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
                    renderItem={getAssigneeRenderItem(task, null)}
                    onChange={(option) => {
                      handleAssignTask(task.id, option?.value ?? null);
                    }}
                  />
                )}
                <Text size="xs" view="secondary" className={styles.taskContextCell}>
                  {relationSummary}
                </Text>
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
                {formatScheduleDetails(selectedTask, taskNameLookup)}
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
              {getRelationSummary(selectedTask.relation, {
                systems: systemNameMap,
                initiatives: initiativeNameMap
              })}
            </Text>
            <Text size="xs" view="secondary">
              {selectedTask.description}
            </Text>
            <div className={styles.taskDetailsActions}>
              <Button
                size="xs"
                view="secondary"
                label={editingTaskId === selectedTask.id ? 'Редактирование открыто' : 'Редактировать'}
                disabled={editingTaskId === selectedTask.id}
                onClick={() => {
                  handleEditTask(selectedTask);
                }}
              />
            </div>
          </div>
        )}
        </Card>
      ) : (
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
        <div className={styles.headerControls}>
          <Tabs<TimelineMode>
            size="s"
            items={timelineModeTabs}
            value={timelineMode}
            getItemLabel={(item) => item.label}
            getItemKey={(item) => item.value}
            onChange={setTimelineMode}
          />
          <Tabs<TimelineScaleTab>
            size="s"
            items={timelineScaleTabs}
            value={scale}
            getItemLabel={(item) => item.label}
            getItemKey={(item) => item.value}
            onChange={setScale}
          />
          <Select<PeriodOption>
            size="s"
            className={styles.periodSelect}
            label="Период"
            placeholder="Выберите период"
            items={currentPeriodOptions}
            value={displayedPeriod ?? null}
            getItemLabel={(item) => item.label}
            getItemKey={(item) => item.value}
          onChange={(option) =>
            setSelectedPeriods((prev) => ({
              ...prev,
              [scale.value]: option?.value ?? null
            }))
          }
          disabled={currentPeriodOptions.length === 0}
        />
      </div>
    </header>
      <Text size="xs" view="secondary">
        {timelineMode.value === 'initiatives'
          ? 'Задачи объединены по инициативам и показываются едиными полосами, если периоды идут без разрывов.'
          : 'Показаны все задачи сотрудников в разрезе проектов и активности команды.'}
      </Text>
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
      <div className={styles.timelineLayout}>
        <div className={styles.timelineChart}>
          <GanttTimeline
            axisLabel="Сотрудник"
            scale={scale.value}
            rows={timelineRows}
            viewRange={resolvedViewRange}
            onTaskClick={handleTimelineTaskClick}
            selectedTaskId={activeTimelineTaskId}
          />
        </div>
        <aside className={styles.timelineDetails}>
          {activeTimelineTask ? (
            <>
              <div className={styles.timelineDetailsHeader}>
                <Text size="s" weight="semibold">
                  {activeTimelineTask.task.name}
                </Text>
                <Button
                  size="xs"
                  view="ghost"
                  label="Очистить"
                  onClick={handleClearTimelineTask}
                />
              </div>
              <div className={styles.timelineDetailsMeta}>
                <Badge
                  size="xs"
                  status={workloadBadgeStatuses[activeTimelineTask.task.kind]}
                  label={activeTimelineTask.task.badge}
                />
                <Text size="xs" view="secondary">
                  {formatTimelineTaskPeriod(activeTimelineTask.task.start, activeTimelineTask.task.end)}
                </Text>
              </div>
              <div className={styles.timelineDetailsEmployee}>
                <Text size="2xs" view="secondary">
                  Сотрудник
                </Text>
                <Text size="s" weight="semibold">
                  {activeTimelineTask.employee.fullName}
                </Text>
                <Text size="xs" view="secondary">
                  {activeTimelineTask.employee.position}
                </Text>
              </div>
              <div className={styles.timelineDetailsStats}>
                <Text size="2xs" view="secondary">
                  Загруженность: {Math.round(activeTimelineTask.employee.workload * 100)}%
                </Text>
                <Text size="2xs" view="secondary">
                  {activeTimelineTask.employee.availability}
                </Text>
              </div>
              <Text size="xs" view="secondary">
                {activeTimelineTask.employee.focus}
              </Text>
              <Text size="xs">
                {activeTimelineTask.task.description ?? 'Описание не добавлено'}
              </Text>
            </>
          ) : (
            <div className={styles.timelineDetailsEmpty}>
              <Text size="s" view="secondary">
                Выберите задачу на дорожной карте, чтобы увидеть подробности
              </Text>
            </div>
          )}
        </aside>
      </div>
        </Card>
      )}
    </div>
  );
};

export default EmployeeWorkloadTrack;
