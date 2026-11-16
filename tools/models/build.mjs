import { existsSync, mkdirSync, readdirSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../../', import.meta.url))
const publicDir = resolve(root, 'public')
const scripts = [
  'build_models.py',
  'build_towers.py',
  'build_enemies.py',
  'build_ruins.py',
  'build_flamethrower.py',
  ...[
    'enemy_grunt',
    'enemy_grenadier',
    'enemy_drone',
    'deco_ruin',
    'enemy_runner',
    'enemy_shield',
  ].map((name) => `pehota/${name}.py`),
]

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} завершился с кодом ${result.status}`)
  return result.stdout
}

export function stagingDir(path) {
  const output = resolve(path)
  let ancestor = output
  while (!existsSync(ancestor)) ancestor = dirname(ancestor)
  const actual = resolve(realpathSync(ancestor), relative(ancestor, output))
  const fromPublic = relative(publicDir, actual)
  if (
    fromPublic === '' ||
    (!fromPublic.startsWith(`..${sep}`) && fromPublic !== '..' && !isAbsolute(fromPublic))
  ) {
    throw new Error('Генерируйте в staging вне public; public заменяется только после проверки')
  }
  if (existsSync(output) && readdirSync(output).length)
    throw new Error('Staging должен быть новым или пустым каталогом')
  return output
}

export function build(args, blender = process.env.BLENDER) {
  if (args.length !== 2 || args[0] !== '--out')
    throw new Error('Запуск: BLENDER=<executable> npm run models:build -- --out <empty-staging>')
  if (!blender) throw new Error('Укажите исполняемый файл Blender в BLENDER')
  const output = stagingDir(args[1])
  const version = run(blender, ['--version'])
  if (!/^Blender 5\.2\.3 LTS\b/.test(version))
    throw new Error('Требуется Blender 5.2.3 LTS; см. tools/models/README.md')
  console.log(version.split('\n')[0])
  const source = resolve(root, 'tools/models/_src/tower-defense-kit')
  for (const file of [
    'License.txt',
    'Models/GLB format/detail-tree-large.glb',
    'Models/GLB format/detail-rocks-large.glb',
  ]) {
    if (!existsSync(resolve(source, file)))
      throw new Error(`Нет входного CC0-файла: ${resolve(source, file)}`)
  }
  mkdirSync(output, { recursive: true })
  for (const script of scripts) {
    console.log(`Генерация ${script}`)
    run(
      blender,
      [
        '--background',
        '--factory-startup',
        '--python-exit-code',
        '1',
        '--python',
        resolve(root, 'tools/models', script),
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, MODELS_OUT_DIR: output, RUIN: '' },
      },
    )
  }
  run(process.execPath, [resolve(root, 'tools/models/verify.mjs'), '--dir', output], {
    stdio: 'inherit',
  })
  console.log(`Проверенные GLB: ${output}. public не изменён.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    build(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
