import type { VNodeChild } from 'vue'

export interface MenuOptionRef {
  current: HTMLElement | null
}

/** Base class for options shared by typeahead and node menus. */
export class MenuOption {
  key: string
  ref: MenuOptionRef
  icon?: VNodeChild
  title?: VNodeChild

  constructor(key: string) {
    this.key = key
    this.ref = { current: null }
    this.setRefElement = this.setRefElement.bind(this)
  }

  setRefElement(element: Element | null): void {
    this.ref = { current: element instanceof HTMLElement ? element : null }
  }
}
