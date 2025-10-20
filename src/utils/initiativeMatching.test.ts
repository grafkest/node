import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRoleMatchReports,
  type RolePlanningDraft
} from './initiativeMatching';
import type { ExpertProfile } from '../data';

const baseExpert: ExpertProfile = {
  id: 'expert-1',
  fullName: 'Тестовый Эксперт',
  title: 'Специалист',
  summary: 'Описание эксперта',
  domains: [],
  modules: [],
  competencies: [],
  consultingSkills: [],
  focusAreas: [],
  experienceYears: 5,
  location: 'Москва',
  contact: 'expert@example.com',
  languages: ['ru'],
  notableProjects: [],
  availability: 'available',
  availabilityComment: '',
  skills: []
};

describe('buildRoleMatchReports', () => {
  it('includes work item skills in role requirements and scoring', () => {
    const role: RolePlanningDraft = {
      id: 'role-1',
      role: 'Аналитик',
      required: 1,
      skills: [],
      workItems: [
        {
          id: 'work-1',
          title: 'Исследование',
          description: 'Аналитическая задача',
          startDay: 0,
          durationDays: 5,
          effortDays: 5,
          tasks: ['Оптимизация размещения инфраструктуры']
        }
      ]
    };

    const expert: ExpertProfile = {
      ...baseExpert,
      competencies: ['Оптимизация размещения инфраструктуры']
    };

    const [report] = buildRoleMatchReports([role], [expert]);

    assert.ok(report, 'Report should be generated');
    assert.deepEqual(report.requirement.skills.map((skill) => skill.name), [
      'Оптимизация размещения инфраструктуры'
    ]);

    const [match] = report.matches;
    assert.ok(match, 'Match should be calculated for the expert');
    assert.ok(
      match.explanation.normalizedSkillScore > 0,
      'Skill score should reflect provided task skill'
    );
  });
});

