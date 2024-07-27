/**
 * Adapted from mtb_widgets.js
 * Project: comfy_mtb
 * Author: Mel Massadian
 *
 */

/// <reference path="../types/typedefs.js" />

import { app } from '../../scripts/app.js'
import parseCss from './extern/parse-css.js'
import * as shared from './comfy_shared.js'

const newTypes = ['COLOR']

export const ColorWidgets = {
  COLOR: (key, val, compute = false) => {
    /** @type {import("/types/litegraph").IWidget} */
    const widget = {}
    widget.y = 0
    widget.name = key
    widget.type = 'COLOR'
    widget.options = { default: '#ff0000' }
    widget.value = val || '#ff0000'
    widget.draw = function (ctx, node, widgetWidth, widgetY, height) {
      const hide = this.type !== 'COLOR' && app.canvas.ds.scale > 0.5
      if (hide) {
        return
      }
      ctx.beginPath()
      ctx.fillStyle = this.value
      ctx.roundRect(15,widgetY,widgetWidth-30,height,height)
      ctx.stroke()
      ctx.fill()
      ctx.beginPath()
      const color = parseCss(this.value.default || this.value)
      if (!color) {
        return
      }
      ctx.fillStyle = shared.isColorBright(color.values, 125) ? '#000' : '#fff'

      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(this.name, widgetWidth * 0.5, widgetY + 15)
    }
    widget.mouse = function (e, pos, node) {
      if (e.type === 'pointerdown') {
        const widgets = node.widgets.filter((w) => w.type === 'COLOR')

        for (const w of widgets) {
          // color picker
          const rect = [w.last_y, w.last_y + 32]
          if (pos[1] > rect[0] && pos[1] < rect[1]) {
            const picker = document.createElement('input')
            picker.type = 'color'
            picker.value = this.value

            picker.style.position = 'absolute'
            picker.style.left = '999999px'
            picker.style.top = '999999px'

            document.body.appendChild(picker)

            picker.addEventListener('change', () => {
              this.value = picker.value
              this.callback?.(this.value)
              node.graph._version++
              node.setDirtyCanvas(true, true)
              picker.remove()
            })

            picker.click()
          }
        }
      }
    }
    widget.computeSize = function (width) {
      return [width, 20]
    }

    return widget
  },

}

/**
 * @returns {import("./types/comfy").ComfyExtension} extension
 */
const widgets = {
  name: 'mtb.widgets',


  getCustomWidgets: () => {
    return {
      COLOR: (node, inputName, inputData, _app) => {
        console.debug('Registering color')
        return {
          widget: node.addCustomWidget(
            ColorWidgets.COLOR(inputName, inputData[1]?.default || '#ff0000'),
          ),
          minWidth: 150,
          minHeight: 30,
        }
      },
    }
  },
  /**
   * @param {NodeType} nodeType
   * @param {NodeData} nodeData
   * @param {import("./types/comfy").App} app
   */
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // const rinputs = nodeData.input?.required

    let has_custom = false
    if (nodeData.input && nodeData.input.required) {
      for (const i of Object.keys(nodeData.input.required)) {
        const input_type = nodeData.input.required[i][0]

        if (newTypes.includes(input_type)) {
          has_custom = true
          break
        }
      }
    }
    if (has_custom) {
      //- Add widgets on node creation
      const onNodeCreated = nodeType.prototype.onNodeCreated
      nodeType.prototype.onNodeCreated = function () {
        const r = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined
        this.serialize_widgets = true
        this.setSize?.(this.computeSize())

        this.onRemoved = function () {
          // When removing this node we need to remove the input from the DOM
          shared.cleanupNode(this)
        }
        return r
      }

      //- Extra menus
      const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions
      nodeType.prototype.getExtraMenuOptions = function (_, options) {
        const r = origGetExtraMenuOptions
          ? origGetExtraMenuOptions.apply(this, arguments)
          : undefined
        if (this.widgets) {
          let toInput = []
          let toWidget = []
          for (const w of this.widgets) {
            if (w.type === shared.CONVERTED_TYPE) {
            } else if (newTypes.includes(w.type)) {
              const config = nodeData?.input?.required[w.name] ||
                nodeData?.input?.optional?.[w.name] || [w.type, w.options || {}]

              toInput.push({
                content: `Convert ${w.name} to input`,
                callback: () => shared.convertToInput(this, w, config),
              })
            }
          }
          if (toInput.length) {
            options.push(...toInput, null)
          }

          if (toWidget.length) {
            options.push(...toWidget, null)
          }
        }

        return r
      }
    }
  },
}

app.registerExtension(widgets)
