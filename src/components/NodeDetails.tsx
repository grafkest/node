import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Collapse } from '@consta/uikit/Collapse';
import { Select } from '@consta/uikit/Select';
import { Tag } from '@consta/uikit/Tag';
import { Text } from '@consta/uikit/Text';
import React, { useEffect, useState } from 'react';
import {
  artifactNameById,
  domainNameById,
  moduleNameById,
  type ModuleInput,
  type ModuleOutput,
  type TeamMember
} from '../data';
import type { GraphNode } from './GraphView';
import styles from './NodeDetails.module.css';

type NodeDetailsProps = {
  node: GraphNode | null;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
};

const statusBadgeView: Record<string, 'success' | 'warning' | 'alert' | 'normal'> = {
  production: 'success',
  'in-dev': 'warning',
  deprecated: 'alert'
};

type ConsumerOption = {
  id: string;
  label: string;
};

type SectionId = 'general' | 'calculation' | 'technical' | 'nonFunctional';

const defaultSectionState: Record<SectionId, boolean> = {
  general: true,
  calculation: false,
  technical: false,
  nonFunctional: false
};

const clientTypeLabels: Record<'desktop' | 'web', string> = {
  desktop: 'Desktop-приложение',
  web: 'Web-интерфейс'
};

const deploymentToolLabels: Record<'docker' | 'kubernetes', string> = {
  docker: 'Docker',
  kubernetes: 'Kubernetes'
};

const NodeDetails: React.FC<NodeDetailsProps> = ({ node, onClose, onNavigate }) => {
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>(
    () => ({ ...defaultSectionState })
  );
  const [isTeamExpanded, setIsTeamExpanded] = useState(false);

  useEffect(() => {
    if (node?.type !== 'module') {
      return;
    }

    setOpenSections({ ...defaultSectionState });
    setIsTeamExpanded(false);
  }, [node?.id, node?.type]);

  const toggleSection = (section: SectionId) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (!node) {
    return (
      <div className={styles.empty}>
        <Text size="s" view="secondary">
          Выберите узел, чтобы увидеть подробности
        </Text>
      </div>
    );
  }

  if (node.type === 'domain') {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Text size="l" weight="bold">
            {node.name}
          </Text>
          <Button size="xs" label="Закрыть" view="ghost" onClick={onClose} />
        </header>
        <Text size="s" view="secondary">
          {node.description}
        </Text>
      </div>
    );
  }

  if (node.type === 'artifact') {
    const producerLabel = moduleNameById[node.producedBy] ?? node.producedBy;
    const consumerLabels = node.consumerIds.map((consumerId) => ({
      id: consumerId,
      label: moduleNameById[consumerId] ?? consumerId
    }));

    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <Text size="l" weight="bold">
            {node.name}
          </Text>
          <Button size="xs" label="Закрыть" view="ghost" onClick={onClose} />
        </header>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Описание
          </Text>
          <Text size="s" view="secondary">
            {node.description}
          </Text>
        </div>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Доменная область
          </Text>
          <div className={styles.tagList}>
            <Tag label={domainNameById[node.domainId] ?? node.domainId} size="xs" />
          </div>
        </div>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Модуль-источник
          </Text>
          <a
            href="#"
            className={styles.link}
            onClick={(event) => {
              event.preventDefault();
              onNavigate(node.producedBy);
            }}
          >
            {producerLabel}
          </a>
        </div>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Модули-потребители
          </Text>
          {consumerLabels.length > 0 ? (
            <div className={styles.tagList}>
              {consumerLabels.map((consumer) => (
                <a
                  key={consumer.id}
                  href="#"
                  className={styles.link}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(consumer.id);
                  }}
                >
                  {consumer.label}
                </a>
              ))}
            </div>
          ) : (
            <Text size="xs" view="secondary">
              Потребители отсутствуют
            </Text>
          )}
        </div>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Тип данных
          </Text>
          <Text size="s">{node.dataType}</Text>
        </div>

        <div className={styles.section}>
          <Text size="s" weight="semibold">
            Пример данных
          </Text>
          <a href={node.sampleUrl} className={styles.link} target="_blank" rel="noreferrer">
            {node.sampleUrl}
          </a>
        </div>
      </div>
    );
  }

  const sections: { id: SectionId; title: string; content: React.ReactNode }[] = [
    {
      id: 'general',
      title: 'Общая информация',
      content: (
        <>
          <InfoRow label="Описание модуля">
            <Text size="s" className={styles.description}>
              {node.description}
            </Text>
          </InfoRow>
          <InfoRow label="Доменные области">
            <div className={styles.tagList}>
              {node.domains.map((domain) => (
                <Tag key={domain} label={domainNameById[domain] ?? domain} size="xs" />
              ))}
            </div>
          </InfoRow>
          <InfoRow label="Название продукта">
            <Text size="s">{node.productName}</Text>
          </InfoRow>
          <InfoRow label="Команда">
            <Text size="s">{node.team}</Text>
          </InfoRow>
          <InfoRow label="Владелец РИД">
            <>
              <Text size="s">{node.ridOwner.company}</Text>
              <Text size="xs" view="secondary">
                {node.ridOwner.division}
              </Text>
            </>
          </InfoRow>
          <InfoRow label="Локализация функции">
            <Text size="s">{node.localization}</Text>
          </InfoRow>
          <InfoRow label="Количество пользователей">
            <Text size="s">
              {node.userStats.companies} компаний, {node.userStats.licenses} лицензий
            </Text>
          </InfoRow>
          <InfoRow label="Стек технологий">
            <div className={styles.tagList}>
              {node.technologyStack.map((technology) => (
                <Tag key={technology} label={technology} size="xs" />
              ))}
            </div>
          </InfoRow>
          <InfoRow label="Команда проекта">
            <TeamRoster
              members={node.projectTeam}
              expanded={isTeamExpanded}
              onToggle={() => setIsTeamExpanded((prev) => !prev)}
            />
          </InfoRow>
        </>
      )
    },
    {
      id: 'calculation',
      title: 'Расчётный узел',
      content: (
        <>
          <ModuleIoSection title="Данные In" items={node.dataIn} onNavigate={onNavigate} />
          <ModuleOutputSection items={node.dataOut} onNavigate={onNavigate} />
          <InfoRow label="Формула расчёта">
            <Text size="s" className={styles.code}>
              {node.formula}
            </Text>
          </InfoRow>
        </>
      )
    },
    {
      id: 'technical',
      title: 'Техническая информация',
      content: (
        <>
          {node.repository && (
            <InfoRow label="Репозиторий">
              <a href={node.repository} target="_blank" rel="noreferrer" className={styles.link}>
                {node.repository}
              </a>
            </InfoRow>
          )}
          {node.api && (
            <InfoRow label="API">
              <Text size="s" className={styles.code}>
                {node.api}
              </Text>
            </InfoRow>
          )}
          <InfoRow label="Постановка на разработку">
            <a href={node.specificationUrl} target="_blank" rel="noreferrer" className={styles.link}>
              {node.specificationUrl}
            </a>
          </InfoRow>
          <InfoRow label="Документация контрактов API">
            <a href={node.apiContractsUrl} target="_blank" rel="noreferrer" className={styles.link}>
              {node.apiContractsUrl}
            </a>
          </InfoRow>
          <InfoRow label="Технический дизайн">
            <a href={node.techDesignUrl} target="_blank" rel="noreferrer" className={styles.link}>
              {node.techDesignUrl}
            </a>
          </InfoRow>
          <InfoRow label="Архитектурная схема">
            <a href={node.architectureDiagramUrl} target="_blank" rel="noreferrer" className={styles.link}>
              {node.architectureDiagramUrl}
            </a>
          </InfoRow>
          <InfoRow label="Интеграция с сервером лицензирования">
            <Text size="s">{node.licenseServerIntegrated ? 'Да' : 'Нет'}</Text>
          </InfoRow>
          <InfoRow label="Перечень библиотек">
            <ul className={styles.list}>
              {node.libraries.map((library) => (
                <li
                  key={`${node.id}-${library.name}-${library.version}`}
                  className={styles.listItem}
                >
                  <Text size="s">{library.name}</Text>
                  <Text size="xs" view="secondary">
                    v{library.version}
                  </Text>
                </li>
              ))}
            </ul>
          </InfoRow>
          <InfoRow label="Клиент">
            <Text size="s">{clientTypeLabels[node.clientType]}</Text>
          </InfoRow>
          <InfoRow label="Средство развертывания">
            <Text size="s">{deploymentToolLabels[node.deploymentTool]}</Text>
          </InfoRow>
          <div>
            <Text size="xs" view="secondary">
              Метрики по тестам
            </Text>
            <div className={styles.metrics}>
              <div>
                <Text size="xs" view="secondary">
                  Покрытие
                </Text>
                <Text size="m" weight="semibold">
                  {node.metrics.coverage}%
                </Text>
              </div>
              <div>
                <Text size="xs" view="secondary">
                  Всего тестов
                </Text>
                <Text size="m" weight="semibold">
                  {node.metrics.tests}
                </Text>
              </div>
              <div>
                <Text size="xs" view="secondary">
                  Автоматизация
                </Text>
                <Text size="m" weight="semibold">
                  {node.metrics.automationRate}%
                </Text>
              </div>
            </div>
          </div>
        </>
      )
    },
    {
      id: 'nonFunctional',
      title: 'Нефункциональные требования',
      content: (
        <>
          <div className={styles.metrics}>
            <div>
              <Text size="xs" view="secondary">
                Время отклика
              </Text>
              <Text size="m" weight="semibold">
                {node.nonFunctional.responseTimeMs} мс
              </Text>
            </div>
            <div>
              <Text size="xs" view="secondary">
                Пропускная способность
              </Text>
              <Text size="m" weight="semibold">
                {node.nonFunctional.throughputRps} rps
              </Text>
            </div>
            <div>
              <Text size="xs" view="secondary">
                Потребление ресурсов
              </Text>
              <Text size="m" weight="semibold">
                {node.nonFunctional.resourceConsumption}
              </Text>
              <Text size="xs" view="secondary">
                при {formatNumber(node.nonFunctional.baselineUsers)} пользователях
              </Text>
            </div>
          </div>
        </>
      )
    }
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <Text size="l" weight="bold">
            {node.name}
          </Text>
          <Badge label={statusLabel(node.status)} status={statusBadgeView[node.status]} size="s" />
        </div>
        <Button size="xs" label="Закрыть" view="ghost" onClick={onClose} />
      </header>
      <div className={styles.sections}>
        {sections.map((section) => (
          <Collapse
            key={section.id}
            label={
              <div className={styles.collapseLabel}>
                <Text size="s" weight="semibold">
                  {section.title}
                </Text>
              </div>
            }
            isOpen={openSections[section.id]}
            onClick={() => toggleSection(section.id)}
          >
            <div className={styles.sectionContent}>{section.content}</div>
          </Collapse>
        ))}
      </div>
    </div>
  );
};

function statusLabel(status: GraphNode & { type: 'module' }['status']) {
  switch (status) {
    case 'production':
      return 'В эксплуатации';
    case 'in-dev':
      return 'В разработке';
    case 'deprecated':
      return 'Устаревший';
    default:
      return status;
  }
}

function resolveEntityName(id: string): string {
  return moduleNameById[id] ?? artifactNameById[id] ?? domainNameById[id] ?? id;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('ru-RU').format(value);
}

const teamCountPluralRules = new Intl.PluralRules('ru');

function formatTeamCount(count: number): string {
  const category = teamCountPluralRules.select(count);

  switch (category) {
    case 'one':
      return `${count} специалист`;
    case 'few':
      return `${count} специалиста`;
    default:
      return `${count} специалистов`;
  }
}

type InfoRowProps = {
  label: string;
  children: React.ReactNode;
};

const InfoRow: React.FC<InfoRowProps> = ({ label, children }) => (
  <div className={styles.keyValueItem}>
    <Text size="xs" view="secondary">
      {label}
    </Text>
    <div className={styles.value}>{children}</div>
  </div>
);

type ModuleIoSectionProps = {
  title: string;
  items: ModuleInput[];
  onNavigate: (nodeId: string) => void;
};

const ModuleIoSection: React.FC<ModuleIoSectionProps> = ({ title, items, onNavigate }) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className={styles.section}>
      <Text size="s" weight="semibold">
        {title}
      </Text>
      <ul className={styles.ioList}>
        {items.map((item) => {
          const hasSource = Boolean(item.sourceId);
          const sourceLabel = item.sourceId ? resolveEntityName(item.sourceId) : null;

          return (
            <li key={item.id} className={styles.ioItem}>
              <Text size="s" weight="semibold">
                {item.label}
              </Text>
              {hasSource ? (
                <a
                  href="#"
                  className={styles.link}
                  onClick={(event) => {
                    event.preventDefault();
                    if (item.sourceId) {
                      onNavigate(item.sourceId);
                    }
                  }}
                >
                  {sourceLabel}
                </a>
              ) : (
                <Text size="xs" view="secondary">
                  Источник вне графа
                </Text>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type ModuleOutputSectionProps = {
  items: ModuleOutput[];
  onNavigate: (nodeId: string) => void;
};

const ModuleOutputSection: React.FC<ModuleOutputSectionProps> = ({
  items,
  onNavigate
}) => {
  if (!items.length) {
    return null;
  }

  return (
    <div className={styles.section}>
      <Text size="s" weight="semibold">
        Данные Out
      </Text>
      <ul className={styles.ioList}>
        {items.map((item) => {
          const consumerOptions: ConsumerOption[] = (item.consumerIds ?? []).map((consumerId) => ({
            id: consumerId,
            label: resolveEntityName(consumerId)
          }));

          return (
            <li key={item.id} className={styles.ioItem}>
              <Text size="s" weight="semibold">
                {item.label}
              </Text>
              {consumerOptions.length > 0 ? (
                <ConsumerSelect
                  options={consumerOptions}
                  onNavigate={onNavigate}
                  placeholder="Перейти к потребителю"
                />
              ) : (
                <Text size="xs" view="secondary">
                  Потребители отсутствуют
                </Text>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type ConsumerSelectProps = {
  options: ConsumerOption[];
  placeholder: string;
  onNavigate: (nodeId: string) => void;
};

const ConsumerSelect: React.FC<ConsumerSelectProps> = ({ options, placeholder, onNavigate }) => {
  const [value, setValue] = useState<ConsumerOption | null>(null);

  return (
    <Select<ConsumerOption>
      size="xs"
      placeholder={placeholder}
      items={options}
      value={value}
      getItemLabel={(option) => option.label}
      getItemKey={(option) => option.id}
      onChange={({ value: nextValue }) => {
        setValue(nextValue ?? null);

        if (!nextValue) {
          return;
        }

        const runNavigation = () => {
          onNavigate(nextValue.id);
          setValue(null);
        };

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(runNavigation);
        } else {
          setTimeout(runNavigation, 0);
        }
      }}
    />
  );
};

type TeamRosterProps = {
  members: TeamMember[];
  expanded: boolean;
  onToggle: () => void;
};

const TeamRoster: React.FC<TeamRosterProps> = ({ members, expanded, onToggle }) => {
  const uniqueRoles = Array.from(new Set(members.map((member) => member.role)));

  return (
    <div className={styles.teamRoster}>
      <div className={styles.teamRosterHeader}>
        <div className={styles.teamSummary}>
          <Text size="s">{formatTeamCount(members.length)}</Text>
          <Text size="xs" view="secondary">
            Роли: {uniqueRoles.length > 0 ? uniqueRoles.join(', ') : '—'}
          </Text>
        </div>
        <Button
          size="xs"
          view="ghost"
          label={expanded ? 'Скрыть состав' : 'Показать состав'}
          onClick={onToggle}
        />
      </div>
      {expanded && (
        <ul className={styles.list}>
          {members.map((member) => (
            <li key={member.id} className={styles.listItem}>
              <Text size="s" weight="semibold">
                {member.fullName}
              </Text>
              <Text size="xs" view="secondary">
                {member.role}
              </Text>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default NodeDetails;
