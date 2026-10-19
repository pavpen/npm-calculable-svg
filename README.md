# Calculable SVG

Allow SVG document values, such as attributes, to respond to external input
like CSS styling and font substitution that changes text bounding boxes.

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

### Limitations, and Some Design Details

* This implementation relies on JavaScript to calculate document expressions,
  and detect style, dimension, and DOM changes.  This includes the following
  consequences:
  * JavaScript currently doesn't seem to have a way to detect whether an
    element is in a CSS pseudo element state (such as hover), or at which
    point in an animation transition between two states an element currently
    is.
    * While you can use some element style values, such as font size, or
      padding dimensions in CSVG expressions, you explicitly specify the
      pseudo element whose style you're querying, and you cannot directly
      write expressions that respond to current CSS pseudo element state, or
      transitions between states.  You can, however, use some tricks.  E.g.,
      if you wrap an element with CSS pseudo element states (e.g., in a `</g>`
      like `<g><text>Label</text></g>`), the container element's bounding box
      will respond to size changes of the wrapped element's CSS pseudo element
      state, and you can use bounding box dimensions in a CSVG expression.
      * You won't, however, be able to use this trick to respond to, e.g.,
        color, or stroke width changes.
  * JavaScript has
    [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
    for handling DOM mutations, and
    [`ResiveObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API)
    for handling element size changes efficiently.  This doesn't include
    style changes which may not affect an element's size, such as the `x`, and
    `y` offset of a bounding box, or `BoundingClientRect`.  This
    implementation relies on polling to detect changes in such bounding box,
    `BoundingClientRect`, and style properties.  This can affect page render
    times, if the number of used such properties is large.
    * An
      [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
      can be used as a trick to detect changes to `x`, and `y` offset of an
      element.  However, this also requires adding extra elements to the DOM.
      Because CSS selectors can depend on the specific DOM structure (e.g.,
      [`:nth-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:nth-child)),
      such a trick comes with further problems, and is not currently used in
      this implementation.
  * To calculate element style, or dimensions, it must be attached to the DOM,
    and painted.
    * CSVG expressions in detached elements can produce unexpected results.
    * There's a delay between some changes, and when they're painted.
      Therefore, a CSVG expression may not update immediately, e.g. after
      executing a JavaScript statement that changes an element style.
* We require the dependencies between CSVG expressions to form a Directed
  Acyclic Graph.
  * This is mostly to guarantee calculability (i.e., avoid infinite loops when
    calculating expressions, such as `a = 2*b`, `b = 2*a`).[^1]
  * While detecting dependency cycles among attribute, and constant
    expressions is relatively simple, this is not the case for expressions
    involving DOM elements.  CSS, and SVG and HTML semantics allow creating a
    dependency between an element's style and dimensions, and pretty much any
    other element in the DOM.[^2]  Detecting such cycles in the general case
    requires interpreting CSS, HTML, and SVG semantics.
    * Therefore, you can get errors for attribute, and constant cyclic
      dependencies.  However, in general, you won't be notified of cyclic
      dependencies among attribute expressions, constant expressions, and
      element properties.
    * This implementation expects that an element's properties depend on
      rendering all descendent elements (with their calculable properties),
      but not that an element depends on antecedent elements.  Therefore, it
      is possible to construct a CSVG document which is evaluated in an
      incorrect order, and produces an unexpected result.
      * While it may be possible to remedy this by manually adding code to
        re-render elements in the required order, we recommend avoiding
        elements that depend on antecedent elements with Calculable SVG
        attributes.

[^1]: CSVG should be viewed as a functional language where the order of
      expressions doesn't matter, rather than as an imperative language.

[^2]: E.g., CSS selectors allow applying a style based on an element's
      antecedents in the DOM, as well as its siblings.  (Such as
      `div.p { font-size: 12px; } div.required-parent-class > p { font-size: 24px; }`,
      or
      `div.p { font-size: 12px; } div.p:nth-child(3n + 1) { font-size: 24px; }`.)
      SVG, and HTML semantics already cause many parent element's dimensions to
      depend on their children.  (Such as
      `<g class="parent"><text>Child</text></g>`.)

### Syntax, and Expressions

See the [User Guide](doc/user-guide.md).

## To-Do

* [x] Respond to document live updates. (Poll style and dimension changes,
  re-render on DOM mutation.)
* Optimizations
  * [ ] Re-render only mutated parts of the DOM, and their reverse
        dependencies (rather than the whole document on DOM mutation).
  * [ ] Make dependencies (and recalculation) more precise by inspecting
        which properties (e.g., `width` vs. `x`) of an element's `BBox`,
        `BoundingClientRect`, or `UsedStyleDimensions` a CSVG expression uses.
        (Currently requires a different Jinja engine, or modifying the
        existing one.)
  * [ ] Use
        [`ResiveObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API),
        rather than polling where possible (e.g., for `width`, but not `x` of
        a `BBox`).
  * [ ] Be able to pause rendering for CSVG documents not in view.  (E.g.,
        using
        [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
        to detect that.)
  * [ ] Be able to transpile CSVG expressions to JavaScript (or Web Assembly).
* [ ] Static linting (unused constants, access to undefined or disallowed
      identifiers, circular dependencies, expression syntax validation, etc.)
* [ ] More unit tests, and code clean-up.
