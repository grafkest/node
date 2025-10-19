import { Text } from '@consta/uikit/Text';
import React, { useMemo } from 'react';
import type { TeamRole } from '../data';
import styles from './InitiativeGanttChart.module.css';

export type InitiativeGanttTask = {
  id: string;
  role: TeamRole;
  title: string;
  startDay: number;
  durationDays: number;
  effortDays: number;
  assignedExpert?: string;
};

type InitiativeGanttChartProps = {
  tasks: InitiativeGanttTask[];
};

const MIN_COLUMN_COUNT = 8;

const InitiativeGanttChart: React.FC<InitiativeGanttChartProps> = ({ tasks }) => {
  const grouped = useMemo(() => {
    const map = new Map<TeamRole, InitiativeGanttTask[]>();
    tasks.forEach((task) => {
      if (!map.has(task.role)) {
        map.set(task.role, []);
      }
      map.get(task.role)?.push(task);
    });
    return map;
  }, [tasks]);

  const totalDays = useMemo(() => {
    const maxEnd = tasks.reduce((acc, task) => {
      const end = task.startDay + task.durationDays;
      return end > acc ? end : acc;
    }, 0);
    return Math.max(maxEnd, MIN_COLUMN_COUNT);
  }, [tasks]);

  if (tasks.length === 0) {
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
      <div className={styles.axis}>
        {Array.from({ length: totalDays }, (_, index) => (
          <div key={index} className={styles.axisCell}>
            <Text size="xs" view="secondary">
              Д{index + 1}
            </Text>
          </div>
        ))}
      </div>
      <div className={styles.rows}>
        {Array.from(grouped.entries()).map(([role, roleTasks]) => (
          <div key={role} className={styles.row}>
            <div className={styles.roleCell}>
              <Text size="s" weight="semibold">
                {role}
              </Text>
            </div>
            <div className={styles.timeline}>
              {roleTasks
                .slice()
                .sort((a, b) => a.startDay - b.startDay)
                .map((task) => {
                  const left = task.startDay * dayWidth;
                  const width = Math.max(task.durationDays * dayWidth, dayWidth * 0.75);
                  return (
                    <div
                      key={task.id}
                      className={styles.task}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <Text size="xs" weight="semibold" truncate>
                        {task.title}
                      </Text>
                      <Text size="2xs" view="secondary" truncate>
                        {task.assignedExpert
                          ? `${task.assignedExpert} • ${task.effortDays} дн.`
                          : `${task.effortDays} дн.`}
                      </Text>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default InitiativeGanttChart;
