/**
 * # Calculable SVG User API
 *
 * ## The Features
 *
 * Calculable SVG does the following to an SVG document:
 *
 * * Introduces arithmetic expressions for calculating SVG attribute values (such
 *   as path coordinates, and displacements) which can reference properties, such
 *   as the bounding box width, and height for an element (like `<text/>`).
 *   * Expressions must be referentially transparent.  (I.e., evaluating an
 *     expression must produce the same result every time, there must be no side
 *     effects of evaluation, such as network requests or file operations.)
 *   * Expressions must form a Directed Acyclic Graph.  (E.g., if the width of a
 *     `<rect/>` element depends on the bounding box of a `<circle/>` element,
 *     the radius of the circle element is not allowed to depend on the bounding
 *     box of the `<rect/>` element.)
 * * Keeps the file format valid SVG.
 * * Evaluates the expressions in an SVG document (which we call expression
 *   resolution) in a browser.
 * * Allows expression resolution statically (e.g., when fonts, and text sizes
 *   are fixed).  (This follows from the previous point, but we also want to make
 *   the process simpler to implement when possible.)
 *
 * See {@link csvg_xml} for the XML syntax for adding CSVG expressions to an
 * SVG.
 *
 * @packageDocumentation
 */

// biome-ignore lint/correctness/noUnusedImports: Used by TypeDoc
import { csvg_xml } from '../xml-api';

export type { CsvgDocument } from './csvg-document';
export type { CsvgDomRect } from './csvg-dom-rect';
export type { CsvgElement } from './csvg-element';
export type { CsvgGlobalNamespace } from './csvg-global-namespace';
export type { CsvgGraphicsElement } from './csvg-graphics-element';
export type { CsvgUsedStyleDimensions } from './csvg-used-style-dimensions';
export type { ImmutableMap } from './immutable-map';
export type { Math } from './math-namespace';
