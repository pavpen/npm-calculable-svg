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
 * ## CSVG XML Attributes
 *
 * ### 'doc-local-id'
 *
 * * XML namespace: `"http://xmlns.pavpen.dev/calculable-svg/0.1"`
 *
 * Assigns a CSVG document-local ID to an element, so the element can be
 * looked up.
 *
 * E.g., you can refer to a `<text/>` element by its `doc-local-id` in order to
 * calculate its bounding box.  Note the `doc-local-id="label"` below.
 *
 * Example:
 *
 * ```
 * <svg
 *     xmlns="http://www.w3.org/2000/svg"
 *     xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
 *     xmlns:attrExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"
 *     xmlns:constExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/const-expression/jinja"
 *     attrExpr:viewBox="
 *       {{- document.getConst('labelBBox').x }}{{ ' ' }}
 *       {{- document.getConst('labelBBox').y }}{{ ' ' }}
 *       {{- document.getConst('labelBBox').width }}{{ ' ' }}
 *       {{- document.getConst('labelBBox').height }}"
 * >
 *     <title>The text 'The unfortunate label' with a calculated bounding box</title>
 *     <!-- The script that renders calculables in this document: -->
 *     <script crossorigin="anonymous" href="evaluate-for-current-document.js"></script>
 *     <csvg:consts
 *         constExpr:labelBBox="document.localIdToElement.get('label').getBBox()"
 *     />
 *     <text csvg:doc-local-id="label">The unfortunate label</text>
 * </svg>
 * ```
 *
 * * The `doc-local-id` attribute can be added to an SVG element.
 * * Each value must be unique within the SVG document (but not across the
 *   whole HTML DOM that may contain this, and other SVG documents).
 *
 * See {@link CsvgDocument.localIdToElement}.
 *
 * ### Attribute Calculated by a Jija Expression
 *
 * * XML namespace: `"http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"`
 *
 * Creates an XML attribute whose vaule is produced by evaluating a Jinja expression.
 *
 * The output attribute has the same name as the attribute containing the
 * expression, but is in the default document namespace (usually
 * `"http://www.w3.org/2000/svg"`).
 *
 * If the output XML attribute already exists, its value will be the initial
 * value of the attribute (e.g, during document loading) until the document is
 * evaluated.
 *
 * Live updates (e.g., due to CSS style, or DOM changes) can cause the
 * attribute value to be re-calculated.
 *
 * E.g., the `<svg/>` `viewBox` attribute can be calculated from the bounding box
 * of a `<text/>` element.  Note the `attrExpr:viewBox` attribute below.
 *
 * Example:
 *
 * ```
 * <svg
 *     xmlns="http://www.w3.org/2000/svg"
 *     xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
 *     xmlns:attrExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"
 *     xmlns:constExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/const-expression/jinja"
 *     attrExpr:viewBox="
 *       {{- document.getConst('labelBBox').x }}{{ ' ' }}
 *       {{- document.getConst('labelBBox').y }}{{ ' ' }}
 *       {{- document.getConst('labelBBox').width }}{{ ' ' }}
 *       {{- document.getConst('labelBBox').height }}"
 * >
 *     <title>The text 'The unfortunate label' with a calculated bounding box</title>
 *     <!-- The script that renders calculables in this document: -->
 *     <script crossorigin="anonymous" href="evaluate-for-current-document.js"></script>
 *     <csvg:consts
 *         constExpr:labelBBox="document.localIdToElement.get('label').getBBox()"
 *     />
 *     <text csvg:doc-local-id="label">The unfortunate label</text>
 * </svg>
 * ```
 *
 * * The expression uses the
 *   [Jinja template language syntax](https://jinja.palletsprojects.com/en/stable/templates/).
 * * The expression can access symbols from the {@link CsvgGlobalNamespace}.
 * * The string value of the template expression replaces, or creates an
 *   attribute of the same name, on the element, but in the default XML
 *   namespace.  E.g., in the example above, the result of evaluating
 *   `attrExpr:viewBox` becomes the value of a new `viewBox` attribute in the
 *   default, `"http://www.w3.org/2000/svg"`, namespace.
 * * An attribute expression can depend on:
 *   * Other attribute expressions (by accessing calculated attributes);
 *   * Constant expressions (by accessing them, e.g. with
 *     {@link CsvgDocument.getConst}).
 *   * DOM elements (by accessing their properties, e.g.
 *     {@link CsvgGraphicsElement.getBBox}).
 * * Expressions, and their dependencies must form a Directed Acyclic Graph.
 *   (I.e., circular references are not allowed.)
 *
 * ### Constant Jinja Expression
 *
 * * XML namespace: `"http://xmlns.pavpen.dev/calculable-svg/0.1/const-expression/jinja"`
 *
 * Allows naming an expression, so it can be used in more complex expressions
 * without repeating it.
 *
 * E.g., you can calculate the length of an octagon border's side from a text
 * label's bounding box, and assign the result to a constant.  Consider the
 * `constExpr:octagonSideLength` expression below.
 *
 * Example:
 *
 * ```
 * <svg
 *     xmlns="http://www.w3.org/2000/svg"
 *     xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
 *     xmlns:attrExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"
 *     xmlns:constExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/const-expression/jinja"
 *     attrExpr:viewBox="
 *         {{- document.getConst('contentBBox').x - document.getConst('borderStrokeWidthPx') / 2 }}{{ ' ' }}
 *         {{- document.getConst('contentBBox').y - document.getConst('borderStrokeWidthPx') / 2 }}{{ ' ' }}
 *         {{- document.getConst('contentBBox').width + document.getConst('borderStrokeWidthPx') }}{{ ' ' }}
 *         {{- document.getConst('contentBBox').height + document.getConst('borderStrokeWidthPx') }}"
 * >
 *     <title>The text 'Start' inside an octagonal border</title>
 *     <script crossorigin="anonymous" href="../evaluate-for-current-document-debug.js"></script>
 *     <style>
 *         .label {
 *             font-size: 48px;
 *             stroke-width: 0.5px;
 *             fill: #000;
 *             stroke: #757575;
 *         }
 *     </style>
 *     <csvg:consts
 *         constExpr:padding="10"
 *         constExpr:fontSize="document.localIdToElement.get('label').getUsedStyleDimensions().fontSizePx"
 *         constExpr:borderStrokeWidthPx="document.localIdToElement.get('border').getUsedStyleDimensions().strokeWidthPx"
 *         constExpr:octagonSideLength="
 *             Math.max(
 *                 (document.localIdToElement.get('label').getBBox().width
 *                     - 2 * document.getConst('padding')
 *                 ) / (1 + 2 / Math.sqrt(2)),
 *                 document.getConst('fontSize')
 *             )"
 *         constExpr:octagonSlantedSideProjection="document.getConst('octagonSideLength') / Math.sqrt(2)"
 *         constExpr:contentBBox="document.localIdToElement.get('content').getBBox()"
 *     />
 *     <g csvg:doc-local-id="content">
 *         <!-- The octagon enclosing the label: -->
 *         <path csvg:doc-local-id="border" class="border"
 *             attrExpr:d="
 *             {{- '' }}M1,{{ document.getConst('octagonSideLength') / 2 + document.getConst('padding') }}
 *             {{- ' ' }}v{{ 0 - document.getConst('octagonSideLength') }}
 *             {{- ' ' }}l{{ document.getConst('octagonSlantedSideProjection') }},{{ 0 - document.getConst('octagonSlantedSideProjection') }}
 *             {{- ' ' }}h{{ document.getConst('octagonSideLength') }}
 *             {{- ' ' }}l{{ document.getConst('octagonSlantedSideProjection') }},{{ document.getConst('octagonSlantedSideProjection') }}
 *             {{- ' ' }}v{{- document.getConst('octagonSideLength') }}
 *             {{- ' ' }}l{{- 0 - document.getConst('octagonSlantedSideProjection') }},{{ document.getConst('octagonSlantedSideProjection') }}
 *             {{- ' ' }}h{{- 0 - document.getConst('octagonSideLength') }}
 *             z"
 *             stroke="#000" fill="none" />
 *         <text csvg:doc-local-id="label" class="label"
 *             attrExpr:x="{{ document.getConst('padding') }}"
 *             attrExpr:y="{{ document.getConst('fontSize') / 2 }}"
 *             text-anchor="start">
 *             Start</text>
 *     </g>
 * </svg>
 * ```
 *
 * * The constant definition must occur as an attribute of a `<consts/>`
 *   element in the `"http://xmlns.pavpen.dev/calculable-svg/0.1"` XML namespace.
 * * The expression uses the
 *   [Jinja template language syntax](https://jinja.palletsprojects.com/en/stable/templates/).
 * * The expression can use the {@link CsvgGlobalNamespace}.
 * * The value of the expression becomes the value of the constant.  The name
 *   of the constant is the name of the XML attribute, without the
 *   `namespace:` prefix.  E.g., in the example above, the
 *   `constExpr:octagonSideLength` creates the `octagonSideLength` constant.
 * * Constant values can be of any type (not just string).
 * * Constant names must be unique in the SVG document.  Creating separate
 *   `<consts/>` elements doesn't create separate namespaces for constants.
 * * A constant expression can depend on:
 *   * Attribute expressions (by accessing values of calculated attributes);
 *   * Other constant expressions (by accessing them, e.g. with
 *     {@link CsvgDocument.getConst});
 *   * DOM elements (e.g., by accessing a property, such as by using
 *     {@link CsvgGraphicsElement.getBBox}).
 * * Expressions, and their dependencies must form a Directed Acyclic Graph.
 *   (I.e., circular references are not allowed.)
 *
 * See {@link CsvgDocument.getConst}.
 *
 * ### CSVG Configuration Attribute 'live-update'
 *
 * * XML namespace: `"http://xmlns.pavpen.dev/calculable-svg/0.1"`
 *
 * Enables, or disables responding to Calculable SVG live updates, such as:
 * * updating an attribute, or a constant expression by modifying the DOM,
 * * style changes (e.g., due to CSS changes, pseudo element state changes,
 *   zoom changes, etc.), affecting expressions, such as expressions
 *   referencing bounding boxes.
 *
 * ⚠️ Live updates may be paused, or processed with a delay to reduce page
 * paint delays.  (JavaScript style calculated by
 * [`getComputedStyle`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)).
 * doesn't seem to curently have a good way of observing used style
 * updates.  Polling, and processing DOM mutations can add undesired
 * page paint overhead.)
 *
 * * Default value: `true`.
 * * Allowed value: `"true"`, `"false"`.
 *
 * Example:
 *
 * ```
 * <svg
 *     xmlns="http://www.w3.org/2000/svg"
 *     xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
 *     csvg:live-update="false"
 * >
 *     <title>An example Calculable SVG that responds to expression, and style live updates</title>
 *     <script crossorigin="anonymous" href="evaluate-for-current-document.js"></script>
 * </svg>
 * ```
 *
 * @packageDocumentation
 */

export type { CsvgDocument } from './csvg-document';
export type { CsvgDomRect } from './csvg-dom-rect';
export type { CsvgElement } from './csvg-element';
export type { CsvgGlobalNamespace } from './csvg-global-namespace';
export type { CsvgGraphicsElement } from './csvg-graphics-element';
export type { CsvgUsedStyleDimensions } from './csvg-used-style-dimensions';
export type { ImmutableMap } from './immutable-map';
export type { Math } from './math-namespace';
