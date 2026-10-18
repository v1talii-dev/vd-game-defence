export { createBattle, damageMultiplier, starsForHp } from './model/battle'
export { runReplay, recordCommands, type Replay, type ReplayCommand } from './model/replay'
export type {
  Battle,
  BattleState,
  BattleEvent,
  BattleEventType,
  BattleEventOf,
  BattleOptions,
  BattleOutcome,
  Cell,
  Command,
  RejectReason,
  WaveProgress,
} from './model/types'
export {
  DAMAGE_MATRIX,
  HQ_HP,
  MORTAR_SCATTER,
  PREP_SECONDS,
  STAR_THRESHOLDS,
  START_MONEY,
} from './config/battle'
export { useBattleSession, type GameSpeed } from './store/battleSession'
