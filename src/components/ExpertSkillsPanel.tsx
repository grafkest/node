import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Card } from '@consta/uikit/Card';
import { Checkbox } from '@consta/uikit/Checkbox';
import { CheckboxGroup } from '@consta/uikit/CheckboxGroup';
import {
  Combobox,
  type ComboboxPropRenderItem
} from '@consta/uikit/Combobox';
import { Select } from '@consta/uikit/Select';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import clsx from 'clsx';
import React, {
  useCallback,
  useMemo,
  useState
} from 'react';
import type { JSX } from 'react';
import type {
  DomainNode,
  ExpertProfile,
  ExpertProfileSkill,
  ExpertSkill,
  ExpertSkillCategory,
  ExpertSkillLevel,
  ModuleNode
} from '../data';
import styles from './ExpertSkillsPanel.module.css';

type SelectItem<Value extends string> = {
  label: string;
  value: Value;
};

type SkillOption = SelectItem<string> & {
  category: ExpertSkillCategory;
};

type ModuleOption = SelectItem<string>;

type DomainOption = SelectItem<string>;

type CategoryOption = {
  id: ExpertSkillCategory;
  label: string;
};

type ViewMode = (typeof viewTabs)[number]['value'];

type ExpertSkillsPanelProps = {
  experts: ExpertProfile[];
  skills: ExpertSkill[];
  modules: ModuleNode[];
  domains: DomainNode[];
  domainNameMap: Record<string, string>;
};

type EnrichedExpert = {
  profile: ExpertProfile;
  modules: ModuleNode[];
  domainIds: Set<string>;
};

type AggregatedSkill = {
  skill: ExpertSkill;
  experts: {
    id: string;
    fullName: string;
    level: ExpertSkillLevel;
  }[];
};

const categoryOptions: CategoryOption[] = [
  { id: 'core', label: 'Продуктовая экспертиза' },
  { id: 'consulting', label: 'Консалтинговые навыки' }
];

const viewTabs = [
  { label: 'Эксперты', value: 'experts' },
  { label: 'Компетенции', value: 'skills' }
] as const;

const skillLevelLabel: Record<ExpertSkillLevel, string> = {
  base: 'Базовый',
  advanced: 'Продвинутый',
  expert: 'Экспертный'
};

const categoryLabel: Record<ExpertSkillCategory, string> = {
  core: 'Продуктовая экспертиза',
  consulting: 'Консалтинг'
};

const moduleStatusLabel: Record<ModuleNode['status'], string> = {
  'in-dev': 'В разработке',
  production: 'В эксплуатации',
  deprecated: 'Устаревший'
};

const moduleStatusBadge: Record<ModuleNode['status'], 'success' | 'warning' | 'system'> = {
  production: 'success',
  'in-dev': 'warning',
  deprecated: 'system'
};

const ExpertSkillsPanel: React.FC<ExpertSkillsPanelProps> = ({
  experts,
  skills,
  modules,
  domains,
  domainNameMap
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('experts');
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<ExpertSkillCategory[]>([
    'core',
    'consulting'
  ]);
  const [searchQuery, setSearchQuery] = useState('');

  const flattenedDomains = useMemo(() => flattenDomainTree(domains), [domains]);

  const domainOptions = useMemo<DomainOption[]>(
    () =>
      flattenedDomains
        .filter((domain) => !domain.isCatalogRoot)
        .map((domain) => ({ label: domain.name, value: domain.id })),
    [flattenedDomains]
  );

  const moduleOptions = useMemo<ModuleOption[]>(
    () => modules.map((module) => ({ label: module.name, value: module.id })),
    [modules]
  );

  const skillOptions = useMemo<SkillOption[]>(
    () =>
      skills.map((skill) => ({
        label: skill.name,
        value: skill.id,
        category: skill.category
      })),
    [skills]
  );

  const activeCategoryIds = useMemo<ExpertSkillCategory[]>(
    () => (categoryFilter.length > 0 ? categoryFilter : ['core', 'consulting']),
    [categoryFilter]
  );

  const activeCategorySet = useMemo(
    () => new Set<ExpertSkillCategory>(activeCategoryIds),
    [activeCategoryIds]
  );

  const domainSelectValue = useMemo(
    () =>
      domainFilter
        ? domainOptions.find((option) => option.value === domainFilter) ?? null
        : null,
    [domainFilter, domainOptions]
  );

  const selectedModuleOptions = useMemo(
    () => moduleOptions.filter((option) => moduleFilter.includes(option.value)),
    [moduleFilter, moduleOptions]
  );

  const selectedSkillOptions = useMemo(
    () => skillOptions.filter((option) => selectedSkillIds.includes(option.value)),
    [selectedSkillIds, skillOptions]
  );

  const skillById = useMemo(() => {
    const map = new Map<string, ExpertSkill>();
    skills.forEach((skill) => {
      map.set(skill.id, skill);
    });
    return map;
  }, [skills]);

  const modulesByExpert = useMemo(() => {
    const map = new Map<string, ModuleNode[]>();
    modules.forEach((module) => {
      module.projectTeam.forEach((member) => {
        if (member.role !== 'Эксперт R&D') {
          return;
        }
        const current = map.get(member.id) ?? [];
        map.set(member.id, [...current, module]);
      });
    });
    return map;
  }, [modules]);

  const enrichedExperts = useMemo<EnrichedExpert[]>(
    () =>
      experts.map((profile) => {
        const assignedModules = modulesByExpert.get(profile.id) ?? [];
        const domainIds = new Set<string>(profile.focusDomains);
        assignedModules.forEach((module) => {
          module.domains.forEach((domainId) => {
            domainIds.add(domainId);
          });
        });
        return { profile, modules: assignedModules, domainIds };
      }),
    [experts, modulesByExpert]
  );

  const summaryStats = useMemo(() => {
    const domainIds = new Set<string>();
    const coreSkills = new Set<string>();
    const consultingSkills = new Set<string>();

    enrichedExperts.forEach(({ profile, domainIds: expertDomainIds }) => {
      expertDomainIds.forEach((domainId) => domainIds.add(domainId));
      profile.competencies.forEach((entry) => coreSkills.add(entry.skillId));
      profile.consultingSkills.forEach((entry) => consultingSkills.add(entry.skillId));
    });

    return {
      experts: enrichedExperts.length,
      domains: domainIds.size,
      coreSkills: coreSkills.size,
      consultingSkills: consultingSkills.size
    };
  }, [enrichedExperts]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredExperts = useMemo(() => {
    return enrichedExperts.filter(({ profile, modules: expertModules, domainIds }) => {
      if (domainFilter && !domainIds.has(domainFilter)) {
        return false;
      }

      if (moduleFilter.length > 0) {
        const moduleIdSet = new Set(expertModules.map((module) => module.id));
        const hasSelectedModule = moduleFilter.some((moduleId) =>
          moduleIdSet.has(moduleId)
        );
        if (!hasSelectedModule) {
          return false;
        }
      }

      const expertSkillIds = new Set<string>();
      const expertCategories = new Set<ExpertSkillCategory>();

      const collectSkills = (entries: ExpertProfileSkill[]) => {
        entries.forEach((entry) => {
          const skill = skillById.get(entry.skillId);
          if (!skill) {
            return;
          }
          expertSkillIds.add(entry.skillId);
          expertCategories.add(skill.category);
        });
      };

      collectSkills(profile.competencies);
      collectSkills(profile.consultingSkills);

      if (selectedSkillIds.length > 0) {
        const matchesAll = selectedSkillIds.every((skillId) =>
          expertSkillIds.has(skillId)
        );
        if (!matchesAll) {
          return false;
        }
      }

      const hasCategory = activeCategoryIds.some((category) =>
        expertCategories.has(category)
      );

      if (!hasCategory) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const tokens: string[] = [profile.fullName, profile.summary];
      profile.highlights?.forEach((highlight) => tokens.push(highlight));
      expertModules.forEach((module) => {
        tokens.push(module.name, module.productName);
      });
      domainIds.forEach((domainId) => {
        tokens.push(domainNameMap[domainId] ?? domainId);
      });

      const appendSkills = (entries: ExpertProfileSkill[]) => {
        entries.forEach((entry) => {
          const skill = skillById.get(entry.skillId);
          if (!skill) {
            return;
          }
          tokens.push(skill.name);
          if (entry.focus) {
            tokens.push(entry.focus);
          }
        });
      };

      appendSkills(profile.competencies);
      appendSkills(profile.consultingSkills);

      const haystack = tokens.join(' ').toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [
    activeCategoryIds,
    domainFilter,
    domainNameMap,
    enrichedExperts,
    moduleFilter,
    normalizedSearch,
    selectedSkillIds,
    skillById
  ]);

  const aggregatedSkills = useMemo<AggregatedSkill[]>(() => {
    const map = new Map<string, AggregatedSkill>();
    const allowedCategories = new Set<ExpertSkillCategory>(activeCategoryIds);

    filteredExperts.forEach(({ profile }) => {
      const addSkill = (entry: ExpertProfileSkill[]) => {
        entry.forEach((item) => {
          const skill = skillById.get(item.skillId);
          if (!skill || !allowedCategories.has(skill.category)) {
            return;
          }
          const current = map.get(skill.id);
          if (current) {
            current.experts.push({
              id: profile.id,
              fullName: profile.fullName,
              level: item.level
            });
            return;
          }
          map.set(skill.id, {
            skill,
            experts: [
              {
                id: profile.id,
                fullName: profile.fullName,
                level: item.level
              }
            ]
          });
        });
      };

      addSkill(profile.competencies);
      addSkill(profile.consultingSkills);
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.experts.length !== a.experts.length) {
        return b.experts.length - a.experts.length;
      }
      return a.skill.name.localeCompare(b.skill.name, 'ru');
    });
  }, [activeCategoryIds, filteredExperts, skillById]);

  const selectedCategoryItems = useMemo(
    () =>
      categoryOptions.filter((option) => activeCategoryIds.includes(option.id)),
    [activeCategoryIds]
  );

  const renderModuleOption = useCallback<ComboboxPropRenderItem<ModuleOption>>(
    ({ item, active, hovered, onClick, onMouseEnter, ref }) => (
      <div
        ref={ref}
        className={clsx(styles.comboboxOption, {
          [styles.comboboxOptionHovered]: hovered,
          [styles.comboboxOptionActive]: active
        })}
        onMouseEnter={onMouseEnter}
        onClick={(event) => {
          onClick(event);
        }}
      >
        <Checkbox
          size="s"
          readOnly
          checked={moduleFilter.includes(item.value)}
          label={item.label}
          className={styles.comboboxCheckbox}
        />
      </div>
    ),
    [moduleFilter]
  );

  const renderSkillOption = useCallback<ComboboxPropRenderItem<SkillOption>>(
    ({ item, active, hovered, onClick, onMouseEnter, ref }) => (
      <div
        ref={ref}
        className={clsx(styles.comboboxOption, {
          [styles.comboboxOptionHovered]: hovered,
          [styles.comboboxOptionActive]: active
        })}
        onMouseEnter={onMouseEnter}
        onClick={(event) => {
          onClick(event);
        }}
      >
        <Checkbox
          size="s"
          readOnly
          checked={selectedSkillIds.includes(item.value)}
          label={`${item.label} • ${categoryLabel[item.category]}`}
          className={styles.comboboxCheckbox}
        />
      </div>
    ),
    [selectedSkillIds]
  );

  const handleResetFilters = useCallback(() => {
    setDomainFilter(null);
    setModuleFilter([]);
    setSelectedSkillIds([]);
    setCategoryFilter(['core', 'consulting']);
    setSearchQuery('');
  }, []);

  const activeTab = viewTabs.find((tab) => tab.value === viewMode) ?? viewTabs[0];

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <Tabs
          size="s"
          items={viewTabs}
          value={activeTab}
          getItemKey={(item) => item.value}
          getItemLabel={(item) => item.label}
          onChange={(tab) => setViewMode(tab.value)}
          className={styles.viewTabs}
        />
        <Text size="s" view="secondary" className={styles.counterText}>
          Показываем {formatExpertCount(filteredExperts.length)} из{' '}
          {formatExpertCount(summaryStats.experts)}.
        </Text>
      </div>

      <div className={styles.summaryGrid}>
        <Card verticalSpace="l" horizontalSpace="l" shadow={false} className={styles.summaryCard}>
          <Text size="s" view="secondary">
            Экспертов
          </Text>
          <Text size="3xl" weight="bold">
            {summaryStats.experts}
          </Text>
        </Card>
        <Card verticalSpace="l" horizontalSpace="l" shadow={false} className={styles.summaryCard}>
          <Text size="s" view="secondary">
            Доменных направлений
          </Text>
          <Text size="3xl" weight="bold">
            {summaryStats.domains}
          </Text>
        </Card>
        <Card verticalSpace="l" horizontalSpace="l" shadow={false} className={styles.summaryCard}>
          <Text size="s" view="secondary">
            Продуктовых компетенций
          </Text>
          <Text size="3xl" weight="bold">
            {summaryStats.coreSkills}
          </Text>
        </Card>
        <Card verticalSpace="l" horizontalSpace="l" shadow={false} className={styles.summaryCard}>
          <Text size="s" view="secondary">
            Консалтинговых навыков
          </Text>
          <Text size="3xl" weight="bold">
            {summaryStats.consultingSkills}
          </Text>
        </Card>
      </div>

      <Card verticalSpace="l" horizontalSpace="l" shadow={false} className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <TextField
            size="s"
            label="Поиск"
            value={searchQuery}
            placeholder="Имя эксперта, модуль или навык"
            onChange={(value) => setSearchQuery(value ?? '')}
          />
          <Select<DomainOption>
            size="s"
            label="Домен"
            items={domainOptions}
            value={domainSelectValue}
            placeholder="Все домены"
            getItemKey={(item) => item.value}
            getItemLabel={(item) => item.label}
            onChange={(option) => setDomainFilter(option?.value ?? null)}
          />
          <Combobox<ModuleOption>
            size="s"
            label="Модули участия"
            placeholder="Все модули"
            items={moduleOptions}
            value={selectedModuleOptions}
            getItemKey={(item) => item.value}
            getItemLabel={(item) => item.label}
            onChange={(items) => setModuleFilter((items ?? []).map((item) => item.value))}
            multiple
            renderItem={renderModuleOption}
            form="default"
            className={styles.combobox}
          />
          <Combobox<SkillOption>
            size="s"
            label="Компетенции"
            placeholder="Все навыки"
            items={skillOptions}
            value={selectedSkillOptions}
            getItemKey={(item) => item.value}
            getItemLabel={(item) => item.label}
            onChange={(items) =>
              setSelectedSkillIds((items ?? []).map((item) => item.value))
            }
            multiple
            renderItem={renderSkillOption}
            form="default"
            className={styles.combobox}
          />
        </div>
        <div className={styles.filtersFooter}>
          <CheckboxGroup<CategoryOption>
            size="s"
            direction="row"
            items={categoryOptions}
            value={selectedCategoryItems}
            getItemKey={(item) => item.id}
            getItemLabel={(item) => item.label}
            onChange={(items) =>
              setCategoryFilter((items ?? []).map((item) => item.id))
            }
          />
          <Button size="s" view="secondary" label="Сбросить фильтры" onClick={handleResetFilters} />
        </div>
      </Card>

      {viewMode === 'experts' ? (
        filteredExperts.length > 0 ? (
          <div className={styles.cardsGrid}>
            {filteredExperts.map((expert) => {
              const domainBadges = Array.from(expert.domainIds)
                .map((domainId) => ({
                  id: domainId,
                  label: domainNameMap[domainId] ?? domainId
                }))
                .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

              const coreSkillItems = activeCategorySet.has('core')
                ? renderSkillItems(expert.profile.competencies, 'core', skillById)
                : [];
              const consultingSkillItems = activeCategorySet.has('consulting')
                ? renderSkillItems(expert.profile.consultingSkills, 'consulting', skillById)
                : [];

              return (
                <Card
                  key={expert.profile.id}
                  verticalSpace="l"
                  horizontalSpace="l"
                  shadow={false}
                  className={styles.expertCard}
                >
                  <div className={styles.cardHeader}>
                    <div>
                      <Text size="l" weight="semibold">
                        {expert.profile.fullName}
                      </Text>
                      <Text size="s" view="secondary" className={styles.summaryText}>
                        {expert.profile.summary}
                      </Text>
                    </div>
                    <Badge
                      size="s"
                      view="filled"
                      status={expert.modules.length > 0 ? 'success' : 'system'}
                      label={`${expert.modules.length} ${pluralizeModules(expert.modules.length)}`}
                    />
                  </div>

                  {domainBadges.length > 0 && (
                    <div className={styles.domainTags}>
                      {domainBadges.map((domain) => (
                        <Badge
                          key={domain.id}
                          size="s"
                          view="stroked"
                          label={domain.label}
                        />
                      ))}
                    </div>
                  )}

                  <div className={styles.section}>
                    <Text size="s" weight="semibold" className={styles.sectionTitle}>
                      Продуктовая экспертиза
                    </Text>
                    {coreSkillItems.length > 0 ? (
                      <div className={styles.skillList}>{coreSkillItems}</div>
                    ) : (
                      <Text size="xs" view="secondary">
                        Нет данных
                      </Text>
                    )}
                  </div>

                  <div className={styles.section}>
                    <Text size="s" weight="semibold" className={styles.sectionTitle}>
                      Консалтинговые навыки
                    </Text>
                    {consultingSkillItems.length > 0 ? (
                      <div className={styles.skillList}>{consultingSkillItems}</div>
                    ) : (
                      <Text size="xs" view="secondary">
                        Нет данных
                      </Text>
                    )}
                  </div>

                  <div className={styles.section}>
                    <Text size="s" weight="semibold" className={styles.sectionTitle}>
                      Участие в модулях
                    </Text>
                    {expert.modules.length > 0 ? (
                      <ul className={styles.moduleList}>
                        {expert.modules.map((module) => (
                          <li key={module.id} className={styles.moduleItem}>
                            <Text size="s" weight="semibold">
                              {module.name}
                            </Text>
                            <div className={styles.moduleMeta}>
                              <Badge
                                size="xs"
                                view="stroked"
                                status={moduleStatusBadge[module.status]}
                                label={moduleStatusLabel[module.status]}
                              />
                              <Text size="xs" view="secondary">
                                {module.productName}
                              </Text>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <Text size="xs" view="secondary">
                        Нет привязанных модулей
                      </Text>
                    )}
                  </div>

                  {expert.profile.highlights && expert.profile.highlights.length > 0 && (
                    <div className={styles.section}>
                      <Text size="s" weight="semibold" className={styles.sectionTitle}>
                        Ключевые результаты
                      </Text>
                      <ul className={styles.highlightList}>
                        {expert.profile.highlights.map((item, index) => (
                          <li key={index} className={styles.highlightItem}>
                            <Text size="xs">{item}</Text>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card verticalSpace="l" horizontalSpace="l" shadow={false} className={styles.emptyState}>
            <Text size="m" weight="semibold">
              Не нашлось экспертов по заданным условиям
            </Text>
            <Text size="s" view="secondary">
              Попробуйте расширить фильтры или сбросить поиск.
            </Text>
          </Card>
        )
      ) : aggregatedSkills.length > 0 ? (
        <div className={styles.cardsGrid}>
          {aggregatedSkills.map((group) => (
            <Card
              key={group.skill.id}
              verticalSpace="l"
              horizontalSpace="l"
              shadow={false}
              className={clsx(styles.skillCard, {
                [styles.skillCardHighlighted]: selectedSkillIds.includes(group.skill.id)
              })}
            >
              <div className={styles.skillCardHeader}>
                <Text size="m" weight="semibold">
                  {group.skill.name}
                </Text>
                <Badge
                  size="s"
                  view="filled"
                  status={group.skill.category === 'core' ? 'success' : 'warning'}
                  label={categoryLabel[group.skill.category]}
                />
              </div>
              <Text size="xs" view="secondary" className={styles.skillDescription}>
                {group.skill.description}
              </Text>
              <Text size="s" weight="semibold" className={styles.skillCount}>
                {formatExpertCount(group.experts.length)}
              </Text>
              <div className={styles.skillExperts}>
                {group.experts.slice(0, 4).map((expert) => (
                  <Badge
                    key={expert.id}
                    size="s"
                    view="stroked"
                    label={`${expert.fullName} • ${skillLevelLabel[expert.level]}`}
                  />
                ))}
              </div>
              {group.experts.length > 4 && (
                <Text size="xs" view="secondary">
                  +{group.experts.length - 4} ещё
                </Text>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card verticalSpace="l" horizontalSpace="l" shadow={false} className={styles.emptyState}>
          <Text size="m" weight="semibold">
            Нет компетенций для отображения
          </Text>
          <Text size="s" view="secondary">
            Измените фильтры, чтобы увидеть матрицу навыков.
          </Text>
        </Card>
      )}
    </div>
  );
};

function renderSkillItems(
  entries: ExpertProfileSkill[],
  expectedCategory: ExpertSkillCategory,
  skillById: Map<string, ExpertSkill>
) {
  const items = entries.reduce<JSX.Element[]>((acc, entry) => {
    const skill = skillById.get(entry.skillId);
    if (!skill || skill.category !== expectedCategory) {
      return acc;
    }
    acc.push(
      <div key={entry.skillId} className={styles.skillItem}>
        <Badge
          size="s"
          view="filled"
          status={expectedCategory === 'core' ? 'success' : 'warning'}
          label={`${skill.name} • ${skillLevelLabel[entry.level]}`}
        />
        {entry.focus && (
          <Text size="2xs" view="secondary" className={styles.skillFocus}>
            {entry.focus}
          </Text>
        )}
      </div>
    );
    return acc;
  }, []);

  return items;
}

function flattenDomainTree(nodes: DomainNode[]): DomainNode[] {
  const result: DomainNode[] = [];
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.shift();
    if (!node) {
      continue;
    }
    result.push(node);
    if (node.children) {
      stack.push(...node.children);
    }
  }
  return result;
}

function formatExpertCount(count: number) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return `${count} эксперт`;
  }
  if (
    [2, 3, 4].includes(lastDigit) &&
    ![12, 13, 14].includes(lastTwoDigits)
  ) {
    return `${count} эксперта`;
  }
  return `${count} экспертов`;
}

function pluralizeModules(count: number) {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) {
    return 'модуль';
  }
  if (
    [2, 3, 4].includes(lastDigit) &&
    ![12, 13, 14].includes(lastTwoDigits)
  ) {
    return 'модуля';
  }
  return 'модулей';
}

export default ExpertSkillsPanel;
