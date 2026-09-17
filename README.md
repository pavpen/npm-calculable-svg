# Calculable SVG

Allow SVG document values, such attributes, to respond to external input like
CSS styling and font substitution that changes text bounding boxes.

## 'The Problem'

* SVG geometries (paths, and built-ins like ellipses, and rectangles) are
  specified in a way that's consistent across the target environments in which
  they're rendered displayable to a user.
* Text in SVG is generally specified in way that's not consistent across
  target rendering environments.  E.g., the platform on which it's rendered
  can substitute a different font, SVG is embedded in a Web page with a fluid
  design (where the ratio between text sizes can change if a user zooms in, or
  out when viewing the document).

As a result, even something that can be stated as simply as creating an
elliptical speech bubble around a text label becomes less trivial in SVG.

## Example

The `<svg/>` `viewBox` attribute, and border dimensions in the following
example are calculated from the text layout bounding box.

[`samples/text-with-octagonal-border-input.svg`](samples/text-with-octagonal-border-input.svg):

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
    <style>
        .label {
            font-size: 48px;
            stroke-width: 0.5px;
            fill: #000;
            stroke: #757575; 
        }
    </style>
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

## Alternative Solutions

* In simpler cases you may be able to achive SVG responding to text layout
  using an SVG
  [`<foreignObject/>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/foreignObject)
  that embeds HTML in the SVG, and styling SVG, and HTML elements with CSS.
  This would, generally, be supported in a browser environment better than the
  Calculable SVG solution.
* With tools like [SVGR](https://react-svgr.com/), and
  [svgdx](https://crates.io/crates/svgdx), you can generate SVG output from
  React code, Rust, or another language and framework that can evaluate SVG
  text layout.

## The Features

The way we try to solve the above challenges is by:

* Introducing arithmetic expressions for calculating SVG attribute values
  (such as path coordinates, and displacements) which can reference
  properties, such as the bounding box of an element (like `<text/>`).
  * Expressions must be referentially transparent.  (I.e., evaluating an
    expression must produce the same result every time, there must be no side
    effects of evaluation, such as network requests or file operations.)
  * Expressions must form a Directed Acyclic Graph.  (E.g., if the width of a
    `<rect/>` element depends on the bounding box of a `<circle/>` element,
    the radius of the circle element is not allowed to depend on the bounding
    box of the `<rect/>` element.)
* Keeping the file format valid SVG.
* Allowing evaluating the expressions in an SVG document (which we call
  expression resolution) in a browser.
* Allowing expression resolution statically (e.g., when fonts, and text sizes
  are fixed).  (This follows from the previous point, but we also want to make
  the process simpler to implement when possible.)

### Syntax, and Expressions

See the [User Guide](doc/user-guide.md).

## To-Do

* [ ] Respond to document live updates.
  * [ ] Minimizing recalculation by accurate dependency calculation.
        (Currently requires a different Jinja engine, or modifying the
        existing one.)
* [ ] Be able to transpile SVG expressions to JavaScript (or Web Assembly).
* [ ] Linting (unused constants, access to undefined or disallowed identifiers,
      circular dependencies, expression syntax validation, etc.)
* [ ] More unit tests, and code clean-up.
