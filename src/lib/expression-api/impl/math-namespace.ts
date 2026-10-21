import type { Math as MathNamespace } from '../math-namespace';

export class MathNamespaceForEvaluation {
  toEvaluationObject(): MathNamespace {
    return {
      abs: Math.abs,
      min: Math.min,
      max: Math.max,
      round: Math.round,
      sqrt: Math.sqrt,
    };
  }
}
