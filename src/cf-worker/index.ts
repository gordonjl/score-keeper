import { makeDurableObject, makeWorker } from '@livestore/sync-cf/cf-worker'

export class WebSocketServer extends makeDurableObject({
  onPush: async (message) => {
    console.log('onPush', message.batch)
    return Promise.resolve()
  },
  onPull: async (message) => {
    console.log('onPull', message)
    return Promise.resolve()
  },
}) {}

export default makeWorker({
  validatePayload: (payload: unknown) => {
    // For now, just validate that we have a storeId
    // TODO: Add JWT validation in Phase 2
    if (!payload || typeof payload !== 'object' || !('storeId' in payload)) {
      throw new Error('Invalid payload: storeId required')
    }
    console.log('✅ Payload validated:', payload)
  },
  enableCORS: true,
})
