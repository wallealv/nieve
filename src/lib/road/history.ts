import type { RoadStatus } from '../../types/road.js';

export interface RoadStatusChange {
  previousStatus: RoadStatus['status'];
  currentStatus: RoadStatus['status'];
  changedFields: Array<'status' | 'chainsRequired' | 'machineryWorking'>;
  message: string;
  fingerprint: string;
}

function label(status: RoadStatus['status']): string {
  return {
    open: 'transitable',
    caution: 'con precaución',
    'extreme-caution': 'con suma precaución',
    'chains-required': 'con cadenas obligatorias',
    closed: 'cerrada',
    unknown: 'sin estado interpretable',
  }[status];
}

export function compareRoadStatus(
  previous: RoadStatus | null,
  current: RoadStatus,
): RoadStatusChange | null {
  if (!previous) return null;
  const changedFields: RoadStatusChange['changedFields'] = [];
  if (previous.status !== current.status) changedFields.push('status');
  if (previous.chainsRequired !== current.chainsRequired) changedFields.push('chainsRequired');
  if (previous.machineryWorking !== current.machineryWorking) changedFields.push('machineryWorking');
  if (changedFields.length === 0) return null;

  const messages: string[] = [];
  if (changedFields.includes('status')) messages.push(`La RP 222 pasó de ${label(previous.status)} a ${label(current.status)}.`);
  if (changedFields.includes('chainsRequired')) {
    messages.push(current.chainsRequired ? 'Ahora se informan cadenas obligatorias.' : 'Ya no se informan cadenas obligatorias.');
  }
  if (changedFields.includes('machineryWorking')) {
    messages.push(current.machineryWorking ? 'Se informó maquinaria trabajando.' : 'Ya no se informa maquinaria trabajando.');
  }

  return {
    previousStatus: previous.status,
    currentStatus: current.status,
    changedFields,
    message: messages.join(' '),
    fingerprint: `${previous.status}:${current.status}:${previous.chainsRequired}:${current.chainsRequired}:${previous.machineryWorking}:${current.machineryWorking}:${current.reportedAt ?? current.fetchedAt}`,
  };
}
