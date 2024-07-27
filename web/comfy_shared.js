/**
 * Adapted from comfy_shared.js
 * Project: comfy_mtb
 * Author: Mel Massadian
 *
 */

// Reference the shared typedefs file
/// <reference path="../types/typedefs.js" />

import { app } from '../../scripts/app.js'

// #region widget utils
export const CONVERTED_TYPE = 'converted-widget'

export function hideWidget(node, widget, suffix = '') {
  widget.origType = widget.type
  widget.hidden = true
  widget.origComputeSize = widget.computeSize
  widget.origSerializeValue = widget.serializeValue
  widget.computeSize = () => [0, -4] // -4 is due to the gap litegraph adds between widgets automatically
  widget.type = CONVERTED_TYPE + suffix
  widget.serializeValue = () => {
    // Prevent serializing the widget if we have no input linked
    const { link } = node.inputs.find((i) => i.widget?.name === widget.name)
    if (link == null) {
      return undefined
    }
    return widget.origSerializeValue
      ? widget.origSerializeValue()
      : widget.value
  }

  // Hide any linked widgets, e.g. seed+seedControl
  if (widget.linkedWidgets) {
    for (const w of widget.linkedWidgets) {
      hideWidget(node, w, `:${widget.name}`)
    }
  }
}

/**
 * Show widget
 *
 * @param {import("../../../web/types/litegraph.d.ts").IWidget} widget - target widget
 */
export function showWidget(widget) {
  widget.type = widget.origType
  widget.computeSize = widget.origComputeSize
  widget.serializeValue = widget.origSerializeValue

  delete widget.origType
  delete widget.origComputeSize
  delete widget.origSerializeValue

  // Hide any linked widgets, e.g. seed+seedControl
  if (widget.linkedWidgets) {
    for (const w of widget.linkedWidgets) {
      showWidget(w)
    }
  }
}

export function convertToWidget(node, widget) {
  showWidget(widget)
  const sz = node.size
  node.removeInput(node.inputs.findIndex((i) => i.widget?.name === widget.name))

  for (const widget of node.widgets) {
    widget.last_y -= LiteGraph.NODE_SLOT_HEIGHT
  }

  // Restore original size but grow if needed
  node.setSize([Math.max(sz[0], node.size[0]), Math.max(sz[1], node.size[1])])
}

export function convertToInput(node, widget, config) {
  hideWidget(node, widget)

  const { linkType } = getWidgetType(config)

  // Add input and store widget config for creating on primitive node
  const sz = node.size
  node.addInput(widget.name, linkType, {
    widget: { name: widget.name, config },
  })

  for (const widget of node.widgets) {
    widget.last_y += LiteGraph.NODE_SLOT_HEIGHT
  }

  // Restore original size but grow if needed
  node.setSize([Math.max(sz[0], node.size[0]), Math.max(sz[1], node.size[1])])
}

export function hideWidgetForGood(node, widget, suffix = '') {
  widget.origType = widget.type
  widget.origComputeSize = widget.computeSize
  widget.origSerializeValue = widget.serializeValue
  widget.computeSize = () => [0, 0]
  widget.type = CONVERTED_TYPE + suffix
  if (widget.linkedWidgets) {
    for (const w of widget.linkedWidgets) {
      hideWidgetForGood(node, w, `:${widget.name}`)
    }
  }
}

export function fixWidgets(node) {
  if (node.inputs) {
    for (const input of node.inputs) {
      log(input)
      if (input.widget || node.widgets) {
        // if (newTypes.includes(input.type)) {
        const matching_widget = node.widgets.find((w) => w.name === input.name)
        if (matching_widget) {
          const w = node.widgets.find((w) => w.name === matching_widget.name)
          if (w && w.type !== CONVERTED_TYPE) {
            log(w)
            log(`hidding ${w.name}(${w.type}) from ${node.type}`)
            log(node)
            hideWidget(node, w)
          } else {
            log(`converting to widget ${w}`)

            convertToWidget(node, input)
          }
        }
      }
    }
  }
}

export const hasWidgets = (node) => {
  if (!node.widgets || !node.widgets?.[Symbol.iterator]) {
    return false
  }
  return true
}

export const cleanupNode = (node) => {
  if (!hasWidgets(node)) {
    return
  }
  for (const w of node.widgets) {
    if (w.canvas) {
      w.canvas.remove()
    }
    if (w.inputEl) {
      w.inputEl.remove()
    }
    // calls the widget remove callback
    w.onRemoved?.()
  }
}

/**
 * Extracts the type and link type from a widget config object.
 * @param {*} config
 * @returns
 */
export function getWidgetType(config) {
  // Special handling for COMBO so we restrict links based on the entries
  let type = config?.[0]
  let linkType = type
  if (Array.isArray(type)) {
    type = 'COMBO'
    linkType = linkType.join(',')
  }
  return { type, linkType }
}

// #region color utils
export function isColorBright(rgb, threshold = 240) {
  const brightess = getBrightness(rgb)
  return brightess > threshold
}

function getBrightness(rgbObj) {
  return Math.round(
    (Number.parseInt(rgbObj[0]) * 299 +
      Number.parseInt(rgbObj[1]) * 587 +
      Number.parseInt(rgbObj[2]) * 114) /
      1000,
  )
}
// #endregion

// #region node extensions

/**
 * Extend an object, either replacing the original property or extending it.
 * @param {Object} object - The object to which the property belongs.
 * @param {string} property - The name of the property to chain the callback to.
 * @param {Function} callback - The callback function to be chained.
 */
export function extendPrototype(object, property, callback) {
  if (object === undefined) {
    console.error('Could not extend undefined object', { object, property })
    return
  }
  if (property in object) {
    const callback_orig = object[property]
    object[property] = function (...args) {
      const r = callback_orig.apply(this, args)
      callback.apply(this, args)
      return r
    }
  } else {
    object[property] = callback
  }
}

/**
 * Appends a callback to the extra menu options of a given node type.
 * @param {NodeType} nodeType
 * @param {(app,options) => ContextMenuItem[]} cb
 */
export function addMenuHandler(nodeType, cb) {
  const getOpts = nodeType.prototype.getExtraMenuOptions
  /**
   * @returns {ContextMenuItem[]} items
   */
  nodeType.prototype.getExtraMenuOptions = function (app, options) {
    const r = getOpts.apply(this, [app, options]) || []
    const newItems = cb.apply(this, [app, options]) || []
    return [...r, ...newItems]
  }
}

// #endregion

// #region graph utilities
export const getNodes = (skip_unused) => {
  const nodes = []
  for (const outerNode of app.graph.computeExecutionOrder(false)) {
    const skipNode =
      (outerNode.mode === 2 || outerNode.mode === 4) && skip_unused
    const innerNodes =
      !skipNode && outerNode.getInnerNodes
        ? outerNode.getInnerNodes()
        : [outerNode]
    for (const node of innerNodes) {
      if ((node.mode === 2 || node.mode === 4) && skip_unused) {
        continue
      }
      nodes.push(node)
    }
  }
  return nodes
}
