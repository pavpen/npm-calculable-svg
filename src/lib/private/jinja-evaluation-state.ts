import type { JinjaEvaluationScope, JinjaEvaluator } from './jinja-evaluator';

export interface JinjaEvaluationState {
  readonly jinjaEvaluator: JinjaEvaluator;
  readonly jinjaGlobalScope: JinjaEvaluationScope;
}
