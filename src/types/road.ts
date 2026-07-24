export type RoadState =
  | 'open'
  | 'caution'
  | 'extreme-caution'
  | 'chains-required'
  | 'closed'
  | 'unknown';

export interface RoadStatus {
  route: 'RP 222';
  destination: 'Las Leñas';
  status: RoadState;
  statement: string | null;
  chainsRequired: boolean | null;
  machineryWorking: boolean | null;
  hazards: Array<'nieve' | 'hielo' | 'barro' | 'agua' | 'derrumbes'>;
  reportedAt: string | null;
  fetchedAt: string;
  sourceName: 'Gobierno de Mendoza';
  sourceUrl: string;
}
