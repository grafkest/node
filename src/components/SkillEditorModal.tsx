import { Button } from '@consta/uikit/Button';
import { Modal } from '@consta/uikit/Modal';
import { Select } from '@consta/uikit/Select';
import { Text } from '@consta/uikit/Text';
import { TextField } from '@consta/uikit/TextField';
import React, { useEffect, useMemo, useState } from 'react';
import type {
  ExpertProfile,
  ExpertSkill,
  SkillEvidenceStatus,
  SkillLevel
} from '../data';
import { getSkillNameById } from '../data/skills';
import styles from './SkillEditorModal.module.css';

type SkillEditorModalProps = {
  expert: ExpertProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (skills: ExpertSkill[]) => void | Promise<void>;
};

type SelectOption<Value> = {
  label: string;
  value: Value;
};

const skillLevelLabels: Record<SkillLevel, string> = {
  A: 'A — Эксперт',
  B: 'B — Продвинутый',
  C: 'C — Уверенный',
  D: 'D — Базовый',
  E: 'E — Новичок'
};

const proofStatusLabels: Record<SkillEvidenceStatus, string> = {
  verified: 'Подтверждено',
  'in-review': 'На проверке',
  'self-reported': 'Самооценка'
};

const skillLevelOptions: SelectOption<SkillLevel>[] = (
  Object.keys(skillLevelLabels) as SkillLevel[]
).map((value) => ({
  value,
  label: skillLevelLabels[value]
}));

const proofStatusOptions: SelectOption<SkillEvidenceStatus>[] = (
  Object.keys(proofStatusLabels) as SkillEvidenceStatus[]
).map((value) => ({
  value,
  label: proofStatusLabels[value]
}));

const cloneSkill = (skill: ExpertSkill): ExpertSkill => ({
  ...skill,
  artifacts: [...skill.artifacts],
  usage: skill.usage ? { ...skill.usage } : undefined
});

const createEmptySkill = (): ExpertSkill => ({
  id: '',
  level: 'C',
  proofStatus: 'self-reported',
  artifacts: [],
  interest: 'medium',
  availableFte: 0
});

const SkillEditorModal: React.FC<SkillEditorModalProps> = ({
  expert,
  isOpen,
  onClose,
  onSave
}) => {
  const [draftSkills, setDraftSkills] = useState<ExpertSkill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDraftSkills([]);
      setError(null);
      setIsSubmitting(false);
      return;
    }
    setDraftSkills(expert.skills.map(cloneSkill));
    setError(null);
    setIsSubmitting(false);
  }, [expert, isOpen]);

  const hasChanges = useMemo(() => {
    if (draftSkills.length !== expert.skills.length) {
      return true;
    }
    return draftSkills.some((skill, index) => {
      const reference = expert.skills[index];
      return (
        skill.id !== reference.id ||
        skill.level !== reference.level ||
        skill.proofStatus !== reference.proofStatus
      );
    });
  }, [draftSkills, expert.skills]);

  const handleSkillChange = <Key extends keyof ExpertSkill>(
    index: number,
    key: Key,
    value: ExpertSkill[Key]
  ) => {
    setDraftSkills((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleRemoveSkill = (index: number) => {
    setDraftSkills((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleAddSkill = () => {
    setDraftSkills((prev) => [...prev, createEmptySkill()]);
  };

  const normalizedSkills = useMemo(() =>
    draftSkills.map((skill) => ({
      ...skill,
      id: skill.id.trim(),
      artifacts: [...skill.artifacts],
      usage: skill.usage ? { ...skill.usage } : undefined
    })),
  [draftSkills]);

  const validationError = useMemo(() => {
    if (normalizedSkills.some((skill) => skill.id.length === 0)) {
      return 'Укажите идентификаторы всех навыков.';
    }
    const ids = normalizedSkills.map((skill) => skill.id.toLowerCase());
    const duplicateIndex = ids.findIndex((id, index) => ids.indexOf(id) !== index);
    if (duplicateIndex >= 0) {
      return `Навык «${normalizedSkills[duplicateIndex].id}» указан более одного раза.`;
    }
    return null;
  }, [normalizedSkills]);

  const handleSubmit = async () => {
    if (validationError) {
      setError(validationError);
      return;
    }
    if (isSubmitting) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await Promise.resolve(onSave(normalizedSkills));
    } catch (submitError) {
      if (submitError instanceof Error) {
        setError(submitError.message);
      } else {
        setError('Не удалось сохранить изменения. Попробуйте ещё раз.');
      }
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
  };

  return (
    <Modal isOpen={isOpen} hasOverlay onClickOutside={onClose} onEsc={onClose}>
      <div className={styles.root}>
        <div className={styles.header}>
          <Text size="l" weight="bold">
            Навыки эксперта
          </Text>
          <Text size="s" view="secondary">
            {expert.fullName}
        </Text>
        <Text size="xs" view="ghost">
          Управляйте перечнем навыков, уровнями и подтверждением.
        </Text>
      </div>
      <div className={styles.skillList}>
        {draftSkills.length === 0 ? (
          <Text size="s" view="secondary">
            У эксперта пока нет навыков. Добавьте первый навык, чтобы продолжить.
          </Text>
        ) : (
          draftSkills.map((skill, index) => {
            const levelOption = skillLevelOptions.find((option) => option.value === skill.level);
            const proofOption = proofStatusOptions.find(
              (option) => option.value === skill.proofStatus
            );
            const resolvedName = getSkillNameById(skill.id.trim());
            return (
              <div key={`skill-${index}`} className={styles.skillCard}>
                <div className={styles.skillHeader}>
                  <TextField
                    size="s"
                    label="Идентификатор навыка"
                    placeholder="Например, data-governance"
                    value={skill.id}
                    onChange={(value) => handleSkillChange(index, 'id', value ?? '')}
                  />
                  {resolvedName && (
                    <Text size="xs" className={styles.skillNameHint}>
                      {resolvedName}
                    </Text>
                  )}
                </div>
                <div className={styles.skillMeta}>
                  <Select<SelectOption<SkillLevel>>
                    size="s"
                    label="Уровень владения"
                    items={skillLevelOptions}
                    value={levelOption ?? skillLevelOptions[0]}
                    getItemLabel={(item) => item.label}
                    getItemKey={(item) => item.value}
                    onChange={(option) =>
                      option && handleSkillChange(index, 'level', option.value)
                    }
                  />
                  <Select<SelectOption<SkillEvidenceStatus>>
                    size="s"
                    label="Статус подтверждения"
                    items={proofStatusOptions}
                    value={proofOption ?? proofStatusOptions[0]}
                    getItemLabel={(item) => item.label}
                    getItemKey={(item) => item.value}
                    onChange={(option) =>
                      option && handleSkillChange(index, 'proofStatus', option.value)
                    }
                  />
                </div>
                <div className={styles.skillActions}>
                  <Button
                    size="xs"
                    view="ghost"
                    label="Удалить"
                    onClick={() => handleRemoveSkill(index)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      <Button
        size="s"
        view="secondary"
        label="Добавить навык"
        className={styles.addButton}
        onClick={handleAddSkill}
        disabled={isSubmitting}
      />
      <div className={styles.footer}>
        <div>
          {(error ?? validationError) && (
            <Text size="s" view="alert" className={styles.error}>
              {error ?? validationError}
            </Text>
          )}
          {!hasChanges && !error && !validationError && (
            <Text size="xs" view="secondary">
              Изменений не обнаружено.
            </Text>
          )}
        </div>
        <div className={styles.skillActions}>
          <Button
            size="s"
            view="ghost"
            label="Отменить"
            onClick={onClose}
            disabled={isSubmitting}
          />
          <Button
            size="s"
            view="primary"
            label="Сохранить"
            onClick={handleSubmit}
            disabled={isSubmitting || (!hasChanges && !validationError)}
            loading={isSubmitting}
          />
        </div>
      </div>
      </div>
    </Modal>
  );
};

export default SkillEditorModal;
