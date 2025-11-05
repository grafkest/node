import { Badge } from '@consta/uikit/Badge';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import React, { useMemo, useState } from 'react';
import type { TeamRole } from '../data';
import GanttTimeline, {
  type GanttTimelineRow,
  type GanttTimelineTask,
  timelineScaleTabs,
  type TimelineScaleTab
} from './GanttTimeline';
import cardStyles from './EmployeeWorkloadTrack.module.css';
import styles from './InitiativeGanttChart.module.css';

export type InitiativeGanttDependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export type InitiativeGanttDependency = {
  id: string;
  type: InitiativeGanttDependencyType;
  lag?: number;
  lagUnit?: 'hours' | 'days';
};

export type InitiativeGanttBlockerScope = 'task' | 'work' | 'project';

export type InitiativeGanttBlocker = {
  id: string;
  scope: InitiativeGanttBlockerScope;
  reason: string;
  createdBy?: string;
  active: boolean;
};

export type InitiativeGanttResource = {
  id: string;
  name: string;
  role: TeamRole;
  units?: number;
  capacityHoursPerWeek?: number;
  calendarId?: string;
  skills?: string[];
};

export type InitiativeGanttTask = {
  id: string;
  name: string;
  role: TeamRole;
  effortDays: number;
  startDay: number;
  durationDays: number;
  projectId?: string;
  projectName?: string;
  workId?: string;
  workName?: string;
  parentTaskId?: string;
  effortHours?: number;
  minUnits?: number;
  maxUnits?: number;
  canSplit?: boolean;
  parallelAllowed?: boolean;
  durationMode?: 'fixed-effort' | 'fixed-duration';
  constraints?: string[];
  calendarId?: string;
  priority?: number;
  wipLimitTag?: string;
  scenarioBranch?: string;
  type?: 'task' | 'buffer';
  assignedExpert?: string;
  resources?: InitiativeGanttResource[];
  dependencies?: InitiativeGanttDependency[];
  blockers?: InitiativeGanttBlocker[];
};

type InitiativeGanttChartProps = {
  tasks: InitiativeGanttTask[];
};

type InitiativeTimelineGroup = {
  id: string;
  displayName: string;
  isUnassigned: boolean;
  roles: Set<string>;
  workNames: Set<string>;
  projectNames: Set<string>;
  tasks: GanttTimelineTask[];
  totalEffort: number;
  blockers: string[];
};

const addDays = (date: Date, amount: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const InitiativeGanttChart: React.FC<InitiativeGanttChartProps> = ({ tasks }) => {
  const [scale, setScale] = useState<TimelineScaleTab>(timelineScaleTabs[1]);

  const groups = useMemo(() => {
    if (tasks.length === 0) {
      return [] as InitiativeTimelineGroup[];
    }

    const referenceStart = new Date(Date.UTC(2024, 0, 1));
    const map = new Map<string, InitiativeTimelineGroup>();

    tasks.forEach((task) => {
      const roleKey = task.role ?? 'other';
      const key = task.assignedExpert ? `expert:${task.assignedExpert}` : `role:${roleKey}`;
      const displayName = task.assignedExpert ?? (task.role ? `Роль ${task.role}` : 'Исполнитель не назначен');
      const existing = map.get(key);
      const group: InitiativeTimelineGroup =
        existing ?? {
          id: key,
          displayName,
          isUnassigned: !task.assignedExpert,
          roles: new Set(),
          workNames: new Set(),
          projectNames: new Set(),
          tasks: [],
          totalEffort: 0,
          blockers: []
        };

      group.roles.add(task.role);
      if (task.workName) {
        group.workNames.add(task.workName);
      }
      if (task.projectName) {
        group.projectNames.add(task.projectName);
      }
      if (task.blockers) {
        task.blockers
          .filter((blocker) => blocker.active)
          .forEach((blocker) => {
            group.blockers.push(`Блокер: ${blocker.reason}`);
          });
      }

      const normalizedDuration = Math.max(1, Math.round(task.durationDays));
      const startDate = addDays(referenceStart, Math.max(0, Math.round(task.startDay)));
      const endDate = addDays(startDate, normalizedDuration - 1);
      const details: string[] = [];
      if (task.role) {
        details.push(`Роль: ${task.role}`);
      }
      if (task.workName) {
        details.push(`Работа: ${task.workName}`);
      }
      if (typeof task.effortDays === 'number') {
        details.push(`Трудозатраты: ${task.effortDays} дн.`);
      }
      if (!task.assignedExpert) {
        details.push('Нужен исполнитель');
      }

      const timelineTask: GanttTimelineTask = {
        id: task.id,
        name: task.name,
        start: startDate,
        end: endDate,
        kind: 'project',
        badge: task.projectName ?? 'Проект',
        description: details.join(' · ') || undefined
      };

      group.tasks.push(timelineTask);
      group.totalEffort += task.effortDays ?? 0;

      if (!existing) {
        map.set(key, group);
      }
    });

    const result = Array.from(map.values());

    result.forEach((group) => {
      group.tasks.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    });

    return result.sort((a, b) => {
      if (a.isUnassigned !== b.isUnassigned) {
        return a.isUnassigned ? 1 : -1;
      }
      return a.displayName.localeCompare(b.displayName, 'ru');
    });
  }, [tasks]);

  const timelineRows = useMemo<GanttTimelineRow[]>(() => {
    return groups.map((group) => {
      const roles = Array.from(group.roles)
        .filter(Boolean)
        .join(', ');
      const works = Array.from(group.workNames)
        .filter(Boolean)
        .join(', ');

      const sidebar = (
        <div className={cardStyles.employeeCell}>
          <div className={cardStyles.employeeMeta}>
            <Badge
              size="xs"
              status={group.isUnassigned ? 'warning' : 'system'}
              label={group.isUnassigned ? 'Не назначено' : 'Назначено'}
            />
            <Text size="s" weight="semibold">
              {group.displayName}
            </Text>
          </div>
          {roles && (
            <Text size="xs" view="secondary">
              {roles}
            </Text>
          )}
          <div className={cardStyles.employeeStats}>
            <div className={cardStyles.employeeStatItem}>
              <Text size="2xs" view="secondary">
                Задачи
              </Text>
              <Text size="xs" weight="semibold">
                {group.tasks.length}
              </Text>
            </div>
            {group.totalEffort > 0 && (
              <div className={cardStyles.employeeStatItem}>
                <Text size="2xs" view="secondary">
                  Трудозатраты
                </Text>
                <Text size="xs" weight="semibold">
                  {group.totalEffort} дн.
                </Text>
              </div>
            )}
          </div>
          {works && (
            <Text size="2xs" view="secondary">
              Работы: {works}
            </Text>
          )}
          {group.projectNames.size > 0 && (
            <Text size="2xs" view="secondary">
              Проекты: {Array.from(group.projectNames).join(', ')}
            </Text>
          )}
          {group.blockers.slice(0, 2).map((blocker) => (
            <Text key={blocker} size="2xs" view="alert">
              {blocker}
            </Text>
          ))}
        </div>
      );

      return { id: group.id, sidebar, tasks: group.tasks };
    });
  }, [groups]);

  if (tasks.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text size="s" view="secondary">
          План работ пока не заполнен. Добавьте задачи, чтобы увидеть диаграмму Ганта.
        </Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInfo}>
          <Text size="s" weight="semibold">
            План загрузки по инициативе
          </Text>
          <div className={styles.summary}>
            <Text size="xs" view="secondary">
              Исполнители: {groups.length}
            </Text>
            <Text size="xs" view="secondary">
              Задачи: {tasks.length}
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
      <GanttTimeline axisLabel="Исполнитель" scale={scale.value} rows={timelineRows} />
    </div>
  );
};

export default InitiativeGanttChart;
