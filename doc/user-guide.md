# Calculable SVG User Guide

## The Features

Calculable SVG does the following to an SVG document:

* Introduces arithmetic expressions for calculating SVG attribute values (such
  as path coordinates, and displacements) which can reference properties, such
  as the bounding box width, and height for an element (like `<text/>`).
  * Expressions must be referentially transparent.  (I.e., evaluating an
    expression must produce the same result every time, there must be no side
    effects of evaluation, such as network requests or file operations.)
  * Expressions must form a Directed Acyclic Graph.  (E.g., if the width of a
    `<rect/>` element depends on the bounding box of a `<circle/>` element,
    the radius of the circle element is not allowed to depend on the bounding
    box of the `<rect/>` element.)
* Keeps the file format valid SVG.
* Evaluates the expressions in an SVG document (which we call expression
  resolution) in a browser.
* Allows expression resolution statically (e.g., when fonts, and text sizes
  are fixed).  (This follows from the previous point, but we also want to make
  the process simpler to implement when possible.)

## Calculable SVG Attributes

### Attribute `doc-local-id`

* XML namespace: `"http://xmlns.pavpen.dev/calculable-svg/0.1"`

E.g., you can refer to a `<text/>` element by its `doc-local-id` in order to
calculate its bounding box.  Note the `doc-local-id="label"` below.

Example:

```svg
<svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
    xmlns:attrExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"
    xmlns:constExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/const-expression/jinja"
    attrExpr:viewBox="
      {{- csvg.getConst('labelBBox').x }}{{ ' ' }}
      {{- csvg.getConst('labelBBox').y }}{{ ' ' }}
      {{- csvg.getConst('labelBBox').width }}{{ ' ' }}
      {{- csvg.getConst('labelBBox').height }}"
>
    <title>The text 'The unfortunate label' with a calculated bounding box</title>
    <script crossorigin="anonymous" href="evaluate-for-current-document.js"></script>
    <csvg:consts
        constExpr:labelBBox="csvg.getElementByDocLocalId('label').getBBox()"
    />
    <text csvg:doc-local-id="label">The unfortunate label</text>
</svg>
```

* The `doc-local-id` attribute can be added to SVG elements.
* Each value must be unique within the SVG document.
* The element with a given `doc-local-id` can be accessed in a Jinja
  expression with the call `csvg.getElementByDocLocalId(docLocalId)`.

### Attribute Jija Expression

* XML namespace: `"http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"`

Provides an expression that is evaluated to produce the value of an SVG
attribute.

E.g., the `<svg/>` `viewBox` attribute can be calculated from the bounding box
of a `<text/>` element.  Note the `attrExpr:viewBox` attribute below.

Example:

```svg
<svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
    xmlns:attrExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"
    xmlns:constExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/const-expression/jinja"
    attrExpr:viewBox="
      {{- csvg.getConst('labelBBox').x }}{{ ' ' }}
      {{- csvg.getConst('labelBBox').y }}{{ ' ' }}
      {{- csvg.getConst('labelBBox').width }}{{ ' ' }}
      {{- csvg.getConst('labelBBox').height }}"
>
    <title>The text 'The unfortunate label' with a calculated bounding box</title>
    <script crossorigin="anonymous" href="evaluate-for-current-document.js"></script>
    <csvg:consts
        constExpr:labelBBox="csvg.getElementByDocLocalId('label').getBBox()"
    />
    <text csvg:doc-local-id="label">The unfortunate label</text>
</svg>
```

* The expression uses the
  [Jinja template language syntax](https://jinja.palletsprojects.com/en/stable/templates/).
* The expression can use the Calculable SVG
  [Jinja Expression Built-ins](#jinja-expression-built-ins)
* The string value of the template expression replaces, or creates an
  attribute of the same name, on the element, but in the default XML namespace
  (i.e., SVG).  E.g., in the example above, the result of evaluating
  `attrExpr:viewBox` becomes the value of a new `viewBox` attribute in the
  default, `"http://www.w3.org/2000/svg"`, namespace.
* An attribute expression can depend on:
  * Other attribute expressions (by referencing attributes calculated by
    attribute expressions);
  * Constant expressions (by calling the
    [`csvg.getConst(id: string)`](#csvggetconst) built-in.)
  * DOM elements, with their sub-trees (e.g., by calling a
    [`CsvgSvgGraphicsElement`](#csvgsvggraphicselement)'s
    [`getBBox()`](#method-getbbox) method).
* Expressions, and their dependencies must form a Directed Acyclic Graph.
  (I.e., circular references are not allowed.)

### Constant Jinja Expression

* XML namespace: `"http://xmlns.pavpen.dev/calculable-svg/0.1/const-expression/jinja"`

Allows naming an expression, so it can be used in more complex expressions
without repeating it.

E.g., you can calculate the length of an octagon border's side from a text
label's bounding box, and assign the result to a constant.  Consider the
`constExpr:octagonSideLength` expression below.

Example:

```svg
<svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
    xmlns:attrExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"
    xmlns:constExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/const-expression/jinja"
    attrExpr:viewBox="
        {{- csvg.getConst('contentBBox').x - csvg.getConst('borderStrokeWidthPx') / 2 }}{{ ' ' }}
        {{- csvg.getConst('contentBBox').y - csvg.getConst('borderStrokeWidthPx') / 2 }}{{ ' ' }}
        {{- csvg.getConst('contentBBox').width + csvg.getConst('borderStrokeWidthPx') }}{{ ' ' }}
        {{- csvg.getConst('contentBBox').height + csvg.getConst('borderStrokeWidthPx') }}"
>
    <title>The text 'Start' inside an octagonal border</title>
    <script crossorigin="anonymous" href="../evaluate-for-current-document-debug.js"></script>
    <csvg:consts
        constExpr:padding="10"
        constExpr:fontSize="csvg.getUsedStyleDimensionsForId('label').fontSizePx"
        constExpr:borderStrokeWidthPx="csvg.getUsedStyleDimensionsForId('border').strokeWidthPx"
        constExpr:octagonSideLength="
            Math.max(
                (csvg.getElementByDocLocalId('label').getBBox().width
                    - 2 * csvg.getConst('padding')
                ) / (1 + 2 / Math.sqrt(2)),
                csvg.getConst('fontSize')
            )"
        constExpr:octagonSlantedSideProjection="csvg.getConst('octagonSideLength') / Math.sqrt(2)"
        constExpr:contentBBox="csvg.getElementByDocLocalId('content').getBBox()"
    />
    <g csvg:doc-local-id="content">
        <!-- The octagon enclosing the label: -->
        <path csvg:doc-local-id="border" class="border"
            attrExpr:d="
            {{- '' }}M1,{{ csvg.getConst('octagonSideLength') / 2 + csvg.getConst('padding') }}
            {{- ' ' }}v{{ 0 - csvg.getConst('octagonSideLength') }}
            {{- ' ' }}l{{ csvg.getConst('octagonSlantedSideProjection') }},{{ 0 - csvg.getConst('octagonSlantedSideProjection') }}
            {{- ' ' }}h{{ csvg.getConst('octagonSideLength') }}
            {{- ' ' }}l{{ csvg.getConst('octagonSlantedSideProjection') }},{{ csvg.getConst('octagonSlantedSideProjection') }}
            {{- ' ' }}v{{- csvg.getConst('octagonSideLength') }}
            {{- ' ' }}l{{- 0 - csvg.getConst('octagonSlantedSideProjection') }},{{ csvg.getConst('octagonSlantedSideProjection') }}
            {{- ' ' }}h{{- 0 - csvg.getConst('octagonSideLength') }}
            z"
            stroke="#000" fill="none" />
        <text csvg:doc-local-id="label" class="label"
            attrExpr:x="{{ csvg.getConst('padding') }}"
            attrExpr:y="{{ csvg.getConst('fontSize') / 2 }}"
            text-anchor="start">
            Start</text>
    </g>
</svg>
```

* The expression definition must occur as an attribute of a `<consts/>`
  element in the `"http://xmlns.pavpen.dev/calculable-svg/0.1"` XML namespace.
* The expression uses the
  [Jinja template language syntax](https://jinja.palletsprojects.com/en/stable/templates/).
* The expression can use the Calculable SVG
  [Jinja Expression Built-ins](#jinja-expression-built-ins)
* The value of the expression becomes the value of the constant that has the
  same name as the XML attribute that contains the expression.  E.g., in the
  example above, the result of evaluating `constExpr:octagonSideLength`
  becomes the value of the `octagonSideLength` constant.
* Constant values can be of any type (not just string).
* Constant names must be unique in the SVG document.  Creating separate
  `<consts/>` elements doesn't create separate namespaces for constants.
* A constant expression can depend on:
  * Attribute expressions (by referencing attributes calculated by
    attribute expressions);
  * Other constant expressions (by calling the
    [`csvg.getConst(id: string)`](#csvggetconst) built-in.)
  * DOM elements, with their sub-trees (e.g., by calling an
    [`CsvgSvgGraphicsElement`](#csvgsvggraphicselement)'s
    [`getBBox()`](#method-getbbox) method).
* Expressions, and their dependencies must form a Directed Acyclic Graph.
  (I.e., circular references are not allowed.)

## Jinja Expression Built-ins

### Global Namespace

#### `NaN`

The floating-point not-a-number constant.

See
[NaN in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NaN)
for arithmetic behavior.

#### `document`

Represents the SVG document as a [`CsvgDocument`](#csvgdocument).

#### `parseFloat`

Converts a string to a floating-point number, or NaN, if parsing fails.

See
[parseFloat in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseFloat).

#### `true`

The `true` boolean constant.

#### `false`

The `false` boolean constant

#### `null`

The `null` object constant.

#### `csvg` Namespace

#### `csvg.getConst()`

Prototype:

```typescript
csvg.getConst: (id: string) => any
```

Returns the value of the constant named `id`.  Referencing an undefined
constant `id` is an error.

See [Constant Jinja Expression](#constant-jinja-expression) for defining
constants.

#### `csvg.getElementByDocLocalId()`

Prototype:

```typescript
csvg.getElementByDocLocalId: (docLocalId: string) => CsvgElement | null
```

Returns the SVG element with
[attribute `doc-local-id`](#attribute-doc-local-id) equal to `docLocalId`, or
`null`, if no such element exists.

Returns an instance of [CsvgElement](#csvgelement) or one of its subclasses, or
`null`.

#### `csvg.getUsedStyleDimensionsForId()`

Prototype:

```typescript
csvg.getUsedStyleDimensionsForId: (
    docLocalId: string,
    pseudoElementName: string | null = null,
) => {
    leftPx: number | string,
    rightPx: number | string,
    topPx: number | string,
    bottomPx: number | string,
    widthPx: number | string,
    heightPx: number | string,
    marginLeftPx: number | string,
    marginRightPx: number | string,
    marginTopPx: number | string,
    marginBottomPx: number | string,
    paddingLeftPx: number | string,
    paddingRightPx: number | string,
    paddingTopPx: number | string,
    paddingBottomPx: number | string,
    textIndentPx: number | string,
    fontSizePx: number | string,
    strokeWidthPx: number | string,
};
```

Returns the used style of element with
[Attribute `doc-local-id`](#attribute-doc-local-id) `docLocalId`, or `null`,
if no element with the given `doc-local-id` exists.

* See
  [window.getComputedStyle() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)
  for the definitions of style 'used value', 'resolved value', and
  'computed value'.

### `Math` Namespace

#### `Math.abs`

See
[Math.abs() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/abs).

#### `Math.min`

See
[Math.min() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/min).

#### `Math.max`

See
[Math.max() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max).

#### `Math.round`

See
[Math.round() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round).

#### `Math.sqrt`

See
[Math.sqrt() in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt).

### `CsvgDocument`

#### Method `getElementById: (id: string) => ElementForEvaluation | null`

Returns the SVG element with the given SVG id, or `null`, if no element with
the given ID exists in the document.

See
[getElementById in the Mozilla JavaScript documentation](https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById).

Returns an instance of [CsvgElement](#csvgelement) or one of its subclasses,
or `null`.

### `CsvgElement`

#### Method `getAttribute()`

Prototype:

```typescript
getAttribute: (qualifiedName: string) => string | null
```

### `CsvgSvgElement`

Extends: [CsvgElement](#csvgelement).

#### Method `getBoundingClientRect()`

Prototype:

```typescript
getBoundingClientRect?: () => BBoxForEvaluation | undefined
```

### `CsvgSvgGraphicsElement`

Extends: [CsvgSvgElement](#csvgsvgelement)

#### Method `getBBox()`

Prototype:

```typescript
getBBox: () => BBoxForEvaluation | undefined
```
