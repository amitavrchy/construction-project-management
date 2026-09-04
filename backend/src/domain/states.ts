export const transitions: Record<string, Record<string, string[]>> = {
  budget: { DRAFT: ['SUBMITTED'], SUBMITTED: ['APPROVED', 'REJECTED'] },
  requisition: { DRAFT: ['SUBMITTED', 'CANCELLED'], SUBMITTED: ['APPROVED', 'REJECTED', 'CANCELLED'], APPROVED: ['CANCELLED'] },
  bill: { DRAFT: ['SUBMITTED'], SUBMITTED: ['PM_APPROVED', 'REJECTED'], PM_APPROVED: ['ACCOUNTS_APPROVED', 'REJECTED'], ACCOUNTS_APPROVED: ['PAID'] },
  wage: { CALCULATED: ['APPROVED'], APPROVED: ['PAID'] },
  variation: { DRAFT: ['APPROVED', 'REJECTED'] },
  transfer: { IN_TRANSIT: ['RECEIVED'] },
};
export function assertTransition(kind: string, from: string, to: string) {
  if (!transitions[kind]?.[from]?.includes(to)) throw new Error(`Cannot change ${kind} from ${from} to ${to}`);
}
export const projectTransitions: Record<string, string[]> = { PLANNING: ['ACTIVE', 'CANCELLED'], ACTIVE: ['ON_HOLD', 'COMPLETED', 'CANCELLED'], ON_HOLD: ['ACTIVE', 'CANCELLED'], COMPLETED: [], CANCELLED: [] };
