import type { InitiativeStatus, TeamRole } from '../data';

export type InitiativeCreationWorkDraft = {
  id: string;
  title: string;
  description: string;
  startDay: number;
  durationDays: number;
  effortDays: number;
};

export type InitiativeCreationRoleDraft = {
  id: string;
  role: TeamRole;
  required: number;
  skills: string[];
  comment?: string;
  workItems: InitiativeCreationWorkDraft[];
};

export type InitiativeCustomerDraft = {
  company: string;
  unit: string;
  representative: string;
  contact: string;
  comment?: string;
};

export type InitiativeCreationRequest = {
  name: string;
  description: string;
  owner: string;
  expectedImpact: string;
  targetModuleName: string;
  status: InitiativeStatus;
  domains: string[];
  potentialModules: string[];
  customer: InitiativeCustomerDraft;
  roles: InitiativeCreationRoleDraft[];
};
