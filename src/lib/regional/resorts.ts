import type { MountainLevelConfig } from '../../types/forecast.js';
import type { RegionalResortConfig } from '../../types/regional.js';

export const REGIONAL_RESORTS: RegionalResortConfig[] = [
  {
    id: 'las-lenas',
    name: 'Las Leñas',
    country: 'Argentina',
    timezone: 'America/Argentina/Mendoza',
    officialUrl: 'https://laslenas.com/',
    base: { latitude: -35.1486, longitude: -70.0811, elevationM: 2240 },
    summit: { latitude: -35.1376, longitude: -70.1118, elevationM: 3430 },
  },
  {
    id: 'catedral',
    name: 'Cerro Catedral',
    country: 'Argentina',
    timezone: 'America/Argentina/Buenos_Aires',
    officialUrl: 'https://www.catedralaltapatagonia.com/',
    base: { latitude: -41.167, longitude: -71.438, elevationM: 1030 },
    summit: { latitude: -41.16, longitude: -71.51, elevationM: 2180 },
  },
  {
    id: 'chapelco',
    name: 'Chapelco',
    country: 'Argentina',
    timezone: 'America/Argentina/Buenos_Aires',
    officialUrl: 'https://chapelco.com.ar/',
    base: { latitude: -40.198, longitude: -71.32, elevationM: 1250 },
    summit: { latitude: -40.165, longitude: -71.35, elevationM: 1980 },
  },
  {
    id: 'cerro-castor',
    name: 'Cerro Castor',
    country: 'Argentina',
    timezone: 'America/Argentina/Ushuaia',
    officialUrl: 'https://www.cerrocastor.com/',
    base: { latitude: -54.724, longitude: -68.017, elevationM: 195 },
    summit: { latitude: -54.69, longitude: -68.04, elevationM: 1057 },
  },
  {
    id: 'valle-nevado',
    name: 'Valle Nevado',
    country: 'Chile',
    timezone: 'America/Santiago',
    officialUrl: 'https://www.vallenevado.com/es/',
    base: { latitude: -33.354, longitude: -70.249, elevationM: 2860 },
    summit: { latitude: -33.33, longitude: -70.24, elevationM: 3670 },
  },
  {
    id: 'la-parva',
    name: 'La Parva',
    country: 'Chile',
    timezone: 'America/Santiago',
    officialUrl: 'https://laparva.cl/es/',
    base: { latitude: -33.33, longitude: -70.29, elevationM: 2670 },
    summit: { latitude: -33.31, longitude: -70.27, elevationM: 3630 },
  },
  {
    id: 'el-colorado',
    name: 'El Colorado',
    country: 'Chile',
    timezone: 'America/Santiago',
    officialUrl: 'https://www.elcolorado.cl/',
    base: { latitude: -33.35, longitude: -70.3, elevationM: 2430 },
    summit: { latitude: -33.32, longitude: -70.28, elevationM: 3333 },
  },
];

export interface RegionalPointReference {
  resortIndex: number;
  position: 'base' | 'summit';
  point: MountainLevelConfig;
}

export function flattenRegionalPoints(): RegionalPointReference[] {
  return REGIONAL_RESORTS.flatMap((resort, resortIndex) => [
    {
      resortIndex,
      position: 'base' as const,
      point: {
        id: 'base' as const,
        name: `${resort.name} Base`,
        shortName: 'Base',
        ...resort.base,
      },
    },
    {
      resortIndex,
      position: 'summit' as const,
      point: {
        id: 'summit' as const,
        name: `${resort.name} Cumbre`,
        shortName: 'Cumbre',
        ...resort.summit,
      },
    },
  ]);
}
