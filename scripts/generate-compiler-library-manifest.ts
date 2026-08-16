import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { compilerLibraryNativeBuild, compilerLibraryPackage } from '../compiler/index.ts'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(packageRoot, 'compiler/library.json')

export function renderCompilerLibraryManifest(): string {
  return `${JSON.stringify(
    {
      version: 1,
      descriptor: compilerLibraryPackage,
      nativeBuild: compilerLibraryNativeBuild
    },
    null,
    2
  )}\n`
}

export async function generateCompilerLibraryManifest(check = false): Promise<boolean> {
  const expected = renderCompilerLibraryManifest()

  if (!check) {
    await writeFile(outputPath, expected)
    return true
  }

  let actual: string | null = null

  try {
    actual = await readFile(outputPath, 'utf8')
  } catch {}

  if (actual === expected) {
    return true
  }

  console.error('MongoDB compiler manifest is out of date. Run: pnpm compiler:manifest')
  return false
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = (await generateCompilerLibraryManifest(process.argv.includes('--check'))) ? 0 : 1
}
