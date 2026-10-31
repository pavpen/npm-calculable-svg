/**
 * The namespace below contains the Calculable SVG attributes, and elements
 * that can be added to a plain SVG document
 *
 * @document ../../../doc-builder/build/examples/examples.md
 *
 * @packageDocumentation
 */

import type {
  CsvgDocument,
  CsvgGlobalNamespace,
  CsvgGraphicsElement,
} from '../expression-api';

/**
 * Calculable SVG XML Elements, and Attributes
 *
 * A Calculable SVG document is a valid SVG document with several custom
 * elements, and attributes added for the purposes of calculating expressions.
 * The custom CSVG elements, and attributes have namespace URIs with prefix
 * {@link csvg_xml.csvgNamespaceUri}.
 *
 * @example
 * A CSVG document may look like:
 * {@include ../../../doc-builder/build/examples/underlined.svg.md}
 *
 * For more examples, see the
 * [Calculable SVG Examples](../../../doc-builder/build/examples/examples.md)
 * page.
 *
 * See:
 *
 * * {@link csvg_xml.attributes}
 * * {@link csvg_xml.elements}
 */
export namespace csvg_xml {
  export const svgNamespaceUri = 'http://www.w3.org/2000/svg';
  export const csvgNamespaceUri = 'http://xmlns.pavpen.dev/calculable-svg/0.1';

  /**
   * CSVG XML attributes that augment the ones from the SVG namespace
   */
  export namespace attributes {
    /**
     * See one of the attribute languages below for creating an attribute,
     * calculated by evaluating an expression
     */
    export namespace attribute_expression {
      const namespaceUriPrefix = `${csvgNamespaceUri}/attribute-expression`;

      /**
       * Creates an XML attribute whose vaule is produced by evaluating a Jinja
       * expression
       *
       * The output attribute has the same name as the attribute containing the
       * expression, but is in the default document namespace (usually
       * `"http://www.w3.org/2000/svg"`).
       *
       * If the output XML attribute already exists, its value will be the
       * initial value of the attribute (e.g, during document loading) until the
       * document is evaluated.
       *
       * Live updates (e.g., due to CSS style, or DOM changes) can cause the
       * attribute value to be re-calculated.
       *
       * E.g., the `<svg/>` `viewBox` attribute can be calculated from the
       * bounding box of a `<text/>` element.  Note the `attr-expr:viewBox`
       * attribute below.
       *
       * @example
       * {@include ../../../doc-builder/build/examples/text-with-automatic-viewbox.svg.md}
       *
       * * The expression uses the
       *   [Jinja template language syntax](https://jinja.palletsprojects.com/en/stable/templates/).
       * * The expression can access symbols from the {@link CsvgGlobalNamespace}.
       * * The string value of the template expression replaces, or creates an
       *   attribute of the same name, on the element, but in the default XML
       *   namespace.  E.g., in the example above, the result of evaluating
       *   `attr-expr:viewBox` becomes the value of a new `viewBox` attribute in the
       *   default, `"http://www.w3.org/2000/svg"`, namespace.
       * * An attribute expression can depend on:
       *   * Other attribute expressions (by accessing calculated attributes);
       *   * Constant expressions (by accessing them, e.g. with
       *     {@link CsvgDocument.getConst}).
       *   * DOM elements (by accessing their properties, e.g.
       *     {@link CsvgGraphicsElement.getBBox}).
       * * Expressions, and their dependencies must form a Directed Acyclic Graph.
       *   (I.e., circular references are not allowed.)
       */
      export namespace jinja {
        export const namespaceUri = `${namespaceUriPrefix}/jinja`;
      }

      /**
       * Explicitly defines the name of the attribute calculated by an
       * expression, which is defined
       * by {@link csvg_xml.attributes.attribute_expression.jinja}
       *
       * You can use this to work around attribute names being lowercased in
       * SVG embedded in non-XML HTML.
       */
      export namespace output_attribute_name {
        export const namespaceUri = `${namespaceUriPrefix}/attribute-name`;
      }
    }

    export namespace constant_expression {
      const namespaceUriPrefix = `${csvgNamespaceUri}/const-expression`;

      /**
       * Allows naming an expression, so it can be used in more complex expressions
       * without repeating its definition
       *
       * E.g., you can calculate the length of an octagon border's side from a text
       * label's bounding box, and assign the result to a constant.
       *
       * Consider the `const-expr:labelBBox` expression below.
       *
       * @example
       * {@include ../../../doc-builder/build/examples/text-with-automatic-viewbox.svg.md}
       *
       * * The constant definition should occur as an attribute of a `<consts/>`
       *   element in the `"http://xmlns.pavpen.dev/calculable-svg/0.1"` XML
       *   namespace, or it can occur as an attribute of any other element.
       * * The expression uses the
       *   [Jinja template language syntax](https://jinja.palletsprojects.com/en/stable/templates/).
       * * The expression can use the {@link CsvgGlobalNamespace}.
       * * The value of the expression becomes the value of the constant.  The
       *   name of the constant is the name of the XML attribute, without the
       *   `namespace:` prefix, or it can be specified explicitly.  E.g., in
       *   the example above, the `const-expr:labelBBox` creates the
       *   `labelBBox` constant.
       * * In an SVG embedded in HTML, the browser may use an HTML parser for
       *   the document.  In this case, attribute names can lose their casing,
       *   and, e.g., become lowercase.  This would cause the above constant
       *   definition to create a constant named 'labelbbox' instead,
       *   which can, in turn, cause other expressions to try to access an
       *   undefined constant named 'labelBBox'.  This can be fixed as
       *   follows.
       * * If an attribute with the same local name exists in the same owner
       *   element, but with namespace URI {@link const_name.namespaceUri},
       *   the value of this attribute becomes the name of the constant,
       *   overriding the attribute local name.
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
       */
      export namespace jinja {
        export const namespaceUri = `${namespaceUriPrefix}/jinja`;
      }

      /**
       * Explicitly defines the name of constant whose expression is defined
       * by {@link csvg_xml.attributes.constant_expression.jinja}
       */
      export namespace const_name {
        export const namespaceUri = `${namespaceUriPrefix}/const-name`;
      }
    }

    /**
     * Assigns a CSVG document-local ID to an element, so the element can be
     * looked up in expressions
     *
     * E.g., you can refer to a `<text/>` element by its `doc-local-id` in
     * order to calculate its bounding box.  Note the `doc-local-id="label"`
     * below.
     *
     * @example
     * {@include ../../../doc-builder/build/examples/text-with-automatic-viewbox.svg.md}
     *
     * * The `doc-local-id` attribute can be added to an SVG element.
     * * Each value must be unique within the SVG document (but not across the
     *   whole HTML DOM that may contain this, and other SVG documents).
     *
     * See {@link CsvgDocument.localIdToElement}.
     */
    export namespace doc_local_id {
      export const namespaceUri = csvgNamespaceUri;
      export const attributeName = 'doc-local-id';
    }
  }

  /**
   * CSVG XML elements that augment the ones from the SVG namespace
   */
  export namespace elements {
    /**
     * CSVG attributes on the root `<svg/>` element
     */
    export namespace svg {
      /**
       * CSVG attributes on the root `<svg/>` element
       */
      export namespace attributes {
        /**
         * Enables, or disables responding to Calculable SVG live updates,
         * such as:
         *
         * * updates to attribute, and constant expressions by modifying the
         *   DOM,
         * * style changes (e.g., due to CSS changes, pseudo element state
         *   changes, zoom changes, etc.), which can affect expressions, such
         *   as expressions referencing bounding boxes.
         *
         * ⚠️ Live updates may be paused, or processed with a delay to reduce
         * impact on page paints.  (JavaScript style calculated by
         * [`getComputedStyle`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)).
         * doesn't seem to curently have a good way of observing used style
         * updates.  Polling, and processing DOM mutations can add undesired
         * page paint overhead.)
         *
         * * Default value: `true`.
         * * Allowed value: `"true"`, `"false"`.
         *
         * @example Syntax
         *
         * ```
         * <svg
         *     xmlns="http://www.w3.org/2000/svg"
         *     xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
         *     csvg:live-update="false"
         * >
         *     <title>An example Calculable SVG that doesn't respond to
         *         expression, and style live updates</title>
         *     <script crossorigin="anonymous" href="evaluate-for-current-document.js"></script>
         * </svg>
         * ```
         *
         * @example Style Live Update
         * {@include ../../../doc-builder/build/examples/text-with-underbrace.svg.md}
         */
        export namespace live_update {
          export const namespaceUri = csvgNamespaceUri;
          export const attributeName = 'live-update';
        }

        /**
         * Specifies the minimum delay between style live updates
         *
         * You can use this to reduce the impact on page paint frame rate, at
         * the expense of updating the CSVG document less frequently
         *
         * @example Syntax
         *
         * ```
         * <svg
         *     xmlns="http://www.w3.org/2000/svg"
         *     xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
         *     csvg:style-update-delay-millis="100"
         * >
         *     <title>An example Calculable SVG that doesn't respond to
         *         expression, and style live updates</title>
         *     <script crossorigin="anonymous" href="evaluate-for-current-document.js"></script>
         * </svg>
         * ```
         */
        export namespace style_update_delay_millis {
          export const namespaceUri = csvgNamespaceUri;
          export const attributeName = 'style-update-delay-millis';
        }
      }
    }

    /**
     * Defines a constant, computed by evaluating a Jinja expression
     *
     * This is en element syntax, equivalent to
     * {@link csvg_xml.attributes.constant_expression.jinja}.  It may be
     * slightly more readable for constants with long expressions.
     *
     * @example Syntax
     *
     * ```
     * <svg
     *     xmlns="http://www.w3.org/2000/svg"
     *     xmlns:csvg="http://xmlns.pavpen.dev/calculable-svg/0.1"
     * >
     *     <title>Example constant expression</title>
     *     <script crossorigin="anonymous" href="evaluate-for-current-document.js"></script>
     *     <csvg:consts>
     *         <csvg:const csvg:name="myNameIsConstant">"So is my value."</csvg:const>
     *     </csvg:consts>
     * </svg>
     * ```
     *
     * @example Int64 Overflow
     * {@include ../../../doc-builder/build/examples/int64-overflow.svg.md}
     */
    export namespace csvg_const {
      export const namespaceUri = csvgNamespaceUri;
      export const elementName = 'const';
      export namespace attributes {
        export namespace const_name {
          export const namespaceUri = csvgNamespaceUri;
          export const attributeName = 'name';
        }
      }
    }
  }
}
