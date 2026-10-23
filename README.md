# Calculable SVG

Allow SVG document values, such as a `<path/>` `d` attribute, to respond to
external input like text bounding boxes changing in response to CSS styling,
platform font substitution, or other events.

## 'The Problem'

* SVG geometries (paths, and built-ins like ellipses, and rectangles) are
  specified in a way that renders consistently across user platforms, and
  devices.
* Text in SVG is, generally, specified in way that's not consistent across
  target rendering environments.  E.g., the platform on which it's rendered
  can substitute a different font; SVG can be embedded in a Web page with a
  fluid design (where the ratio between several text sizes in the document can
  change if a user zooms in, or out).  (E.g., see articles like
  [_Modern Fluid Typography Using CSS Clamp_](https://www.smashingmagazine.com/2022/01/modern-fluid-typography-css-clamp/),
  [_Adapting a type scale based for users that zoom… a discussion and experiment_](https://iknowdavehouse.medium.com/adapting-a-type-scale-based-for-users-that-zoom-a-discussion-and-experiment-5713f11f471f)
  for an in-depth example of changing text size ratios in response to screen
  size, or zoom level.)

As a result, it becomes non-trivial to write a portable, and typographically
correct SVG for something that can be stated as simply as: "Create an
elliptical speech bubble around this given text label."

## Example

The `<svg/>` `viewBox` attribute, and border dimensions in the following
example are calculated from the text layout bounding box.

![Example text with octagonal border rendered by CSVG evaluation](build-doc/examples/text-with-octagonal-border.svg):

```svg
<svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
    xmlns:attrExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"
    xmlns:constExpr="http://xmlns.pavpen.dev/calculable-svg/0.1/const-expression/jinja"
    attrExpr:viewBox="
        {{- document.getConst('contentBBox').x - document.getConst('borderStrokeWidthPx') / 2 }}{{ ' ' }}
        {{- document.getConst('contentBBox').y - document.getConst('borderStrokeWidthPx') / 2 }}{{ ' ' }}
        {{- document.getConst('contentBBox').width + document.getConst('borderStrokeWidthPx') }}{{ ' ' }}
        {{- document.getConst('contentBBox').height + document.getConst('borderStrokeWidthPx') }}"
>
    <title>The text 'Start' inside an octagonal border</title>
    <!-- Adding the following script renders calculables in this document: -->
    <script crossorigin="anonymous" href="https://github.com/pavpen/npm-calculable-svg/releases/download/v0.0.0-alpha.0/evaluate-for-current-document-debug.js"></script>
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
        constExpr:fontSize="document.localIdToElement.get('label').getUsedStyleDimensions().fontSizePx"
        constExpr:borderStrokeWidthPx="document.localIdToElement.get('border').getUsedStyleDimensions().strokeWidthPx"
        constExpr:octagonSideLength="
            Math.max(
                (document.localIdToElement.get('label').getBBox().width
                    - 2 * document.getConst('padding')
                ) / (1 + 2 / Math.sqrt(2)),
                document.getConst('fontSize')
            )"
        constExpr:octagonSlantedSideProjection="document.getConst('octagonSideLength') / Math.sqrt(2)"
        constExpr:contentBBox="document.localIdToElement.get('content').getBBox()"
    />
    <g csvg:doc-local-id="content">
        <!-- The octagon enclosing the label: -->
        <path csvg:doc-local-id="border" class="border"
            attrExpr:d="
            {{- '' }}M1,{{ document.getConst('octagonSideLength') / 2 + document.getConst('padding') }}
            {{- ' ' }}v{{ 0 - document.getConst('octagonSideLength') }}
            {{- ' ' }}l{{ document.getConst('octagonSlantedSideProjection') }},{{ 0 - document.getConst('octagonSlantedSideProjection') }}
            {{- ' ' }}h{{ document.getConst('octagonSideLength') }}
            {{- ' ' }}l{{ document.getConst('octagonSlantedSideProjection') }},{{ document.getConst('octagonSlantedSideProjection') }}
            {{- ' ' }}v{{- document.getConst('octagonSideLength') }}
            {{- ' ' }}l{{- 0 - document.getConst('octagonSlantedSideProjection') }},{{ document.getConst('octagonSlantedSideProjection') }}
            {{- ' ' }}h{{- 0 - document.getConst('octagonSideLength') }}
            z"
            stroke="#000" fill="none" />
        <text csvg:doc-local-id="label" class="label"
            attrExpr:x="{{ document.getConst('padding') }}"
            attrExpr:y="{{ document.getConst('fontSize') / 2 }}"
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
  text layout.  (Such solutions, although having some advantages in comparison
  to Calculable SVG, may not be appropriate in enviornments, such as Markdown
  on the Web, where you may not have a fully programmable Web page rendering
  framework.)

## The Features

To solve the above challenges we:

* Introduce arithmetic expressions for calculating SVG attribute values
  (such as path coordinates, and displacements) which can reference
  properties, such as the bounding box of an element (like `<text/>`).
  * Require expressions to be referentially transparent.  (I.e., evaluating
    an expression any number of times in the same document state must produce
    the same result every time; and there must be no side effects of
    evaluation, such as network requests or file operations.)
  * Consequently, require expressions to form a Directed Acyclic Graph.
    (E.g., if the width of a `<rect/>` element depends on the bounding box of
    a `<circle/>` element, the radius of the circle element is not allowed to
    depend on the bounding box of the `<rect/>` element.)
* Keep the file format valid SVG.
* Implement evaluating the expressions in an SVG document (which we call
  expression resolution) in a browser.
* Allow expression resolution statically for a single state (e.g., when fonts,
  and text sizes are fixed).  (This follows from the previous point, but we
  want to make the process simpler to implement when possible.)

### Limitations, and Some Design Details

* This implementation relies on JavaScript to calculate document expressions,
  and detect style, dimension, and DOM changes in a browser.  This includes
  the following consequences:
  * JavaScript currently doesn't seem to have a way to detect whether an
    element is in a CSS pseudo element state (such as hover), or at which
    point in an animation transition between two states an element currently
    is.
    * While you can use some element style values, such as font size, or
      padding dimensions in CSVG expressions, you explicitly specify the
      pseudo element whose style you're querying, and you cannot directly
      write expressions that respond to current CSS pseudo element state, or
      transitions between states.
      * You can, however, use some tricks.  E.g., if you wrap an element with
        CSS pseudo element states (e.g., in a `</g>` like
        `<g><text>Label</text></g>`), the container element's bounding box
        will respond to size changes of the wrapped element's CSS pseudo
        element state, and you can use bounding box dimensions in a CSVG
        expression.
      * You won't, however, be able to use this trick to respond to, e.g.,
        color, or stroke width changes.  (The latter, at least until the
        [`getBBox` `{ stroke: true }` option](https://developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement/getBBox#stroke)
        is widely implemented among browsers.)
  * JavaScript has
    [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
    for handling DOM mutations, and
    [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API)
    for handling element size changes efficiently.  This doesn't include
    style changes which may not affect an element's size, such as the `x`, and
    `y` offset of a bounding box, or `BoundingClientRect`.  This CSVG
    implementation relies on polling to detect changes in such bounding box,
    `BoundingClientRect`, and style properties.  This can degrade page render
    times, if the number of used such properties is large.
    * An
      [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
      can be used as a trick to detect changes to the `x`, and `y` offset of
      an element.  However, this also requires adding extra elements to the
      DOM.  Because CSS selectors can depend on the specific DOM structure
      (e.g.,
      [`:nth-child`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:nth-child)),
      such a trick comes with further problems, and is not currently used in
      this implementation.
  * To calculate an element's style, or dimensions, the element must be
    attached to the DOM, and painted.
    * CSVG expressions referencing detached elements can produce unexpected
      results.
    * There's a delay between some changes, and when they're painted.
      Therefore, a CSVG expression may not update immediately.  E.g., after
      executing a JavaScript statement that changes an element's CSS style,
      subsequent JavaScript statements will find the CSVG unchanged until a
      style poll, and a paint are executed.
* As mentioned above, we require the dependencies between CSVG expressions to
  form a Directed Acyclic Graph.
  * This is mostly to guarantee calculability (i.e., avoid infinite loops when
    calculating expressions, such as `a = 2*b`, `b = 2*a`).[^1]
  * While detecting dependency cycles among attribute, and constant
    expressions is relatively simple, this is not the case for expressions
    involving DOM elements.  CSS, and SVG and HTML semantics allow creating a
    dependency between an element's style and dimensions, and pretty much any
    other element in the DOM.[^2]  Detecting such cycles in the general case
    requires interpreting CSS, HTML, and SVG semantics.
    * Therefore, you can receive errors (exceptions) for cyclic dependencies
      among attribute, and constant expressions.  However, in general, you
      won't be notified of cyclic dependencies due to element property
      references.
    * This CSVG implementation expects that an element's properties depend on
      rendering all descendent elements (with their calculable properties),
      but not that an element depends on antecedent elements.  Therefore, it
      is possible to construct a CSVG document which is evaluated in an
      incorrect order, and produces an unexpected result.
      * While it may be possible to remedy this by manually adding code to
        re-render elements in the required order, we recommend avoiding
        elements whose attributes depend on antecedent elements.

[^1]: CSVG should be viewed as a functional language where the order of
      expression definitions doesn't matter, rather than as an imperative
      language.

[^2]: E.g., CSS selectors allow applying a style based on an element's
      antecedents in the DOM, as well as its siblings.  (Such as
      `div.p { font-size: 12px; } div.required-parent-class > p { font-size: 24px; }`,
      or
      `div.p { font-size: 12px; } div.p:nth-child(3n + 1) { font-size: 24px; }`.)
      SVG, and HTML semantics already cause many parent element's dimensions to
      depend on their children.  (Such as
      `<g class="parent"><text>Child</text></g>`.)

### Syntax, and Expressions

See the [Expression API](src/lib/expression-api/index.ts).

## To-Do

* [ ] Clean up the CSVG expression API design.  (It currently works around
      peculiarities of the Jinja rendering engine.)
* [x] Respond to document live updates. (Poll style and dimension changes,
  re-render on DOM mutation.)
* Optimizations
  * [ ] Re-render only mutated parts of the DOM, and their reverse
        dependencies (rather than the whole CSVG document) on DOM mutation.
  * [ ] Make dependencies (and re-calculation) more precise by inspecting
        which properties (e.g., `width` vs. `x`) of an element's `BBox`,
        `BoundingClientRect`, or `UsedStyleDimensions` a CSVG expression uses.
        (Currently requires a different Jinja engine, or modifying the
        existing one.)
  * [ ] Use
        [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API),
        rather than polling, where possible (e.g., for `width`, but not `x` of
        a `BBox`).
  * [ ] Be able to pause rendering live updates for CSVG documents not in
        view.  (E.g., using
        [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).)
  * [ ] Be able to transpile CSVG expressions to JavaScript (or Web Assembly).
* [ ] Static linting (unused constants, access to undefined or disallowed
      identifiers, circular dependencies, expression syntax validation, etc.)
* [ ] Non-abysmal unit test code coverage, and code clean-up.
