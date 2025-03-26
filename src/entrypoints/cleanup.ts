/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * cleanup logic.
 */
import { cleanup } from '../main.js'

/* istanbul ignore next */
await cleanup()
