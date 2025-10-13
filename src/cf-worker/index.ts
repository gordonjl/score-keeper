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
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('authToken' in payload) ||
      payload.authToken !== 'insecure-token-change-me'
    ) {
      throw new Error('Invalid auth token')
    }
  },
  enableCORS: true,
})
