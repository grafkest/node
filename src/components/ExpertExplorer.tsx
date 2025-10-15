import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Combobox } from '@consta/uikit/Combobox';
import { Tag } from '@consta/uikit/Tag';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import type {
  DomainNode,
  ExpertProfile,
  ModuleNode,
  ModuleStatus,
  ExpertCompetencyLevel
} from '../data';
import styles from './ExpertExplorer.module.css';

type Option = {
  id: string;
  label: string;
};

type ExpertExplorerProps = {
  experts: ExpertProfile[];
  modules: ModuleNode[];
  domains: DomainNode[];
};

const availabilityLabels: Record<ExpertProfile['availability'], string> = {
  open: 'Свободен для вовлечения',
  limited: 'Ограниченная доступность',
  booked: 'Занят на проектах'
};

const availabilityStatus: Record<ExpertProfile['availability'], 'success' | 'warning' | 'alert'> = {
  open: 'success',
  limited: 'warning',
  booked: 'alert'
};

const competencyLevelMeta: Record<ExpertCompetencyLevel, { label: string; status: 'system' | 'warning' | 'success' }> = {
  foundation: { label: 'Базовый уровень', status: 'system' },
  advanced: { label: 'Продвинутый уровень', status: 'warning' },
  expert: { label: 'Лидер экспертизы', status: 'success' }
};

const moduleStatusBadge: Record<ModuleStatus, 'success' | 'warning' | 'alert'> = {
  production: 'success',
  'in-dev': 'warning',
  deprecated: 'alert'
};

const availabilityOrder: Record<ExpertProfile['availability'], number> = {
  open: 0,
  limited: 1,
  booked: 2
};

const ExpertExplorer: React.FC<ExpertExplorerProps> = ({ experts, modules, domains }) => {
  const [search, setSearch] = useState('');
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(() => experts[0]?.id ?? null);
  const [selectedDomainOptions, setSelectedDomainOptions] = useState<Option[]>([]);
  const [selectedCompetencyOptions, setSelectedCompetencyOptions] = useState<Option[]>([]);
  const [selectedConsultingOptions, setSelectedConsultingOptions] = useState<Option[]>([]);

  const domainOptions = useMemo<Option[]>(() => {
    const unique = new Map<string, Option>();
    flattenDomains(domains).forEach((domain) => {
      if (domain.isCatalogRoot) {
        return;
      }
      if (!unique.has(domain.id)) {
        unique.set(domain.id, { id: domain.id, label: domain.name });
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [domains]);

  const competencyOptions = useMemo<Option[]>(() => {
    const unique = new Map<string, Option>();
    experts.forEach((expert) => {
      expert.competencies.forEach((competency) => {
        if (!unique.has(competency.id)) {
          unique.set(competency.id, { id: competency.id, label: competency.name });
        }
      });
    });
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [experts]);

  const competencyLabelById = useMemo(() => {
    const map = new Map<string, string>();
    competencyOptions.forEach((option) => {
      map.set(option.id, option.label);
    });
    return map;
  }, [competencyOptions]);

  const consultingOptions = useMemo<Option[]>(() => {
    const unique = new Map<string, Option>();
    experts.forEach((expert) => {
      expert.consultingSkills.forEach((skill) => {
        if (!unique.has(skill.id)) {
          unique.set(skill.id, { id: skill.id, label: skill.name });
        }
      });
    });
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [experts]);

  const domainNameMap = useMemo(() => {
    const map = new Map<string, string>();
    flattenDomains(domains).forEach((domain) => {
      map.set(domain.id, domain.name);
    });
    return map;
  }, [domains]);

  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleNode>();
    modules.forEach((module) => {
      map.set(module.id, module);
    });
    return map;
  }, [modules]);

  const selectedDomainIds = useMemo(() => new Set(selectedDomainOptions.map((option) => option.id)), [selectedDomainOptions]);
  const selectedCompetencyIds = useMemo(
    () => new Set(selectedCompetencyOptions.map((option) => option.id)),
    [selectedCompetencyOptions]
  );
  const selectedConsultingIds = useMemo(
    () => new Set(selectedConsultingOptions.map((option) => option.id)),
    [selectedConsultingOptions]
  );

  const filteredExperts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return experts
      .filter((expert) => {
        const matchesSearch = (() => {
          if (!normalizedSearch) {
            return true;
          }
          if (expert.fullName.toLowerCase().includes(normalizedSearch)) {
            return true;
          }
          if (expert.title.toLowerCase().includes(normalizedSearch)) {
            return true;
          }
          if (expert.summary.toLowerCase().includes(normalizedSearch)) {
            return true;
          }
          if (expert.focusAreas.some((focus) => focus.toLowerCase().includes(normalizedSearch))) {
            return true;
          }
          if (expert.competencies.some((competency) => competency.name.toLowerCase().includes(normalizedSearch))) {
            return true;
          }
          if (expert.consultingSkills.some((skill) => skill.name.toLowerCase().includes(normalizedSearch))) {
            return true;
          }
          return false;
        })();

        const matchesDomains =
          selectedDomainIds.size === 0 || expert.domainIds.some((domainId) => selectedDomainIds.has(domainId));
        const matchesCompetencies =
          selectedCompetencyIds.size === 0 || expert.competencies.some((competency) => selectedCompetencyIds.has(competency.id));
        const matchesConsulting =
          selectedConsultingIds.size === 0 || expert.consultingSkills.some((skill) => selectedConsultingIds.has(skill.id));

        return matchesSearch && matchesDomains && matchesCompetencies && matchesConsulting;
      })
      .sort((a, b) => {
        const availabilityDiff = availabilityOrder[a.availability] - availabilityOrder[b.availability];
        if (availabilityDiff !== 0) {
          return availabilityDiff;
        }
        return b.experienceYears - a.experienceYears;
      });
  }, [experts, search, selectedDomainIds, selectedCompetencyIds, selectedConsultingIds]);

  useEffect(() => {
    if (filteredExperts.length === 0) {
      setSelectedExpertId(null);
      return;
    }
    if (!selectedExpertId || !filteredExperts.some((expert) => expert.id === selectedExpertId)) {
      setSelectedExpertId(filteredExperts[0].id);
    }
  }, [filteredExperts, selectedExpertId]);

  useEffect(() => {
    if (!selectedExpertId && experts.length > 0) {
      setSelectedExpertId(experts[0].id);
    }
  }, [experts, selectedExpertId]);

  const selectedExpert = useMemo(() => {
    if (filteredExperts.length === 0) {
      return null;
    }
    if (!selectedExpertId) {
      return filteredExperts[0];
    }
    return filteredExperts.find((expert) => expert.id === selectedExpertId) ?? filteredExperts[0];
  }, [filteredExperts, selectedExpertId]);

  const relatedExperts = useMemo(() => {
    if (!selectedExpert) {
      return [];
    }

    const domainSet = new Set(selectedExpert.domainIds);
    const moduleSet = new Set(selectedExpert.moduleIds);
    const competencySet = new Set(selectedExpert.competencies.map((competency) => competency.id));

    return experts
      .filter((expert) => expert.id !== selectedExpert.id)
      .map((expert) => {
        const sharedDomains = expert.domainIds.filter((domainId) => domainSet.has(domainId));
        const sharedModules = expert.moduleIds.filter((moduleId) => moduleSet.has(moduleId));
        const sharedCompetencies = expert.competencies
          .map((competency) => competency.id)
          .filter((competencyId) => competencySet.has(competencyId));
        const score = sharedDomains.length * 3 + sharedModules.length * 4 + sharedCompetencies.length * 2;
        return { expert, sharedDomains, sharedModules, sharedCompetencies, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [experts, selectedExpert]);

  const resetFilters = () => {
    setSearch('');
    setSelectedDomainOptions([]);
    setSelectedCompetencyOptions([]);
    setSelectedConsultingOptions([]);
  };

  const formatConnection = (
    sharedDomains: string[],
    sharedModules: string[],
    sharedCompetencies: string[]
  ): string => {
    const parts: string[] = [];
    if (sharedModules.length > 0) {
      const moduleLabels = sharedModules
        .map((moduleId) => moduleMap.get(moduleId)?.name ?? moduleId)
        .join(', ');
      parts.push(`модули: ${moduleLabels}`);
    }
    if (sharedDomains.length > 0) {
      const domainLabels = sharedDomains
        .map((domainId) => domainNameMap.get(domainId) ?? domainId)
        .join(', ');
      parts.push(`домены: ${domainLabels}`);
    }
    if (sharedCompetencies.length > 0) {
      const competencyLabels = sharedCompetencies
        .map((competencyId) => competencyLabelById.get(competencyId) ?? competencyId)
        .join(', ');
      parts.push(`компетенции: ${competencyLabels}`);
    }
    return parts.join(' • ');
  };

  return (
    <div className={styles.root}>
      <section className={styles.filters}>
        <div className={clsx(styles.searchField)}>
          <Text size="s" weight="semibold">
            Поиск
          </Text>
          <TextField
            size="s"
            value={search}
            placeholder="Имя, компетенция или модуль"
            onChange={(value) => setSearch(value ?? '')}
          />
        </div>
        <div>
          <Text size="s" weight="semibold">
            Домены
          </Text>
          <Combobox<Option>
            size="s"
            placeholder="Все домены"
            items={domainOptions}
            value={selectedDomainOptions}
            getItemKey={(item) => item.id}
            getItemLabel={(item) => item.label}
            multiple
            onChange={(items) => setSelectedDomainOptions(items ?? [])}
          />
        </div>
        <div>
          <Text size="s" weight="semibold">
            Компетенции
          </Text>
          <Combobox<Option>
            size="s"
            placeholder="Все компетенции"
            items={competencyOptions}
            value={selectedCompetencyOptions}
            getItemKey={(item) => item.id}
            getItemLabel={(item) => item.label}
            multiple
            onChange={(items) => setSelectedCompetencyOptions(items ?? [])}
          />
        </div>
        <div>
          <Text size="s" weight="semibold">
            Консалтинговые навыки
          </Text>
          <Combobox<Option>
            size="s"
            placeholder="Все навыки"
            items={consultingOptions}
            value={selectedConsultingOptions}
            getItemKey={(item) => item.id}
            getItemLabel={(item) => item.label}
            multiple
            onChange={(items) => setSelectedConsultingOptions(items ?? [])}
          />
        </div>
        <div className={styles.filtersActions}>
          <Button size="s" view="secondary" label="Сбросить фильтры" onClick={resetFilters} />
          <Text size="xs" view="secondary">
            Подходят {filteredExperts.length} из {experts.length}
          </Text>
        </div>
      </section>
      <div className={styles.content}>
        <aside className={styles.listPanel}>
          <div className={styles.listHeader}>
            <div className={styles.listHeaderTitle}>
              <Text size="s" weight="semibold">
                Эксперты
              </Text>
              <Text size="xs" view="secondary">
                {filteredExperts.length > 0 ? 'Выберите эксперта, чтобы увидеть профиль' : 'Совпадений не найдено'}
              </Text>
            </div>
            <Badge size="s" view="filled" status="system" label={`Всего ${experts.length}`} />
          </div>
          <div className={styles.list}>
            {filteredExperts.map((expert) => {
              const moduleCount = expert.moduleIds.length;
              const domainBadges = expert.domainIds.slice(0, 3);
              const extraDomains = Math.max(0, expert.domainIds.length - domainBadges.length);
              const topCompetencies = expert.competencies.slice(0, 2);
              const isActive = selectedExpert?.id === expert.id;
              return (
                <button
                  type="button"
                  key={expert.id}
                  className={clsx(styles.expertCard, { [styles.expertCardActive]: isActive })}
                  onClick={() => setSelectedExpertId(expert.id)}
                >
                  <div className={styles.cardTitle}>
                    <Text size="s" weight="semibold">
                      {expert.fullName}
                    </Text>
                    <Text size="xs" view="secondary">
                      {expert.title}
                    </Text>
                  </div>
                  <div className={styles.cardMeta}>
                    <Badge
                      size="xs"
                      view="filled"
                      status={availabilityStatus[expert.availability]}
                      label={availabilityLabels[expert.availability]}
                    />
                    <Badge
                      size="xs"
                      view="stroked"
                      status="system"
                      label={`${expert.experienceYears}+ лет опыта`}
                    />
                    <Badge size="xs" view="stroked" status="system" label={`Модулей: ${moduleCount}`} />
                  </div>
                  <div className={styles.tagRow}>
                    {domainBadges.map((domainId) => (
                      <Tag key={domainId} label={domainNameMap.get(domainId) ?? domainId} size="xs" />
                    ))}
                    {extraDomains > 0 && <Tag label={`+${extraDomains}`} size="xs" />}
                  </div>
                  <div className={styles.tagRow}>
                    {topCompetencies.map((competency) => (
                      <Badge key={competency.id} size="xs" view="stroked" status="system" label={competency.name} />
                    ))}
                  </div>
                </button>
              );
            })}
            {filteredExperts.length === 0 && (
              <div className={styles.emptyState}>
                <Text size="s" view="secondary">
                  Измените фильтры или запрос, чтобы увидеть экспертов.
                </Text>
              </div>
            )}
          </div>
        </aside>
        <section className={styles.detailPanel}>
          {selectedExpert ? (
            <div className={styles.detailScroll}>
              <header className={styles.detailHeader}>
                <div className={styles.detailHeaderTop}>
                  <div className={styles.titleBlock}>
                    <Text size="xl" weight="bold">
                      {selectedExpert.fullName}
                    </Text>
                    <Text size="s" view="secondary">
                      {selectedExpert.title}
                    </Text>
                  </div>
                  <Badge
                    size="m"
                    view="filled"
                    status={availabilityStatus[selectedExpert.availability]}
                    label={availabilityLabels[selectedExpert.availability]}
                  />
                </div>
                <div className={styles.metricsRow}>
                  <span>
                    <Badge size="s" view="stroked" status="system" label={`${selectedExpert.experienceYears}+ лет опыта`} />
                  </span>
                  <span className={styles.muted}>Домены: {selectedExpert.domainIds.length}</span>
                  <span className={styles.muted}>Модули: {selectedExpert.moduleIds.length}</span>
                  <span className={styles.muted}>Компетенции: {selectedExpert.competencies.length}</span>
                </div>
                {selectedExpert.focusAreas.length > 0 && (
                  <div className={styles.focusTags}>
                    {selectedExpert.focusAreas.map((focus) => (
                      <Tag key={focus} label={focus} size="s" />
                    ))}
                  </div>
                )}
                <Text size="s">{selectedExpert.summary}</Text>
              </header>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Text size="s" weight="semibold">
                    Активные домены и модули
                  </Text>
                  <Text size="xs" view="secondary">
                    {selectedExpert.moduleIds.length} модулей • {selectedExpert.domainIds.length} доменов
                  </Text>
                </div>
                <div className={styles.badgeRow}>
                  {selectedExpert.domainIds.map((domainId) => (
                    <Tag key={domainId} label={domainNameMap.get(domainId) ?? domainId} size="xs" />
                  ))}
                </div>
                <div className={styles.badgeRow}>
                  {selectedExpert.moduleIds.map((moduleId) => {
                    const module = moduleMap.get(moduleId);
                    if (!module) {
                      return (
                        <Badge key={moduleId} size="s" view="stroked" status="system" label={moduleId} />
                      );
                    }
                    return (
                      <Badge
                        key={module.id}
                        size="s"
                        view="stroked"
                        status={moduleStatusBadge[module.status]}
                        label={module.name}
                      />
                    );
                  })}
                </div>
              </div>

              {selectedExpert.projectHighlights.length > 0 && (
                <div className={styles.section}>
                  <Text size="s" weight="semibold">
                    Проектные достижения
                  </Text>
                  <div className={styles.highlightList}>
                    {selectedExpert.projectHighlights.map((highlight, index) => {
                      const module = moduleMap.get(highlight.moduleId);
                      return (
                        <div className={styles.highlightItem} key={`${highlight.moduleId}-${index}`}>
                          <div className={styles.highlightMeta}>
                            <Badge
                              size="xs"
                              view="filled"
                              status={module ? moduleStatusBadge[module.status] : 'system'}
                              label={module?.name ?? highlight.moduleId}
                            />
                            <Text size="xs" view="secondary">
                              {module?.productName}
                            </Text>
                          </div>
                          <Text size="s" weight="semibold">
                            {highlight.contribution}
                          </Text>
                          <Text size="s" view="secondary">
                            {highlight.impact}
                          </Text>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className={styles.section}>
                <Text size="s" weight="semibold">
                  Основные компетенции
                </Text>
                <div className={styles.consultingList}>
                  {selectedExpert.competencies.map((competency) => {
                    const level = competencyLevelMeta[competency.level];
                    return (
                      <div className={styles.consultingItem} key={competency.id}>
                        <div className={styles.itemHeader}>
                          <Text size="s" weight="semibold">
                            {competency.name}
                          </Text>
                          <Badge size="xs" view="filled" status={level.status} label={level.label} />
                        </div>
                        <Text size="xs" view="secondary">
                          {competency.category}
                        </Text>
                        <Text size="s">{competency.description}</Text>
                        {competency.evidenceModules && competency.evidenceModules.length > 0 && (
                          <div className={styles.tagRow}>
                            {competency.evidenceModules.map((moduleId) => (
                              <Tag key={moduleId} label={moduleMap.get(moduleId)?.name ?? moduleId} size="xs" />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.section}>
                <Text size="s" weight="semibold">
                  Консалтинговые навыки
                </Text>
                <div className={styles.consultingList}>
                  {selectedExpert.consultingSkills.map((skill) => (
                    <div className={styles.consultingItem} key={skill.id}>
                      <Text size="s" weight="semibold">
                        {skill.name}
                      </Text>
                      <Text size="s" view="secondary">
                        {skill.description}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Text size="s" weight="semibold">
                    Менторство и развитие
                  </Text>
                  <Text size="xs" view="secondary">
                    Темы: {selectedExpert.mentoringTopics.length} • Интересы: {selectedExpert.learningInterests.length}
                  </Text>
                </div>
                <div className={styles.pills}>
                  {selectedExpert.mentoringTopics.map((topic) => (
                    <Tag key={`mentor-${topic}`} label={`Менторство: ${topic}`} size="xs" />
                  ))}
                </div>
                <div className={styles.pills}>
                  {selectedExpert.learningInterests.map((interest) => (
                    <Tag key={`interest-${interest}`} label={`Интерес: ${interest}`} size="xs" />
                  ))}
                </div>
              </div>

              {relatedExperts.length > 0 && (
                <div className={styles.section}>
                  <Text size="s" weight="semibold">
                    Связанные эксперты
                  </Text>
                  <div className={styles.relatedList}>
                    {relatedExperts.map(({ expert, sharedDomains, sharedModules, sharedCompetencies }) => (
                      <div className={styles.relatedItem} key={expert.id}>
                        <div>
                          <Text size="s" weight="semibold">
                            {expert.fullName}
                          </Text>
                          <Text size="xs" view="secondary">
                            {expert.title}
                          </Text>
                          <Text size="xs" className={styles.muted}>
                            {formatConnection(sharedDomains, sharedModules, sharedCompetencies)}
                          </Text>
                        </div>
                        <Button size="xs" view="secondary" label="Показать" onClick={() => setSelectedExpertId(expert.id)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Text size="s" view="secondary">
                Нет эксперта, удовлетворяющего текущим фильтрам.
              </Text>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

function flattenDomains(domains: DomainNode[]): DomainNode[] {
  return domains.flatMap((domain) => [domain, ...(domain.children ? flattenDomains(domain.children) : [])]);
}

export default ExpertExplorer;
