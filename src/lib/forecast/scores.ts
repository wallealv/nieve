import type { ActivityScore, ActivityScores, ForecastWindow } from '../../types/hourly.js';

export interface ScoreContext {
  observedDepthCm: number | null;
  offPisteStatus: string | null;
  avalancheRisk: number | null;
  liftsOpenRatio: number | null;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scored(score: number, positive: string[], negative: string[]): ActivityScore {
  return { status: 'scored', score: clamp(score), positive, negative };
}

export function scoreWindow(window: ForecastWindow, context: ScoreContext): ActivityScores {
  const powderPositive: string[] = [];
  const powderNegative: string[] = [];
  let powder = 35;
  powder += Math.min(35, window.snowfallCm * 2.5);
  if (window.nightSnowfallCm >= window.snowfallCm * 0.6 && window.snowfallCm > 0) {
    powder += 12;
    powderPositive.push('Gran parte de la nieve cae de noche.');
  }
  if (window.phase === 'dry-snow') {
    powder += 15;
    powderPositive.push('Predomina nieve seca.');
  }
  if (window.quality === 'dry-powder') {
    powder += 10;
    powderPositive.push('Calidad estimada de polvo seco.');
  }
  if (window.rainMm > 0.2 || window.phase === 'mixed' || window.phase === 'rain') {
    powder -= 35;
    powderNegative.push('Riesgo de lluvia o mezcla.');
  }
  if ((window.gustMaxKmh ?? 0) >= 70) {
    powder -= 20;
    powderNegative.push('Ráfagas fuertes pueden ventear la nieve.');
  }
  if ((context.observedDepthCm ?? 0) >= 30) {
    powder += 5;
    powderPositive.push('Hay una base observada útil.');
  }

  const pistePositive: string[] = [];
  const pisteNegative: string[] = [];
  let piste = 65;
  if ((window.visibilityMinM ?? 10000) >= 5000) {
    piste += 12;
    pistePositive.push('Visibilidad favorable.');
  } else if ((window.visibilityMinM ?? 10000) < 1500) {
    piste -= 30;
    pisteNegative.push('Visibilidad muy reducida.');
  }
  if ((window.gustMaxKmh ?? 0) >= 70) {
    piste -= 25;
    pisteNegative.push('Ráfagas que pueden afectar medios.');
  } else if ((window.windMaxKmh ?? 0) <= 25) {
    piste += 8;
    pistePositive.push('Viento moderado.');
  }
  if (window.rainMm > 0.2 || window.phase === 'mixed' || window.phase === 'rain') {
    piste -= 30;
    pisteNegative.push('Lluvia o mezcla deteriora la pista.');
  }
  if (window.quality === 'crust-ice-risk') {
    piste -= 20;
    pisteNegative.push('Riesgo de costra o hielo.');
  }
  if (context.liftsOpenRatio !== null) {
    piste += (context.liftsOpenRatio - 0.5) * 20;
    if (context.liftsOpenRatio >= 0.75) pistePositive.push('Buena proporción de medios abiertos.');
  }

  let freeride: ActivityScore;
  if (/cerrado/i.test(context.offPisteStatus ?? '')) {
    freeride = {
      status: 'blocked',
      score: null,
      positive: [],
      negative: ['Fuera de pista cerrado oficialmente.'],
    };
  } else {
    const positive: string[] = [];
    const negative: string[] = [];
    let value = 40 + Math.min(30, window.snowfallCm * 2);
    if (window.quality === 'dry-powder') {
      value += 12;
      positive.push('Nieve seca estimada.');
    }
    if ((window.visibilityMinM ?? 10000) < 1500) {
      value -= 20;
      negative.push('Visibilidad insuficiente para terreno complejo.');
    }
    if ((window.gustMaxKmh ?? 0) >= 60) {
      value -= 20;
      negative.push('Viento con transporte de nieve.');
    }
    if (context.avalancheRisk !== null) {
      if (context.avalancheRisk >= 5) {
        value = Math.min(value, 20);
        negative.push('Riesgo oficial de avalancha extremo.');
      } else if (context.avalancheRisk >= 4) {
        value = Math.min(value, 35);
        negative.push('Riesgo oficial de avalancha alto.');
      } else if (context.avalancheRisk <= 2) {
        value += 5;
        positive.push('Riesgo oficial bajo o moderado.');
      }
    }
    freeride = scored(value, positive, negative);
  }

  return {
    powder: scored(powder, powderPositive, powderNegative),
    piste: scored(piste, pistePositive, pisteNegative),
    freeride,
  };
}
