import { Badge } from '@consta/uikit/Badge';
import { Text } from '@consta/uikit/Text';
import React, { useMemo } from 'react';
import timelineStyles from './GanttTimeline.module.css';

export type GanttTimelineTaskKind = 'project' | 'out-of-project' | 'training';

export type GanttTimelineTask = {
  id: string;
  name: string;
  start: Date | string;
  end: Date | string;
  kind: GanttTimelineTaskKind;
  badge: string;
  description?: string;
};

export type GanttTimelineRow = {
  id: string;
  sidebar: React.ReactNode;
  tasks: GanttTimelineTask[];
};

export const timelineScaleTabs = [
  { label: 'Неделя', value: 'week' },
  { label: 'Месяц', value: 'month' },
  { label: 'Год', value: 'year' }
] as const;

export type TimelineScale = (typeof timelineScaleTabs)[number]['value'];
export type TimelineScaleTab = (typeof timelineScaleTabs)[number];

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const dayFormatter = new Intl.DateTimeFormat('ru-RU', {
  weekday: 'short',
  day: '2-digit',
  month: 'short'
});

const periodFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: 'short'
});

const monthFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'short',
  year: 'numeric'
});

const kindPriority: GanttTimelineTaskKind[] = ['project', 'out-of-project', 'training'];

const capitalize = (value: string): string => {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const startOfDay = (input: Date): Date => {
  const result = new Date(input);
  result.setHours(0, 0, 0, 0);
  return result;
};

const startOfWeek = (input: Date): Date => {
  const date = startOfDay(input);
  const day = date.getDay();
  const diff = (day + 6) % 7; // Monday as first day
  date.setDate(date.getDate() - diff);
  return date;
};

const startOfMonth = (input: Date): Date => new Date(input.getFullYear(), input.getMonth(), 1);

const addDays = (input: Date, amount: number): Date => {
  const result = new Date(input);
  result.setDate(result.getDate() + amount);
  return result;
};

const addMonths = (input: Date, amount: number): Date => {
  const result = new Date(input);
  result.setMonth(result.getMonth() + amount);
  return result;
};

type TimelineSegment = {
  start: Date;
  end: Date;
  label: string;
};

type NormalizedTask = {
  id: string;
  kind: GanttTimelineTaskKind;
  startTime: number;
  endTime: number;
};

type NormalizedRow = {
  id: string;
  sidebar: React.ReactNode;
  tasks: (NormalizedTask & { original: GanttTimelineTask })[];
};

type LaneLayout = {
  assignments: Map<string, number>;
  laneCount: number;
};

const formatPeriod = (start: Date, end: Date): string => {
  const startLabel = periodFormatter.format(start);
  const endLabel = periodFormatter.format(end);
  if (startLabel === endLabel) {
    return capitalize(startLabel);
  }
  return `${capitalize(startLabel)} – ${capitalize(endLabel)}`;
};

const toDate = (value: Date | string): Date => {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
};

const ensurePositiveDuration = (start: number, end: number): number => {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return MS_IN_DAY;
  }
  const diff = end - start;
  return diff > 0 ? diff : MS_IN_DAY;
};

const assignLanesWithinGroup = (tasks: NormalizedTask[]): LaneLayout => {
  const sorted = tasks.slice().sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
  const laneEndTimes: number[] = [];
  const assignments = new Map<string, number>();

  sorted.forEach((task) => {
    const availableLane = laneEndTimes.findIndex((endTime) => endTime <= task.startTime);
    const laneIndex = availableLane === -1 ? laneEndTimes.length : availableLane;
    laneEndTimes[laneIndex] = Math.max(task.endTime, laneEndTimes[laneIndex] ?? 0);
    assignments.set(task.id, laneIndex);
  });

  return { assignments, laneCount: laneEndTimes.length || (tasks.length > 0 ? 1 : 0) };
};

const buildLaneLayout = (tasks: NormalizedTask[]): LaneLayout => {
  const assignments = new Map<string, number>();
  let laneOffset = 0;

  kindPriority.forEach((kind) => {
    const kindTasks = tasks.filter((task) => task.kind === kind);
    if (kindTasks.length === 0) {
      return;
    }
    const { assignments: kindAssignments, laneCount } = assignLanesWithinGroup(kindTasks);
    kindTasks.forEach((task) => {
      const laneIndex = kindAssignments.get(task.id) ?? 0;
      assignments.set(task.id, laneIndex + laneOffset);
    });
    laneOffset += laneCount;
  });

  return { assignments, laneCount: Math.max(laneOffset, tasks.length > 0 ? 1 : 0) };
};

const computeViewRange = (allTasks: NormalizedTask[], scale: TimelineScale): { viewStart: Date; viewEnd: Date } => {
  if (allTasks.length === 0) {
    const today = startOfWeek(startOfDay(new Date()));
    switch (scale) {
      case 'year': {
        const viewStart = startOfMonth(addMonths(today, -11));
        const viewEnd = addMonths(startOfMonth(today), 1);
        return { viewStart, viewEnd };
      }
      case 'month': {
        const viewStart = startOfWeek(addMonths(today, -1));
        const viewEnd = addDays(viewStart, 14 * 4);
        return { viewStart, viewEnd };
      }
      default: {
        const viewStart = startOfWeek(addDays(today, -7));
        const viewEnd = addDays(viewStart, 14);
        return { viewStart, viewEnd };
      }
    }
  }

  const maxEnd = allTasks.reduce((max, task) => Math.max(max, task.endTime), -Infinity);
  const maxEndDate = startOfDay(new Date(maxEnd));

  switch (scale) {
    case 'year': {
      const lastMonthStart = startOfMonth(maxEndDate);
      const viewStart = startOfMonth(addMonths(lastMonthStart, -11));
      const viewEnd = addMonths(lastMonthStart, 1);
      return { viewStart, viewEnd };
    }
    case 'month': {
      const lastMonthStart = startOfMonth(maxEndDate);
      const viewStart = startOfWeek(addMonths(lastMonthStart, -1));
      const viewEnd = addDays(viewStart, 7 * 8);
      return { viewStart, viewEnd };
    }
    default: {
      const lastWeekStart = startOfWeek(maxEndDate);
      const viewStart = addDays(lastWeekStart, -7);
      const viewEnd = addDays(viewStart, 14);
      return { viewStart, viewEnd };
    }
  }
};

const buildSegments = (viewStart: Date, viewEnd: Date, scale: TimelineScale): TimelineSegment[] => {
  const segments: TimelineSegment[] = [];
  switch (scale) {
    case 'year': {
      let cursor = startOfMonth(viewStart);
      while (cursor < viewEnd) {
        const next = startOfMonth(addMonths(cursor, 1));
        segments.push({
          start: cursor,
          end: next,
          label: capitalize(monthFormatter.format(cursor))
        });
        cursor = next;
      }
      break;
    }
    case 'month': {
      let cursor = startOfWeek(viewStart);
      while (cursor < viewEnd) {
        const next = addDays(cursor, 7);
        const segmentEnd = next < viewEnd ? addDays(next, -1) : addDays(viewEnd, -1);
        segments.push({
          start: cursor,
          end: next,
          label: formatPeriod(cursor, segmentEnd)
        });
        cursor = next;
      }
      break;
    }
    default: {
      let cursor = startOfDay(viewStart);
      while (cursor < viewEnd) {
        const next = addDays(cursor, 1);
        segments.push({
          start: cursor,
          end: next,
          label: capitalize(dayFormatter.format(cursor))
        });
        cursor = next;
      }
      break;
    }
  }
  return segments;
};

type GanttTimelineProps = {
  axisLabel: string;
  rows: GanttTimelineRow[];
  scale: TimelineScale;
  viewRange?: { start: Date | string; end: Date | string };
};

const GanttTimeline: React.FC<GanttTimelineProps> = ({ axisLabel, rows, scale, viewRange }) => {
  const normalizedRows = useMemo<NormalizedRow[]>(() => {
    return rows.map((row) => {
      const normalizedTasks = row.tasks.map((task) => {
        const startDate = startOfDay(toDate(task.start));
        const endDate = startOfDay(addDays(toDate(task.end), 1));
        const startTime = startDate.getTime();
        const duration = ensurePositiveDuration(startTime, endDate.getTime());
        return {
          original: task,
          id: task.id,
          kind: task.kind,
          startTime,
          endTime: startTime + duration
        } satisfies NormalizedTask & { original: GanttTimelineTask };
      });

      return {
        id: row.id,
        sidebar: row.sidebar,
        tasks: normalizedTasks
      };
    });
  }, [rows]);

  const allTasks = useMemo(
    () =>
      normalizedRows.flatMap((row) =>
        row.tasks.map((task) => ({ id: task.id, kind: task.kind, startTime: task.startTime, endTime: task.endTime }))
      ),
    [normalizedRows]
  );

  const explicitRange = useMemo(() => {
    if (!viewRange) {
      return null;
    }
    const start = startOfDay(toDate(viewRange.start));
    const end = startOfDay(toDate(viewRange.end));
    if (end <= start) {
      return { viewStart: start, viewEnd: addDays(start, 1) };
    }
    return { viewStart: start, viewEnd: end };
  }, [viewRange]);

  const { viewStart, viewEnd } = useMemo(() => {
    if (explicitRange) {
      return explicitRange;
    }
    return computeViewRange(allTasks, scale);
  }, [allTasks, explicitRange, scale]);
  const totalDuration = Math.max(viewEnd.getTime() - viewStart.getTime(), MS_IN_DAY);
  const segments = useMemo(() => buildSegments(viewStart, viewEnd, scale), [viewEnd, viewStart, scale]);
  const gridTemplateColumns = useMemo(() => {
    if (segments.length === 0) {
      return undefined;
    }
    const template = segments
      .map((segment) => Math.max(1, Math.round((segment.end.getTime() - segment.start.getTime()) / MS_IN_DAY)))
      .map((size) => `${size}fr`)
      .join(' ');
    return template;
  }, [segments]);

  return (
    <div className={timelineStyles.timeline}>
      <div className={timelineStyles.axisRow}>
        <div className={timelineStyles.axisHeaderCell}>
          <Text size="xs" view="secondary">
            {axisLabel}
          </Text>
        </div>
        <div
          className={timelineStyles.axis}
          style={gridTemplateColumns ? { gridTemplateColumns } : undefined}
        >
          {segments.map((segment) => (
            <div key={`${segment.label}-${segment.start.getTime()}`} className={timelineStyles.axisCell}>
              <Text size="2xs" view="secondary">
                {segment.label}
              </Text>
            </div>
          ))}
        </div>
      </div>
      <div className={timelineStyles.rows}>
        {normalizedRows.map((row) => {
          const laneLayout = buildLaneLayout(
            row.tasks.map((task) => ({ id: task.id, kind: task.kind, startTime: task.startTime, endTime: task.endTime }))
          );
          const minHeight = Math.max(112, laneLayout.laneCount * 68 + 28);

          return (
            <div key={row.id} className={timelineStyles.row}>
              {row.sidebar}
              <div className={timelineStyles.timelineCell} style={{ minHeight }}>
                <div className={timelineStyles.timelineLane} />
                {row.tasks.map((task) => {
                  const laneIndex = laneLayout.assignments.get(task.id) ?? 0;
                  const clampedStart = Math.max(task.startTime, viewStart.getTime());
                  const clampedEnd = Math.min(task.endTime, viewEnd.getTime());
                  if (clampedEnd <= viewStart.getTime() || clampedStart >= viewEnd.getTime()) {
                    return null;
                  }
                  const offset = ((clampedStart - viewStart.getTime()) / totalDuration) * 100;
                  const width = Math.max(((clampedEnd - clampedStart) / totalDuration) * 100, 2);
                  const top = 8 + laneIndex * 68;
                  const startDate = new Date(task.startTime);
                  const endDate = new Date(task.endTime - MS_IN_DAY);
                  const periodLabel = formatPeriod(startDate, endDate);

                  return (
                    <div
                      key={task.id}
                      className={timelineStyles.task}
                      data-kind={task.kind}
                      style={{ left: `${offset}%`, width: `${width}%`, top }}
                    >
                      <Text size="xs" weight="semibold" className={timelineStyles.taskName} truncate>
                        {task.original.name}
                      </Text>
                      <div className={timelineStyles.taskMetaRow}>
                        <Badge
                          size="xs"
                          status={task.kind === 'project' ? 'system' : task.kind === 'training' ? 'success' : 'warning'}
                          label={task.original.badge}
                          className={timelineStyles.taskBadge}
                        />
                        <Text size="2xs" view="secondary" className={timelineStyles.taskPeriod}>
                          {periodLabel}
                        </Text>
                      </div>
                      {task.original.description && (
                        <Text size="2xs" view="secondary" className={timelineStyles.taskDescription}>
                          {task.original.description}
                        </Text>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GanttTimeline;
