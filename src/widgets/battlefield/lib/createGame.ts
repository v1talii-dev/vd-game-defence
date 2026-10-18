import Phaser from 'phaser'
import { BattleScene, type SceneData } from './BattleScene'

export type { SceneData }

export function createGame(parent: HTMLElement, data: SceneData): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1c1a14',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [],
    callbacks: { postBoot: (game) => game.scene.add('battle', BattleScene, true, data) },
  })
}
