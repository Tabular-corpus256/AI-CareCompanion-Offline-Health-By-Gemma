import { DoctorAgent } from '@types';
import { ALL_AGENTS_DATA } from './agentsData';

export const ORCHESTRATOR_AGENT: DoctorAgent = ALL_AGENTS_DATA[0];
export const SPECIALIST_AGENTS: DoctorAgent[] = ALL_AGENTS_DATA.slice(1);
export const ALL_AGENTS: DoctorAgent[] = ALL_AGENTS_DATA;

export const getAgentById = (id: string): DoctorAgent | undefined => {
  return ALL_AGENTS.find(a => a.id === id);
};
