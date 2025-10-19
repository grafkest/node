import { Badge } from '@consta/uikit/Badge';
import { Button } from '@consta/uikit/Button';
import { Modal } from '@consta/uikit/Modal';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import React, { useMemo, useState } from 'react';
import type { ExpertProfile } from '../data';
import styles from './ExpertSelectionModal.module.css';

type ExpertSelectionModalProps = {
  isOpen: boolean;
  experts: ExpertProfile[];
  selectedExpertId: string | null;
  onSelect: (expertId: string | null) => void;
  onClose: () => void;
};

const availabilityStatus: Record<ExpertProfile['availability'], { label: string; status: 'success' | 'warning' | 'alert' }>
 = {
  available: { label: 'Доступен', status: 'success' },
  partial: { label: 'Частичная загрузка', status: 'warning' },
  busy: { label: 'Занят', status: 'alert' }
};

const ExpertSelectionModal: React.FC<ExpertSelectionModalProps> = ({
  isOpen,
  experts,
  selectedExpertId,
  onSelect,
  onClose
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return experts;
    }
    const normalized = query.trim().toLowerCase();
    return experts.filter((expert) => {
      const source = [expert.fullName, expert.title, expert.location, ...expert.skills.map((skill) => skill.id)]
        .join(' ')
        .toLowerCase();
      return source.includes(normalized);
    });
  }, [experts, query]);

  const handleSelect = (expertId: string | null) => {
    onSelect(expertId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      hasOverlay
      onEsc={onClose}
      className={styles.modal}
      position="center"
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <Text size="l" weight="bold">
            Выбор эксперта
          </Text>
          <Text size="s" view="secondary">
            Найдите специалиста и закрепите за задачей.
          </Text>
          <TextField
            size="s"
            placeholder="Поиск по имени, роли или навыкам"
            value={query}
            onChange={(value) => setQuery(value ?? '')}
          />
        </header>
        <div className={styles.list}>
          {filtered.length === 0 ? (
            <Text size="s" view="secondary">
              По запросу ничего не найдено.
            </Text>
          ) : (
            filtered.map((expert) => {
              const availability = availabilityStatus[expert.availability];
              const isSelected = expert.id === selectedExpertId;
              return (
                <div key={expert.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <Text size="s" weight="semibold">
                        {expert.fullName}
                      </Text>
                      <Text size="xs" view="secondary">
                        {expert.title}
                      </Text>
                    </div>
                    <Badge size="xs" status={availability.status} label={availability.label} />
                  </div>
                  <div className={styles.cardMeta}>
                    <Badge size="xs" view="stroked" label={expert.location} />
                    <Badge size="xs" view="stroked" label={`${expert.experienceYears} лет опыта`} />
                  </div>
                  {expert.skills.length > 0 && (
                    <div className={styles.skillList}>
                      {expert.skills.slice(0, 4).map((skill) => (
                        <Badge key={`${expert.id}-${skill.id}`} size="2xs" view="ghost" label={skill.id} />
                      ))}
                      {expert.skills.length > 4 && (
                        <Badge size="2xs" view="ghost" label={`+${expert.skills.length - 4}`} />
                      )}
                    </div>
                  )}
                  <div className={styles.actions}>
                    <Button
                      size="s"
                      view={isSelected ? 'secondary' : 'primary'}
                      label={isSelected ? 'Выбран' : 'Выбрать'}
                      onClick={() => handleSelect(expert.id)}
                    />
                    {isSelected && (
                      <Button
                        size="s"
                        view="ghost"
                        label="Сбросить"
                        onClick={() => handleSelect(null)}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <footer className={styles.footer}>
          <Button size="s" view="ghost" label="Закрыть" onClick={onClose} />
        </footer>
      </div>
    </Modal>
  );
};

export default ExpertSelectionModal;
