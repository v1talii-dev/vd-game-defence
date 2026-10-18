import Phaser from 'phaser'

class BattleScene extends Phaser.Scene {
  constructor() {
    super('battle')
  }
  create() {
    this.add.text(16, 16, 'M0', { color: '#f0e6d0' })
  }
}

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#1c1a14',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [BattleScene],
  })
}
