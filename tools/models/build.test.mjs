import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { afterEach, it } from 'node:test'
import { build, stagingDir } from './build.mjs'

const temporary = []
afterEach(() => {
  for (const dir of temporary.splice(0)) rmSync(dir, { recursive: true, force: true })
})

it('accepts empty staging and prevents writing to public or a nonempty directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vd-model-build-'))
  temporary.push(dir)
  assert.equal(stagingDir(dir), dir)
  assert.throws(() => stagingDir('public/assets/models'), /вне public/)
  writeFileSync(join(dir, 'keep.txt'), 'existing content')
  assert.throws(() => stagingDir(dir), /пустым/)
})

it('validates invocation, Blender selection and version before generating files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vd-model-build-'))
  temporary.push(dir)
  const output = join(dir, 'stage')
  assert.throws(() => build([], process.execPath), /Запуск/)
  assert.throws(() => build(['--out', output], ''), /BLENDER/)
  assert.throws(() => build(['--out', output], process.execPath), /5.2.3/)
  mkdirSync(output)
  assert.equal(stagingDir(output), output)
})
