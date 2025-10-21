import { Badge } from '@consta/uikit/Badge';
import { Checkbox } from '@consta/uikit/Checkbox';
import { Text } from '@consta/uikit/Text';
import React, { useMemo } from 'react';
import type { TeamRole } from '../data';
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

type TimelineRow = {
  id: string;
  type: 'project' | 'work' | 'task' | 'subtask';
  name: string;
  level: number;
  effortDays?: number;
  startDay: number;
  durationDays: number;
  role?: TeamRole;
  minUnits?: number;
  maxUnits?: number;
  canSplit?: boolean;
  parallelAllowed?: boolean;
  durationMode?: 'fixed-effort' | 'fixed-duration';
  constraints?: string[];
  priority?: number;
  wipLimitTag?: string;
  scenarioBranch?: string;
  typeTag?: 'task' | 'buffer';
  assignedExpert?: string;
  resources?: InitiativeGanttResource[];
  dependencies?: InitiativeGanttDependency[];
  blockers?: InitiativeGanttBlocker[];
  childIds?: string[];
};

const MIN_COLUMN_COUNT = 8;

const InitiativeGanttChart: React.FC<InitiativeGanttChartProps> = ({ tasks }) => {
  const { rows, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      return { rows: [] as TimelineRow[], totalDays: MIN_COLUMN_COUNT };
    }

    const projects = new Map<string, { id: string; name: string; workIds: Set<string> }>();
    const works = new Map<
      string,
      {
        id: string;
        name: string;
        projectId: string;
        role?: TeamRole;
        tasks: InitiativeGanttTask[];
      }
    >();
    const taskIndex = new Map<string, InitiativeGanttTask>();

    tasks.forEach((task) => {
      const projectId = task.projectId ?? 'default-project';
      const projectName = task.projectName ?? 'Проект';
      if (!projects.has(projectId)) {
        projects.set(projectId, { id: projectId, name: projectName, workIds: new Set() });
      }
      const workId = task.workId ?? `${projectId}-work-${task.role}`;
      const workName = task.workName ?? task.role;
      projects.get(projectId)?.workIds.add(workId);
      if (!works.has(workId)) {
        works.set(workId, {
          id: workId,
          name: workName,
          projectId,
          role: task.role,
          tasks: []
        });
      }
      works.get(workId)?.tasks.push(task);
      taskIndex.set(task.id, task);
    });

    const rows: TimelineRow[] = [];

    projects.forEach((project) => {
      const projectTasks = Array.from(project.workIds).flatMap((workId) => works.get(workId)?.tasks ?? []);
      const projectStart = projectTasks.reduce((min, item) => Math.min(min, item.startDay), Infinity);
      const projectEnd = projectTasks.reduce(
        (max, item) => Math.max(max, item.startDay + item.durationDays),
        -Infinity
      );
      rows.push({
        id: project.id,
        type: 'project',
        name: project.name,
        level: 0,
        startDay: projectStart === Infinity ? 0 : projectStart,
        durationDays: projectEnd === -Infinity ? 1 : Math.max(1, projectEnd - projectStart),
        constraints: projectTasks.flatMap((item) => item.constraints ?? []),
        blockers: projectTasks.flatMap((item) => item.blockers ?? []),
        childIds: Array.from(project.workIds)
      });

      project.workIds.forEach((workId) => {
        const work = works.get(workId);
        if (!work) {
          return;
        }
        const workStart = work.tasks.reduce((min, item) => Math.min(min, item.startDay), Infinity);
        const workEnd = work.tasks.reduce(
          (max, item) => Math.max(max, item.startDay + item.durationDays),
          -Infinity
        );
        rows.push({
          id: work.id,
          type: 'work',
          name: work.name,
          level: 1,
          startDay: workStart === Infinity ? 0 : workStart,
          durationDays: workEnd === -Infinity ? 1 : Math.max(1, workEnd - workStart),
          role: work.role,
          childIds: work.tasks.map((task) => task.id),
          blockers: work.tasks.flatMap((task) => task.blockers ?? []),
          constraints: work.tasks.flatMap((task) => task.constraints ?? [])
        });

        const parentChildMap = new Map<string, InitiativeGanttTask[]>();
        work.tasks.forEach((task) => {
          const parentId = task.parentTaskId ?? null;
          const list = parentChildMap.get(parentId ?? '__root__') ?? [];
          list.push(task);
          parentChildMap.set(parentId ?? '__root__', list);
        });

        const rootTasks = parentChildMap.get('__root__') ?? [];
        const addTaskRows = (taskList: InitiativeGanttTask[], level: number) => {
          taskList
            .slice()
            .sort((a, b) => a.startDay - b.startDay || a.name.localeCompare(b.name))
            .forEach((task) => {
              const children = parentChildMap.get(task.id) ?? [];
              rows.push({
                id: task.id,
                type: level === 2 ? 'task' : 'subtask',
                name: task.name,
                level,
                effortDays: task.effortDays,
                startDay: task.startDay,
                durationDays: task.durationDays,
                role: task.role,
                minUnits: task.minUnits,
                maxUnits: task.maxUnits,
                canSplit: task.canSplit,
                parallelAllowed: task.parallelAllowed,
                durationMode: task.durationMode,
                constraints: task.constraints,
                priority: task.priority,
                wipLimitTag: task.wipLimitTag,
                scenarioBranch: task.scenarioBranch,
                typeTag: task.type,
                assignedExpert: task.assignedExpert,
                resources: task.resources,
                dependencies: task.dependencies,
                blockers: task.blockers,
                childIds: children.map((child) => child.id)
              });
              if (children.length > 0) {
                addTaskRows(children, level + 1);
              }
            });
        };

        addTaskRows(rootTasks, 2);
      });
    });

    const totalDays = rows.reduce((max, row) => Math.max(max, row.startDay + row.durationDays), MIN_COLUMN_COUNT);

    return { rows, totalDays };
  }, [tasks]);

  if (rows.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text size="s" view="secondary">
          План работ пока не заполнен. Добавьте задачи, чтобы увидеть диаграмму Ганта.
        </Text>
      </div>
    );
  }

  const dayWidth = 100 / totalDays;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.tableHeader}>
          <Text size="xs" view="secondary">
            Проект / Работы / Задачи
          </Text>
          <Text size="xs" view="secondary">
            Параллельность
          </Text>
          <Text size="xs" view="secondary">
            Мин/Макс Units
          </Text>
          <Text size="xs" view="secondary">
            Приоритет
          </Text>
          <Text size="xs" view="secondary">
            Роль
          </Text>
          <Text size="xs" view="secondary">
            Ресурсы
          </Text>
        </div>
        <div className={styles.axis}>
          {Array.from({ length: totalDays }, (_, index) => (
            <div key={index} className={styles.axisCell}>
              <Text size="xs" view="secondary">
                Д{index + 1}
              </Text>
            </div>
          ))}
        </div>
      </div>
      <div className={styles.body}>
        {rows.map((row) => {
          const left = row.startDay * dayWidth;
          const width = Math.max(row.durationDays * dayWidth, dayWidth * 0.75);
          const hasActiveBlocker = (row.blockers ?? []).some((blocker) => blocker.active);
          return (
            <div key={row.id} className={styles.row}>
              <div className={styles.nameCell} data-level={row.level} data-type={row.type}>
                <div className={styles.nameContent}>
                  {row.type === 'project' && <span className={styles.treeMarker} />}
                  {row.type === 'work' && <span className={styles.treeMarker} />}
                  {row.type !== 'project' && row.type !== 'work' && <span className={styles.treeMarker} />}
                  <div className={styles.nameTextGroup}>
                    <Text size="s" weight={row.type === 'project' ? 'bold' : 'semibold'} truncate>
                      {row.name}
                    </Text>
                    <div className={styles.metaRow}>
                      {row.typeTag === 'buffer' && (
                        <Badge
                          size="2xs"
                          view="ghost"
                          status="warning"
                          label="Буфер"
                          className={styles.metaBadge}
                        />
                      )}
                      {row.durationMode && (
                        <Badge
                          size="2xs"
                          view="ghost"
                          status="system"
                          label={row.durationMode === 'fixed-effort' ? 'Fixed Effort' : 'Fixed Duration'}
                          className={styles.metaBadge}
                        />
                      )}
                      {row.wipLimitTag && (
                        <Badge
                          size="2xs"
                          view="ghost"
                          status="alert"
                          label={row.wipLimitTag}
                          className={styles.metaBadge}
                        />
                      )}
                      {row.scenarioBranch && (
                        <Badge
                          size="2xs"
                          view="ghost"
                          status="normal"
                          label={`Сценарий: ${row.scenarioBranch}`}
                          className={styles.metaBadge}
                        />
                      )}
                    </div>
                    {row.constraints && row.constraints.length > 0 && (
                      <div className={styles.metaRow}>
                        {row.constraints.slice(0, 3).map((constraint) => (
                          <Badge
                            key={`${row.id}-constraint-${constraint}`}
                            size="2xs"
                            view="ghost"
                            status="secondary"
                            label={constraint}
                            className={styles.metaBadge}
                          />
                        ))}
                      </div>
                    )}
                    {hasActiveBlocker && (
                      <div className={styles.metaRow}>
                        {(row.blockers ?? [])
                          .filter((blocker) => blocker.active)
                          .slice(0, 2)
                          .map((blocker) => (
                            <Badge
                              key={blocker.id}
                              size="2xs"
                              view="filled"
                              status="error"
                              label={`Блокер: ${blocker.reason}`}
                              className={styles.metaBadge}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.parallelCell}>
                <Checkbox size="s" checked={Boolean(row.parallelAllowed ?? row.canSplit)} disabled />
              </div>
              <div className={styles.unitsCell}>
                <Text size="xs" view="secondary">
                  {row.minUnits || row.maxUnits ? `${row.minUnits ?? 0}/${row.maxUnits ?? '∞'}` : '—'}
                </Text>
              </div>
              <div className={styles.priorityCell}>
                <Text size="xs" view="secondary">
                  {row.priority ?? '—'}
                </Text>
              </div>
              <div className={styles.roleCell}>
                <Text size="xs" view="secondary">
                  {row.role ?? '—'}
                </Text>
              </div>
              <div className={styles.resourceCell}>
                {row.resources && row.resources.length > 0 ? (
                  <div className={styles.resourceList}>
                    {row.resources.slice(0, 3).map((resource) => (
                      <Text key={resource.id} size="xs" truncate>
                        {resource.name}
                        {resource.units ? ` · ${resource.units}u` : ''}
                      </Text>
                    ))}
                    {row.assignedExpert &&
                      !row.resources.some((resource) => resource.name === row.assignedExpert) && (
                        <Text size="xs" truncate>
                          {row.assignedExpert}
                        </Text>
                      )}
                  </div>
                ) : row.assignedExpert ? (
                  <Text size="xs" truncate>
                    {row.assignedExpert}
                  </Text>
                ) : (
                  <Text size="xs" view="secondary">
                    —
                  </Text>
                )}
              </div>
              <div className={styles.timelineCell}>
                <div className={styles.timelineLane}>
                  <div
                    className={styles.timelineBar}
                    data-type={row.type}
                    data-buffer={row.typeTag === 'buffer'}
                    data-blocked={hasActiveBlocker}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`Длительность: ${row.durationDays} дн. · Старт D${row.startDay + 1}`}
                  >
                    <Text size="2xs" weight="semibold" truncate>
                      {row.effortDays ? `${row.name} · ${row.effortDays} дн.` : row.name}
                    </Text>
                    {row.dependencies && row.dependencies.length > 0 && (
                      <div className={styles.metaRow}>
                        {row.dependencies.slice(0, 3).map((dependency) => (
                          <Badge
                            key={`${row.id}-${dependency.id}-${dependency.type}`}
                            size="2xs"
                            view="ghost"
                            status="system"
                            label={`${dependency.type}${
                              dependency.lag
                                ? ` ${dependency.lag > 0 ? '+' : ''}${dependency.lag}${
                                    dependency.lagUnit === 'hours' ? 'ч' : 'д'
                                  }`
                                : ''
                            }`}
                            className={styles.metaBadge}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InitiativeGanttChart;
