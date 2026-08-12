import { coreHandlers } from './core-handlers.js'
import { classFeatureHandlers } from './class-feature-handlers.js'
import { elementalHandlers } from './elemental-handlers.js'
import { utilityHandlers } from './utility-handlers.js'

export const miscHandlers = {
    ...coreHandlers,
    ...classFeatureHandlers,
    ...elementalHandlers,
    ...utilityHandlers,
}
