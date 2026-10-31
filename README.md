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

The `<svg/>` `viewBox` attribute, and underline dimensions in the following
example are calculated from the text bounding box.

```svg
<svg xmlns="http://www.w3.org/2000/svg" xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
    xmlns:attr-expr="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/jinja"
    xmlns:attr-name="http://xmlns.pavpen.dev/calculable-svg/0.1/attribute-expression/attribute-name"
    xmlns:const-expr="http://xmlns.pavpen.dev/calculable-svg/0.1/const-expression/jinja"
    attr-name:viewbox="viewBox"
    attr-expr:viewbox="{{ document.getConst('contentBBox').x }} {{ document.getConst('contentBBox').y }} {{ document.getConst('contentBBox').width }} {{ document.getConst('contentBBox').height }}"
    viewBox="0 -51.27756118774414 711.7402954101562 65.67755889892578">
    <title>The text "Important: Don't pay attention!", underlined</title>
    <!-- Adding the following script renders calculables in this document: -->
    <script crossorigin="anonymous" href="../evaluate-for-current-document-debug.js" />
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&amp;family=Noto+Serif:ital,wght@0,100..900;1,100..900&amp;display=swap');
        .label {
            font-family: "Noto Serif", serif;
            font-size: 48px;
            stroke-width: 0.5px;
            fill: #000000;
            stroke: #757575;
            margin-bottom: 7.2px;
        }
        .underline-border {
            stroke: #757575;
            stroke-width: 4px;
        }
        .underline {
            stroke: #fc0004;
            stroke-width: 3px;
        }
    </style>
    <csvg:consts>
        <csvg:const csvg:name="contentBBox">document.localIdToElement.get('content').getBBox()</csvg:const>
        <csvg:const csvg:name="labelFontSizePx">
            document.localIdToElement.get('label').getUsedStyleDimensions().fontSizePx</csvg:const>
        <csvg:const csvg:name="labelMarginBottomPx">
            document.localIdToElement.get('label').getUsedStyleDimensions().marginBottomPx</csvg:const>
        <csvg:const csvg:name="labelWidthPx">document.localIdToElement.get('label').getBBox().width</csvg:const>
    </csvg:consts>
    <g csvg:doc-local-id="content">
        <path csvg:doc-local-id="underline-border" class="underline-border"
            attr-expr:d="M0,{{ document.getConst('labelMarginBottomPx') }} h{{ document.getConst('labelWidthPx') }} M0,{{ document.getConst('labelMarginBottomPx') + document.getConst('labelFontSizePx') * 0.15 }} h{{ document.getConst('labelWidthPx') }}"
            d="M0,7.2 h711.7402954101562 M0,14.399999999999999 h711.7402954101562" />
        <path class="underline"
            attr-expr:d="{{ document.localIdToElement.get('underline-border').getAttribute('d') }}"
            d="M0,7.2 h711.7402954101562 M0,14.399999999999999 h711.7402954101562" />
        <text csvg:doc-local-id="label" class="label">Important: Don't pay attention!</text>
    </g>
</svg>
```

![The text "Important: Don't pay attention!", underlined](examples/underlined.svg)

## Alternative Solutions

* In simpler cases you may be able to achieve SVG responding to text layout
  using an SVG
  [`<foreignObject/>`](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/foreignObject)
  that embeds HTML in the SVG, and styling SVG, and HTML elements with CSS.
  This would, generally, be supported in a browser environment better than the
  Calculable SVG solution.
* The CSS
  [Houdini APIs](https://developer.mozilla.org/en-US/docs/Web/API/Houdini_APIs)
  will provide better separation of concerns, and likely quite a bit higher
  performance.  They're a better choice than CSVG.  Unfortunately, the
  [Painting API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Painting_API#browser_compatibility)
  is still (as of Oct., 2026) experimental, and some widely-used browser (like
  Firefox, and Safari) still don't list it as supported.  The
  [CSS Layout API](https://www.w3.org/TR/css-layout-api-1/) is still listed as
  'First Public Working Draft', and seems to run mainly in Chrome behind a
  feature flag.
* With tools like [SVGR](https://react-svgr.com/), and
  [svgdx](https://crates.io/crates/svgdx), you can generate SVG output from
  React code, Rust, or another language and framework that can evaluate SVG
  text layout.  (Such solutions, although having some advantages in comparison
  to Calculable SVG, may not be appropriate in environments, such as Markdown
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
  expression resolution) in a browser.  (This includes rendering a CSVG parsed
  by an HTML, rather than by an XML parser.)
* Minimize extra mark-up required for Calculable SVG.  (It's common to add
  extra attributes to elements on order to store data.  However, additional
  changes, such as adding extra elements have the potential to interfere with
  CSS selectors, and user code processing the DOM tree.)
* Allow expression resolution statically for a single state (e.g., when fonts,
  and text sizes are fixed).  (This follows from the previous point, but we
  want to make the process simpler to implement when possible.)

### Limitations, and Some Design Details

* This implementation relies on JavaScript to calculate document expressions,
  and detect style, dimension, and DOM changes in a browser.  This includes
  the following consequences:
  * Browsers
    [disable JavaScript](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image#restrictions)
    (as well as external resources like fonts, and referenced stylesheets) if
    an SVG is added to a Wab page in an `<img/>` element.  Therefore,
    Calculable SVGs can be rendered only when they're in-lined in HTML, or
    loaded by an `<object/>`, `<embed/>`, or `<iframe>` element.  (You can
    find a summary of some of the related SVG embedding limitations in
    articles like
    [Using Custom Fonts With SVG in an Image Tag](https://css-tricks.com/using-custom-fonts-with-svg-in-an-image-tag/).)
  * JavaScript currently doesn't seem to have a way to detect whether an
    element is in a CSS pseudo element state (such as hover).  (Although, you
    can listen to
    [`'mousenter'`](https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseenter_event),
    and
    [`'mouseleave'`](https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseleave_event)
    events, and can check which the currently focused document element is.)
    And you can't directly tell how far a transition animation has progressed.
    (If you install
    [animation event listeners](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animations/Using#using_animation_events)
    before an animation starts, you could calculate its progress by
    replicating the browser logic for keeping track of what direction it's
    moving in, and how much time has elapsed since the last iteration
    started.)
    * While you can use some element style values, such as font size, or
      padding dimensions in CSVG expressions, you explicitly specify the
      pseudo element whose style you're querying, and you cannot directly
      write expressions that respond to current CSS pseudo element state, or
      transitions between states.
      * You can, however, use some tricks.  E.g., if you wrap an element with
        CSS pseudo element states (e.g., a `<text/>` with `:hover` in a `</g>`
        like `<g><text>Label</text></g>`), the container element's (`<g/>`'s)
        bounding box will respond to size changes of the wrapped element's
        (`<text/>`'s) CSS pseudo element state, and you can use bounding box
        dimensions in a CSVG expression.
      * You won't, however, be able to use this trick to respond to, e.g.,
        color, or stroke width changes.  (The latter, at least until the
        [`getBBox` `{ stroke: true }` option](https://developer.mozilla.org/en-US/docs/Web/API/SVGGraphicsElement/getBBox#stroke)
        is widely implemented among browsers.)
      * It is possible to use other tricks to respond to CSS style changes,
        e.g. by associating a transition animation with a pseudo-element
        change, and listening for events like
        ['animationstart'](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Animations/Using#using_animation_events)
        on an `Element` as is done by libraries like
        [Style Observer](https://github.com/LeaVerou/style-observer), and
        [CSS Variable Observer](https://github.com/fluorumlabs/css-variable-observer/blob/master/src/index.ts).
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

See the
[Expression API](https://pavpen.github.io/npm-calculable-svg/dev/modules/xml_api.csvg_xml.html)
in the documentation.

## To-Do

* [ ] Clean up the CSVG expression API design.  (It currently works around
      peculiarities of the Jinja rendering engine.  Nujucks may work better.
      EJS will probably be faster, but with the code sanitizing challenges.)
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
  * [x] Be able to pause rendering live updates for CSVG documents not in
        view.  (Can implement in client code, e.g., using
        [`IntersectionObserver`](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API),
        and `CsvgDocument.stopLiveUpdate()`.)
  * [ ] Be able to transpile CSVG expressions to JavaScript (or Web Assembly).
* [ ] Static linting (unused constants, access to undefined or disallowed
      identifiers, circular dependencies, expression syntax validation, etc.)
* [ ] Non-abysmal unit test code coverage, and code clean-up.
* [ ] Integrate with [SSVG](https://github.com/michaschwab/ssvg).[^3]

[^3]: See
      [Scalable Scalable Vector Graphics: Automatic Translation of Interactive SVGs to a Multithread VDOM for Fast Rendering](https://jeffhuang.com/papers/SSVG_TVCG22.pdf)
