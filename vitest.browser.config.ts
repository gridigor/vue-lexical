import { playwright, defineBrowserCommand } from '@vitest/browser-playwright'
import vue from '@vitejs/plugin-vue'
import type { FrameLocator } from 'playwright'
import { defineConfig } from 'vitest/config'

interface PointerTarget {
  index: number
  selector: string
  xRatio: number
  yRatio: number
}

function getTargetPoint(iframe: FrameLocator, target: PointerTarget) {
  return iframe
    .locator(target.selector)
    .nth(target.index)
    .boundingBox()
    .then((box) => {
      if (box === null) {
        throw new Error(`Cannot find a visible pointer target: ${target.selector}`)
      }

      return {
        x: box.x + box.width * target.xRatio,
        y: box.y + box.height * target.yRatio,
      }
    })
}

function dispatchTargetPointerMove(iframe: FrameLocator, target: PointerTarget, buttons: number) {
  return iframe
    .locator(target.selector)
    .nth(target.index)
    .evaluate(
      (element, { buttons: eventButtons, target: pointerTarget }) => {
        const view = element.ownerDocument.defaultView
        if (view === null) {
          throw new Error('Cannot dispatch a pointer event without a window')
        }

        const rect = element.getBoundingClientRect()
        element.dispatchEvent(
          new view.PointerEvent('pointermove', {
            bubbles: true,
            buttons: eventButtons,
            clientX: rect.left + rect.width * pointerTarget.xRatio,
            clientY: rect.top + rect.height * pointerTarget.yRatio,
            composed: true,
            pointerType: 'mouse',
          }),
        )
      },
      { buttons, target },
    )
}

const mouseMove = defineBrowserCommand<[PointerTarget]>(async ({ iframe, page }, target) => {
  const point = await getTargetPoint(iframe, target)
  await page.mouse.move(point.x, point.y)
  await dispatchTargetPointerMove(iframe, target, 0)
})

const mouseDrag = defineBrowserCommand<[PointerTarget, PointerTarget]>(
  async ({ iframe, page }, from, to) => {
    const start = await getTargetPoint(iframe, from)
    const end = await getTargetPoint(iframe, to)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 8 })
    await dispatchTargetPointerMove(iframe, to, 1)
    await page.mouse.up()
  },
)

const mouseDragBy = defineBrowserCommand<[PointerTarget, number, number]>(
  async ({ iframe, page }, from, deltaX, deltaY) => {
    const start = await getTargetPoint(iframe, from)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + deltaX, start.y + deltaY, { steps: 8 })
    await page.mouse.up()
  },
)

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['tests/browser/**/*.browser.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
      commands: { mouseDrag, mouseDragBy, mouseMove },
      viewport: { height: 720, width: 1024 },
    },
  },
})
