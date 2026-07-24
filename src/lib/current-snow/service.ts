import type {
  CurrentSnowOperations,
  CurrentSnowResponse,
  CurrentSnowSourceId,
  CurrentSnowSourceReport,
  CurrentSnowSourceStatusEntry,
} from '../../types/currentSnow.js';
import { combineCurrentSnow } from './combine.js';
import { fetchLasLenasOperations } from './operations.js';
import { parseLasLenas } from './sources/lasLenas.js';
import { parseOnTheSnow } from './sources/onTheSnow.js';
import { parseSkiResortInfo } from './sources/skiResortInfo.js';
import { parseSnowForecast } from './sources/snowForecast.js';

interface SourceDefinition {
  id: CurrentSnowSourceId;
  name: string;
  url: string;
  parser: (html: string, fetchedAt: string) => CurrentSnowSourceReport;
}

export const CURRENT_SNOW_SOURCES: SourceDefinition[] = [
  {
    id: 'las-lenas',
    name: 'Las Leñas oficial',
    url: 'https://laslenas.com/estado-pistas/condiciones-del-tiempo/',
    parser: parseLasLenas,
  },
  {
    id: 'snow-forecast',
    name: 'Snow-Forecast',
    url: 'https://www.snow-forecast.com/resorts/Las-Lenas/snow-report',
    parser: parseSnowForecast,
  },
  {
    id: 'skiresort-info',
    name: 'Skiresort.info',
    url: 'https://www.skiresort.info/ski-resort/las-lenas/snow-report/',
    parser: parseSkiResortInfo,
  },
  {
    id: 'onthesnow',
    name: 'OnTheSnow',
    url: 'https://www.onthesnow.com/argentina/las-lenas/skireport',
    parser: parseOnTheSnow,
  },
];

export type CurrentSnowFetcher = (
  source: SourceDefinition,
  fetchedAt: string,
) => Promise<CurrentSnowSourceReport>;

export type OperationsFetcher = (fetchedAt: string) => Promise<CurrentSnowOperations>;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-AR,es;q=0.9,en;q=0.7',
        'User-Agent':
          'Mozilla/5.0 (compatible; LasLenasSnowMonitor/2.0; +https://nieve.wallealv.com)',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export const fetchCurrentSnowSource: CurrentSnowFetcher = async (
  source,
  fetchedAt,
) => {
  const response = await fetchWithTimeout(source.url, 8000);
  if (!response.ok) {
    throw new Error(`${source.name} respondió HTTP ${response.status}.`);
  }

  const html = await response.text();
  return source.parser(html, fetchedAt);
};

function sourceStatus(
  source: SourceDefinition,
  result: PromiseSettledResult<CurrentSnowSourceReport>,
  fetchedAt: string,
): CurrentSnowSourceStatusEntry {
  if (result.status === 'rejected') {
    return {
      sourceId: source.id,
      sourceName: source.name,
      status: 'failed',
      fetchedAt,
      message:
        result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  }

  const hasMeasurement = result.value.observations.some(
    (observation) =>
      observation.depthCm !== null || observation.newSnow24hCm !== null,
  );

  return {
    sourceId: source.id,
    sourceName: source.name,
    status: hasMeasurement ? 'ok' : 'partial',
    fetchedAt,
    message: hasMeasurement ? null : 'La página respondió, pero no publicó mediciones utilizables.',
  };
}

function emptyOperations(): CurrentSnowOperations {
  return {
    liftsOpen: null,
    liftsConditional: null,
    liftsTotal: null,
    slopesOpen: null,
    slopesTotal: null,
    slopesOpenKm: null,
    slopesTotalKm: null,
    avalancheRisk: null,
    offPisteStatus: null,
    officialNote: null,
    fetchedAt: null,
  };
}

function mergeOfficialOperations(
  reports: CurrentSnowSourceReport[],
  fetched: CurrentSnowOperations | null,
): CurrentSnowOperations {
  const legacy = reports.find((report) => report.sourceId === 'las-lenas')?.operations;
  const empty = emptyOperations();
  return {
    liftsOpen: fetched?.liftsOpen ?? legacy?.liftsOpen ?? empty.liftsOpen,
    liftsConditional:
      fetched?.liftsConditional ?? legacy?.liftsConditional ?? empty.liftsConditional,
    liftsTotal: fetched?.liftsTotal ?? legacy?.liftsTotal ?? empty.liftsTotal,
    slopesOpen: fetched?.slopesOpen ?? legacy?.slopesOpen ?? empty.slopesOpen,
    slopesTotal: fetched?.slopesTotal ?? legacy?.slopesTotal ?? empty.slopesTotal,
    slopesOpenKm: fetched?.slopesOpenKm ?? legacy?.slopesOpenKm ?? empty.slopesOpenKm,
    slopesTotalKm:
      fetched?.slopesTotalKm ?? legacy?.slopesTotalKm ?? empty.slopesTotalKm,
    avalancheRisk:
      fetched?.avalancheRisk ?? legacy?.avalancheRisk ?? empty.avalancheRisk,
    offPisteStatus:
      fetched?.offPisteStatus ?? legacy?.offPisteStatus ?? empty.offPisteStatus,
    officialNote: fetched?.officialNote ?? legacy?.officialNote ?? empty.officialNote,
    fetchedAt: fetched?.fetchedAt ?? legacy?.fetchedAt ?? empty.fetchedAt,
  };
}

export async function buildCurrentSnowResponse(
  fetcher: CurrentSnowFetcher = fetchCurrentSnowSource,
  now = new Date(),
  operationsFetcher?: OperationsFetcher,
): Promise<CurrentSnowResponse> {
  const generatedAt = now.toISOString();
  const settled = await Promise.allSettled(
    CURRENT_SNOW_SOURCES.map((source) => fetcher(source, generatedAt)),
  );
  const shouldFetchOperations =
    operationsFetcher ??
    (fetcher === fetchCurrentSnowSource ? fetchLasLenasOperations : null);
  const operationsResult = shouldFetchOperations
    ? await Promise.resolve(shouldFetchOperations(generatedAt)).then(
        (value) => ({ status: 'fulfilled' as const, value }),
        (reason) => ({ status: 'rejected' as const, reason }),
      )
    : null;

  const reports = settled.flatMap((result) =>
    result.status === 'fulfilled' ? [result.value] : [],
  );

  if (reports.length === 0) {
    const firstFailure = settled.find(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    );
    throw new Error(
      firstFailure?.reason instanceof Error
        ? firstFailure.reason.message
        : 'No se pudo consultar ninguna fuente de nieve actual.',
    );
  }

  const sourceStatuses = CURRENT_SNOW_SOURCES.map((source, index) =>
    sourceStatus(source, settled[index]!, generatedAt),
  );
  const observations = reports.flatMap((report) => report.observations);
  const warnings = sourceStatuses
    .filter((status) => status.status !== 'ok')
    .map((status) =>
      status.status === 'failed'
        ? `${status.sourceName} no está disponible; se muestran las demás fuentes.`
        : `${status.sourceName} respondió sin mediciones completas.`,
    );

  if (!observations.some((observation) => observation.sourceKind === 'official')) {
    warnings.unshift('El parte oficial no está disponible; la referencia actual usa fuentes externas.');
  }
  if (operationsResult?.status === 'rejected') {
    warnings.push('El estado operativo oficial no está disponible en este momento.');
  }

  return {
    resort: 'Las Leñas',
    generatedAt,
    zones: combineCurrentSnow(observations),
    operations: mergeOfficialOperations(
      reports,
      operationsResult?.status === 'fulfilled' ? operationsResult.value : null,
    ),
    sourceStatuses,
    warnings,
  };
}
