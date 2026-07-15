<script setup lang="ts">
import type { Provider, ProviderAwareness, UserState } from '@lexical/yjs'
import { TOGGLE_CONNECT_COMMAND } from '@lexical/yjs'
import type { LexicalEditor } from 'lexical'
import { REDO_COMMAND, UNDO_COMMAND } from 'lexical'
import { applyUpdate, Doc, encodeStateAsUpdate } from 'yjs'
import { ref } from 'vue'
import {
  CollaborationPluginV2__EXPERIMENTAL,
  ContentEditable,
  EditorRefPlugin,
  LexicalCollaboration,
  LexicalComposer,
  RichTextPlugin,
} from '@gridigor/vue-lexical'

type ProviderEvent = 'reload' | 'status' | 'sync' | 'update'
type ProviderListener = (...args: unknown[]) => void

class LocalAwareness implements ProviderAwareness {
  private readonly listeners = new Set<() => void>()
  private localState: UserState | null = null

  constructor(
    private readonly provider: LocalProvider,
    private readonly hub: LocalCollaborationHub,
  ) {}

  getLocalState = () => this.localState
  getStates = () => this.hub.getAwarenessStates()
  on = (_type: 'update', listener: () => void) => this.listeners.add(listener)
  off = (_type: 'update', listener: () => void) => this.listeners.delete(listener)
  setLocalState = (state: UserState | null) => {
    this.localState = state
    this.hub.broadcastAwareness(this.provider)
  }
  setLocalStateField = (field: string, value: unknown) => {
    if (this.localState !== null) {
      this.localState = { ...this.localState, [field]: value }
      this.hub.broadcastAwareness(this.provider)
    }
  }

  emitUpdate(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

class LocalProvider {
  readonly awareness: LocalAwareness
  private readonly listeners = new Map<ProviderEvent, Set<ProviderListener>>()
  connected = false

  constructor(
    readonly doc: Doc,
    private readonly hub: LocalCollaborationHub,
    private readonly onConnectionChange: (connected: boolean) => void,
  ) {
    this.awareness = new LocalAwareness(this, hub)
    doc.on('update', (update, origin) => {
      if (this.connected && origin !== hub) {
        hub.broadcastDocument(this, update)
      }
    })
  }

  connect(): void {
    if (!this.connected) {
      this.connected = true
      this.hub.connect(this)
      this.onConnectionChange(true)
    }
    this.emit('status', { status: 'connected' })
    this.emit('sync', true)
  }

  disconnect(): void {
    if (this.connected) {
      this.connected = false
      this.hub.disconnect(this)
      this.onConnectionChange(false)
    }
    this.emit('status', { status: 'disconnected' })
  }

  on(type: ProviderEvent, listener: ProviderListener): void {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  off(type: ProviderEvent, listener: ProviderListener): void {
    this.listeners.get(type)?.delete(listener)
  }

  private emit(type: ProviderEvent, value: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(value)
    }
  }
}

class LocalCollaborationHub {
  private readonly providers = new Set<LocalProvider>()

  connect(provider: LocalProvider): void {
    for (const peer of this.providers) {
      applyUpdate(provider.doc, encodeStateAsUpdate(peer.doc), this)
      applyUpdate(peer.doc, encodeStateAsUpdate(provider.doc), this)
    }
    this.providers.add(provider)
    this.broadcastAwareness(provider)
  }

  disconnect(provider: LocalProvider): void {
    this.providers.delete(provider)
    this.broadcastAwareness(provider)
  }

  broadcastDocument(sender: LocalProvider, update: Uint8Array): void {
    for (const provider of this.providers) {
      if (provider !== sender) {
        applyUpdate(provider.doc, update, this)
      }
    }
  }

  broadcastAwareness(_sender: LocalProvider): void {
    for (const provider of this.providers) {
      provider.awareness.emitUpdate()
    }
  }

  getAwarenessStates(): Map<number, UserState> {
    const states = new Map<number, UserState>()
    for (const provider of this.providers) {
      const state = provider.awareness.getLocalState()
      if (state !== null) {
        states.set(provider.doc.clientID, state)
      }
    }
    return states
  }
}

const hub = new LocalCollaborationHub()
const editors = ref<Array<LexicalEditor | null>>([null, null])
const connected = ref([false, false])
const identities = [
  { color: '#4f46e5', name: 'Ada' },
  { color: '#db2777', name: 'Grace' },
]

const initialConfigs = identities.map((identity) => ({
  namespace: `CollaborationExample-${identity.name}`,
  editorState: null,
  onError(error: Error) {
    throw error
  },
  theme: {
    paragraph: 'editor-paragraph',
  },
}))

const documents = identities.map(() => new Doc({ gc: false }))
const providers = documents.map(
  (doc, index) =>
    new LocalProvider(doc, hub, (value) => {
      connected.value[index] = value
    }) as unknown as Provider,
)

function captureEditor(index: number, editor: LexicalEditor | null): void {
  editors.value[index] = editor
}

function toggleConnection(index: number): void {
  editors.value[index]?.dispatchCommand(TOGGLE_CONNECT_COMMAND, !connected.value[index])
}

function undo(index: number): void {
  editors.value[index]?.dispatchCommand(UNDO_COMMAND, undefined)
}

function redo(index: number): void {
  editors.value[index]?.dispatchCommand(REDO_COMMAND, undefined)
}
</script>

<template>
  <section class="collaboration-card" aria-labelledby="collaboration-title">
    <div class="collaboration-heading">
      <div>
        <p class="eyebrow">Yjs collaboration</p>
        <h2 id="collaboration-title">Two editors, one document</h2>
      </div>
      <p>Type in either editor, move the selection, or take one client offline and reconnect it.</p>
    </div>

    <div class="collaboration-grid">
      <article v-for="(identity, index) in identities" :key="identity.name" class="client-card">
        <header>
          <span class="client-identity">
            <i :style="{ background: identity.color }" />
            {{ identity.name }}
          </span>
          <span :class="['connection-state', { offline: !connected[index] }]">
            {{ connected[index] ? 'Online' : 'Offline' }}
          </span>
        </header>

        <LexicalCollaboration>
          <LexicalComposer :initial-config="initialConfigs[index]!">
            <RichTextPlugin>
              <template #contentEditable>
                <ContentEditable
                  class="collaboration-input"
                  :aria-label="`${identity.name} collaborative editor`"
                />
              </template>
              <template #placeholder>
                <p class="collaboration-placeholder">Type here…</p>
              </template>
            </RichTextPlugin>
            <EditorRefPlugin :editor-ref="(editor) => captureEditor(index, editor)" />
            <CollaborationPluginV2__EXPERIMENTAL
              id="nuxt-collaboration-demo"
              :doc="documents[index]!"
              :provider="providers[index]!"
              :__should-bootstrap-unsafe="index === 0"
              :username="identity.name"
              :cursor-color="identity.color"
            />
          </LexicalComposer>
        </LexicalCollaboration>

        <footer>
          <button type="button" @click="undo(index)">Undo</button>
          <button type="button" @click="redo(index)">Redo</button>
          <button type="button" @click="toggleConnection(index)">
            {{ connected[index] ? 'Go offline' : 'Reconnect' }}
          </button>
        </footer>
      </article>
    </div>

    <p class="collaboration-note">
      This demo passes externally created Yjs documents and providers to the experimental V2 plugin.
      Its in-memory transport can be replaced with y-websocket, WebRTC, or another Yjs provider.
    </p>
  </section>
</template>
