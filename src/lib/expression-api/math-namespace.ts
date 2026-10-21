/**
 * The global `Math` namespace available to CSVG expressions
 */
export interface Math {
  /**
   * See
   * [Math.abs() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/abs).
   */
  abs(x: number): number;

  /**
   * See
   * [Math.min() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/min).
   */
  min(...values: number[]): number;

  /**
   * See
   * [Math.max() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max).
   */
  max(...values: number[]): number;

  /**
   * See
   * [Math.round() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round).
   */
  round(x: number): number;

  /**
   * See
   * [Math.sqrt() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt).
   */
  sqrt(x: number): number;
}
