import { Button } from '@consta/uikit/Button';
import { Combobox } from '@consta/uikit/Combobox';
import { Tabs } from '@consta/uikit/Tabs';
import { Text } from '@consta/uikit/Text';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ArtifactNode,
  DomainNode,
  ModuleNode,
  ModuleStatus,
  ModuleInput,
  ModuleOutput
} from '../data';
import styles from './EntityCreation.module.css';

type EntityCreationProps = {
  modules: ModuleNode[];
  domains: DomainNode[];
  artifacts: ArtifactNode[];
};

type CreationTab = 'module' | 'domain' | 'artifact';

type ModuleInputDraft = {
  id: string;
  label: string;
  sourceId: string | null;
};

type ModuleOutputDraft = {
  id: string;
  label: string;
  consumerIds: string[];
};

type SubmissionState = {
  mode: CreationTab;
  payload: unknown;
};

const creationTabs = [
  { label: 'Новый модуль', value: 'module' },
  { label: 'Новый домен', value: 'domain' },
  { label: 'Новый артефакт', value: 'artifact' }
] as const satisfies readonly { label: string; value: CreationTab }[];

const statusLabels: Record<ModuleStatus, string> = {
  'in-dev': 'В разработке',
  production: 'В эксплуатации',
  deprecated: 'Устаревший'
};

const EntityCreation: React.FC<EntityCreationProps> = ({ modules, domains, artifacts }) => {
  const [activeTab, setActiveTab] = useState<CreationTab>('module');
  const [submission, setSubmission] = useState<SubmissionState | null>(null);

  const domainLabelMap = useMemo(() => buildDomainLabelMap(domains), [domains]);
  const domainItems = useMemo(
    () => Object.keys(domainLabelMap).sort((a, b) => domainLabelMap[a].localeCompare(domainLabelMap[b], 'ru')),
    [domainLabelMap]
  );

  const moduleLabelMap = useMemo(
    () =>
      modules
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .reduce<Record<string, string>>((acc, module) => {
          acc[module.id] = module.name;
          return acc;
        }, {}),
    [modules]
  );
  const moduleItems = useMemo(() => Object.keys(moduleLabelMap), [moduleLabelMap]);

  const artifactLabelMap = useMemo(
    () =>
      artifacts
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        .reduce<Record<string, string>>((acc, artifact) => {
          acc[artifact.id] = artifact.name;
          return acc;
        }, {}),
    [artifacts]
  );
  const artifactItems = useMemo(() => Object.keys(artifactLabelMap), [artifactLabelMap]);

  useEffect(() => {
    setSubmission(null);
  }, [activeTab]);

  const handleSubmit = (mode: CreationTab, payload: unknown) => {
    setSubmission({ mode, payload });
  };

  return (
    <div className={styles.container}>
      <Tabs
        size="s"
        className={styles.tabs}
        items={creationTabs}
        value={creationTabs.find((tab) => tab.value === activeTab)}
        getItemKey={(item) => item.value}
        getItemLabel={(item) => item.label}
        onChange={(tab) => setActiveTab(tab.value)}
      />

      <div className={styles.content}>
        {activeTab === 'module' && (
          <ModuleForm
            onSubmit={handleSubmit}
            domainItems={domainItems}
            domainLabelMap={domainLabelMap}
            moduleItems={moduleItems}
            moduleLabelMap={moduleLabelMap}
            artifactItems={artifactItems}
            artifactLabelMap={artifactLabelMap}
          />
        )}

        {activeTab === 'domain' && (
          <DomainForm
            onSubmit={handleSubmit}
            domainItems={domainItems}
            domainLabelMap={domainLabelMap}
            moduleItems={moduleItems}
            moduleLabelMap={moduleLabelMap}
          />
        )}

        {activeTab === 'artifact' && (
          <ArtifactForm
            onSubmit={handleSubmit}
            domainItems={domainItems}
            domainLabelMap={domainLabelMap}
            moduleItems={moduleItems}
            moduleLabelMap={moduleLabelMap}
          />
        )}

        <aside className={styles.sidebar}>
          <Text size="s" weight="semibold" className={styles.sidebarTitle}>
            Итоговая карточка
          </Text>
          {submission ? (
            <div className={styles.submission}>
              <Text size="xs" view="secondary" className={styles.submissionHint}>
                Данные готовы к передаче в систему управления. Вы можете скопировать JSON
                и сохранить карточку.
              </Text>
              <div className={styles.submissionMeta}>
                <Text size="xs" weight="semibold">
                  Тип: {submissionLabel(submission.mode)}
                </Text>
              </div>
              <pre className={styles.submissionJson}>
                {JSON.stringify(submission.payload, null, 2)}
              </pre>
            </div>
          ) : (
            <Text size="xs" view="secondary">
              После заполнения формы нажмите «Сформировать карточку», чтобы получить
              структурированное описание сущности.
            </Text>
          )}
        </aside>
      </div>
    </div>
  );
};

type CommonFormProps = {
  onSubmit: (mode: CreationTab, payload: unknown) => void;
  domainItems: string[];
  domainLabelMap: Record<string, string>;
  moduleItems: string[];
  moduleLabelMap: Record<string, string>;
};

type ModuleFormProps = CommonFormProps & {
  artifactItems: string[];
  artifactLabelMap: Record<string, string>;
};

const ModuleForm: React.FC<ModuleFormProps> = ({
  onSubmit,
  domainItems,
  domainLabelMap,
  moduleItems,
  moduleLabelMap,
  artifactItems,
  artifactLabelMap
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productName, setProductName] = useState('');
  const [team, setTeam] = useState('');
  const [status, setStatus] = useState<ModuleStatus>('in-dev');
  const [domains, setDomains] = useState<string[]>([]);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [produces, setProduces] = useState<string[]>([]);

  const [inputs, setInputs] = useState<ModuleInputDraft[]>([
    { id: 'input-0', label: '', sourceId: null }
  ]);
  const [outputs, setOutputs] = useState<ModuleOutputDraft[]>([
    { id: 'output-0', label: '', consumerIds: [] }
  ]);

  const inputIdRef = useRef(1);
  const outputIdRef = useRef(1);

  const addInput = () => {
    const nextId = `input-${inputIdRef.current++}`;
    setInputs((prev) => [...prev, { id: nextId, label: '', sourceId: null }]);
  };

  const addOutput = () => {
    const nextId = `output-${outputIdRef.current++}`;
    setOutputs((prev) => [...prev, { id: nextId, label: '', consumerIds: [] }]);
  };

  const updateInput = (id: string, patch: Partial<ModuleInputDraft>) => {
    setInputs((prev) => prev.map((input) => (input.id === id ? { ...input, ...patch } : input)));
  };

  const updateOutput = (id: string, patch: Partial<ModuleOutputDraft>) => {
    setOutputs((prev) => prev.map((output) => (output.id === id ? { ...output, ...patch } : output)));
  };

  const removeInput = (id: string) => {
    setInputs((prev) => (prev.length === 1 ? prev : prev.filter((input) => input.id !== id)));
  };

  const removeOutput = (id: string) => {
    setOutputs((prev) => (prev.length === 1 ? prev : prev.filter((output) => output.id !== id)));
  };

  const preview = useMemo(
    () => ({
      name: name.trim() || 'Без названия',
      description: description.trim() || '—',
      productName: productName.trim() || '—',
      team: team.trim() || '—',
      status: statusLabels[status],
      domains: domains.map((id) => domainLabelMap[id] ?? id),
      dependencies: dependencies.map((id) => moduleLabelMap[id] ?? id),
      produces: produces.map((id) => artifactLabelMap[id] ?? id),
      dataIn: inputs.map((input) => ({
        label: input.label.trim() || 'Без названия',
        source: input.sourceId ? artifactLabelMap[input.sourceId] ?? input.sourceId : 'Не связано'
      })),
      dataOut: outputs.map((output) => ({
        label: output.label.trim() || 'Без названия',
        consumers: output.consumerIds.map((id) => moduleLabelMap[id] ?? id)
      }))
    }),
    [
      name,
      description,
      productName,
      team,
      status,
      domains,
      domainLabelMap,
      dependencies,
      moduleLabelMap,
      produces,
      artifactLabelMap,
      inputs,
      outputs
    ]
  );

  const payload = useMemo(
    () => ({
      name: name.trim(),
      description: description.trim(),
      productName: productName.trim(),
      team: team.trim(),
      status,
      domainIds: domains,
      dependencyIds: dependencies,
      producedArtifactIds: produces,
      dataIn: inputs.map<ModuleInput>((input, index) => ({
        id: input.id || `input-${index}`,
        label: input.label.trim() || `Вход ${index + 1}`,
        sourceId: input.sourceId ?? undefined
      })),
      dataOut: outputs.map<ModuleOutput>((output, index) => ({
        id: output.id || `output-${index}`,
        label: output.label.trim() || `Выход ${index + 1}`,
        consumerIds: output.consumerIds
      }))
    }),
    [name, description, productName, team, status, domains, dependencies, produces, inputs, outputs]
  );

  return (
    <section className={styles.form}>
      <Text size="s" weight="semibold" className={styles.formTitle}>
        Описание модуля
      </Text>

      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Название
          </Text>
          <input
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Realtime Analytics Engine"
          />
        </label>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Краткое описание
          </Text>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Опишите назначение и ключевые сценарии использования"
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <Text size="xs" weight="semibold" className={styles.label}>
              Команда
            </Text>
            <input
              className={styles.input}
              value={team}
              onChange={(event) => setTeam(event.target.value)}
              placeholder="Команда сопровождения"
            />
          </label>

          <label className={styles.field}>
            <Text size="xs" weight="semibold" className={styles.label}>
              Продукт
            </Text>
            <input
              className={styles.input}
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Название продукта"
            />
          </label>
        </div>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Статус
          </Text>
          <Combobox<ModuleStatus>
            size="s"
            placeholder="Выберите статус"
            items={Object.keys(statusLabels) as ModuleStatus[]}
            value={status}
            getItemKey={(item) => item}
            getItemLabel={(item) => statusLabels[item]}
            onChange={(next) => setStatus(next ?? 'in-dev')}
            className={styles.combobox}
          />
        </label>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Доменные области
          </Text>
          <Combobox<string>
            size="s"
            placeholder="Добавьте домены"
            items={domainItems}
            value={domains}
            multiple
            selectAll
            getItemKey={(item) => item}
            getItemLabel={(item) => domainLabelMap[item] ?? item}
            onChange={(next) => setDomains(next ?? [])}
            className={styles.combobox}
          />
        </label>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Зависит от модулей
          </Text>
          <Combobox<string>
            size="s"
            placeholder="Выберите зависимости"
            items={moduleItems}
            value={dependencies}
            multiple
            getItemKey={(item) => item}
            getItemLabel={(item) => moduleLabelMap[item] ?? item}
            onChange={(next) => setDependencies(next ?? [])}
            className={styles.combobox}
          />
        </label>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Производит артефакты
          </Text>
          <Combobox<string>
            size="s"
            placeholder="Выберите артефакты"
            items={artifactItems}
            value={produces}
            multiple
            getItemKey={(item) => item}
            getItemLabel={(item) => artifactLabelMap[item] ?? item}
            onChange={(next) => setProduces(next ?? [])}
            className={styles.combobox}
          />
        </label>
      </div>

      <div className={styles.section}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Входные данные
        </Text>
        <div className={styles.nestedGroup}>
          {inputs.map((input) => (
            <div key={input.id} className={styles.nestedRow}>
              <input
                className={styles.input}
                value={input.label}
                onChange={(event) => updateInput(input.id, { label: event.target.value })}
                placeholder="Название входного набора"
              />
              <Combobox<string>
                size="s"
                placeholder="Источник артефактов"
                items={artifactItems}
                value={input.sourceId}
                getItemKey={(item) => item}
                getItemLabel={(item) => artifactLabelMap[item] ?? item}
                onChange={(next) => updateInput(input.id, { sourceId: next ?? null })}
                className={styles.combobox}
              />
              <Button
                size="xs"
                view="ghost"
                label="Удалить"
                onClick={() => removeInput(input.id)}
                disabled={inputs.length === 1}
              />
            </div>
          ))}
        </div>
        <Button size="xs" view="secondary" label="Добавить вход" onClick={addInput} />
      </div>

      <div className={styles.section}>
        <Text size="xs" weight="semibold" className={styles.sectionTitle}>
          Выходные данные
        </Text>
        <div className={styles.nestedGroup}>
          {outputs.map((output) => (
            <div key={output.id} className={styles.nestedRow}>
              <input
                className={styles.input}
                value={output.label}
                onChange={(event) => updateOutput(output.id, { label: event.target.value })}
                placeholder="Название выходного артефакта"
              />
              <Combobox<string>
                size="s"
                placeholder="Потребители"
                items={moduleItems}
                value={output.consumerIds}
                multiple
                getItemKey={(item) => item}
                getItemLabel={(item) => moduleLabelMap[item] ?? item}
                onChange={(next) => updateOutput(output.id, { consumerIds: next ?? [] })}
                className={styles.combobox}
              />
              <Button
                size="xs"
                view="ghost"
                label="Удалить"
                onClick={() => removeOutput(output.id)}
                disabled={outputs.length === 1}
              />
            </div>
          ))}
        </div>
        <Button size="xs" view="secondary" label="Добавить выход" onClick={addOutput} />
      </div>

      <PreviewBlock preview={preview} />

      <div className={styles.actions}>
        <Button
          size="s"
          label="Сформировать карточку"
          view="primary"
          onClick={() => onSubmit('module', payload)}
        />
      </div>
    </section>
  );
};

type DomainFormProps = CommonFormProps;

const DomainForm: React.FC<DomainFormProps> = ({
  onSubmit,
  domainItems,
  domainLabelMap,
  moduleItems,
  moduleLabelMap
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [relatedModules, setRelatedModules] = useState<string[]>([]);

  const preview = useMemo(
    () => ({
      name: name.trim() || 'Без названия',
      description: description.trim() || '—',
      parent: parentId ? domainLabelMap[parentId] ?? parentId : 'Корневой домен',
      modules: relatedModules.map((id) => moduleLabelMap[id] ?? id)
    }),
    [name, description, parentId, relatedModules, domainLabelMap, moduleLabelMap]
  );

  const payload = useMemo(
    () => ({
      name: name.trim(),
      description: description.trim(),
      parentId: parentId ?? undefined,
      moduleIds: relatedModules
    }),
    [name, description, parentId, relatedModules]
  );

  return (
    <section className={styles.form}>
      <Text size="s" weight="semibold" className={styles.formTitle}>
        Описание домена
      </Text>

      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Название
          </Text>
          <input
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Мониторинг производственных объектов"
          />
        </label>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Описание
          </Text>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Раскройте границы домена и основные сценарии"
          />
        </label>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Родительский домен
          </Text>
          <Combobox<string>
            size="s"
            placeholder="Корневой уровень"
            items={domainItems}
            value={parentId}
            getItemKey={(item) => item}
            getItemLabel={(item) => domainLabelMap[item] ?? item}
            onChange={(next) => setParentId(next ?? null)}
            className={styles.combobox}
          />
        </label>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Связанные модули
          </Text>
          <Combobox<string>
            size="s"
            placeholder="Выберите модули"
            items={moduleItems}
            value={relatedModules}
            multiple
            getItemKey={(item) => item}
            getItemLabel={(item) => moduleLabelMap[item] ?? item}
            onChange={(next) => setRelatedModules(next ?? [])}
            className={styles.combobox}
          />
        </label>
      </div>

      <PreviewBlock preview={preview} />

      <div className={styles.actions}>
        <Button
          size="s"
          label="Сформировать карточку"
          view="primary"
          onClick={() => onSubmit('domain', payload)}
        />
      </div>
    </section>
  );
};

type ArtifactFormProps = CommonFormProps;

const ArtifactForm: React.FC<ArtifactFormProps> = ({
  onSubmit,
  domainItems,
  domainLabelMap,
  moduleItems,
  moduleLabelMap
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [domainId, setDomainId] = useState<string | null>(null);
  const [producerId, setProducerId] = useState<string | null>(null);
  const [consumerIds, setConsumerIds] = useState<string[]>([]);
  const [dataType, setDataType] = useState('');
  const [sampleUrl, setSampleUrl] = useState('');

  const preview = useMemo(
    () => ({
      name: name.trim() || 'Без названия',
      description: description.trim() || '—',
      domain: domainId ? domainLabelMap[domainId] ?? domainId : 'Не выбран',
      producedBy: producerId ? moduleLabelMap[producerId] ?? producerId : 'Не выбран',
      consumers: consumerIds.map((id) => moduleLabelMap[id] ?? id),
      dataType: dataType.trim() || '—',
      sampleUrl: sampleUrl.trim() || '—'
    }),
    [name, description, domainId, producerId, consumerIds, dataType, sampleUrl, domainLabelMap, moduleLabelMap]
  );

  const payload = useMemo(
    () => ({
      name: name.trim(),
      description: description.trim(),
      domainId: domainId ?? undefined,
      producedBy: producerId ?? undefined,
      consumerIds,
      dataType: dataType.trim(),
      sampleUrl: sampleUrl.trim()
    }),
    [name, description, domainId, producerId, consumerIds, dataType, sampleUrl]
  );

  return (
    <section className={styles.form}>
      <Text size="s" weight="semibold" className={styles.formTitle}>
        Описание артефакта
      </Text>

      <div className={styles.fieldGroup}>
        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Название
          </Text>
          <input
            className={styles.input}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Пакет рекомендаций по оптимизации"
          />
        </label>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Описание
          </Text>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Опишите структуру и назначение артефакта"
          />
        </label>

        <div className={styles.row}>
          <label className={styles.field}>
            <Text size="xs" weight="semibold" className={styles.label}>
              Тип данных
            </Text>
            <input
              className={styles.input}
              value={dataType}
              onChange={(event) => setDataType(event.target.value)}
              placeholder="Например, Потоковые данные"
            />
          </label>

          <label className={styles.field}>
            <Text size="xs" weight="semibold" className={styles.label}>
              Пример / ссылка
            </Text>
            <input
              className={styles.input}
              value={sampleUrl}
              onChange={(event) => setSampleUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Доменная область
          </Text>
          <Combobox<string>
            size="s"
            placeholder="Выберите домен"
            items={domainItems}
            value={domainId}
            getItemKey={(item) => item}
            getItemLabel={(item) => domainLabelMap[item] ?? item}
            onChange={(next) => setDomainId(next ?? null)}
            className={styles.combobox}
          />
        </label>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Производящий модуль
          </Text>
          <Combobox<string>
            size="s"
            placeholder="Укажите источник"
            items={moduleItems}
            value={producerId}
            getItemKey={(item) => item}
            getItemLabel={(item) => moduleLabelMap[item] ?? item}
            onChange={(next) => setProducerId(next ?? null)}
            className={styles.combobox}
          />
        </label>

        <label className={styles.field}>
          <Text size="xs" weight="semibold" className={styles.label}>
            Потребители
          </Text>
          <Combobox<string>
            size="s"
            placeholder="Выберите модули-потребители"
            items={moduleItems}
            value={consumerIds}
            multiple
            getItemKey={(item) => item}
            getItemLabel={(item) => moduleLabelMap[item] ?? item}
            onChange={(next) => setConsumerIds(next ?? [])}
            className={styles.combobox}
          />
        </label>
      </div>

      <PreviewBlock preview={preview} />

      <div className={styles.actions}>
        <Button
          size="s"
          label="Сформировать карточку"
          view="primary"
          onClick={() => onSubmit('artifact', payload)}
        />
      </div>
    </section>
  );
};

type PreviewBlockProps = {
  preview: Record<string, unknown>;
};

const PreviewBlock: React.FC<PreviewBlockProps> = ({ preview }) => {
  return (
    <div className={styles.preview}>
      <Text size="xs" weight="semibold" className={styles.sectionTitle}>
        Предпросмотр
      </Text>
      <dl className={styles.previewList}>
        {Object.entries(preview).map(([key, value]) => (
          <div key={key} className={styles.previewItem}>
            <dt>{key}</dt>
            <dd>{formatPreviewValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

function formatPreviewValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '—';
    }
    return value
      .map((item) => (typeof item === 'string' ? item : formatPreviewValue(item)))
      .join(', ');
  }

  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, nestedValue]) => `${key}: ${formatPreviewValue(nestedValue)}`)
      .join('; ');
  }

  if (typeof value === 'string') {
    return value.length > 0 ? value : '—';
  }

  return String(value);
}

function buildDomainLabelMap(domains: DomainNode[]): Record<string, string> {
  const labels: Record<string, string> = {};

  const traverse = (nodes: DomainNode[], parents: string[]) => {
    nodes.forEach((node) => {
      const currentPath = [...parents, node.name];
      labels[node.id] = currentPath.join(' / ');
      if (node.children && node.children.length > 0) {
        traverse(node.children, currentPath);
      }
    });
  };

  traverse(domains, []);
  return labels;
}

function submissionLabel(mode: CreationTab): string {
  switch (mode) {
    case 'module':
      return 'Модуль';
    case 'domain':
      return 'Домен';
    case 'artifact':
      return 'Артефакт';
    default:
      return mode;
  }
}

export default EntityCreation;
