import assert from 'node:assert/strict'
import { access, readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { compilerLibraryNativeBuild, compilerLibraryPackage } from '../../compiler/index.ts'
import { renderCompilerLibraryManifest } from '../../scripts/generate-compiler-library-manifest.ts'

const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const inoxRoot = resolve(packageRoot, '../inox')

test('mongodb package describes its compiler and native integration', () => {
  assert.equal(compilerLibraryPackage.id, 'mongodb')
  assert.deepEqual(compilerLibraryNativeBuild.cmakeLinkLibraries, ['mongoc::static'])
  assert.deepEqual(
    compilerLibraryNativeBuild.cmakeProjects?.map((project) => project.sourceDir),
    ['third_party/mongo-c-driver']
  )

  const objectId = compilerLibraryPackage.nativeTypes?.find((item) => item.typeId === 'mongodb#ObjectId')
  const cursor = compilerLibraryPackage.nativeTypes?.find((item) => item.typeId === 'mongodb#Cursor')

  assert.ok(objectId)
  assert.equal(objectId.cRuntimeValueOwnership, 'owned')
  assert.deepEqual(cursor?.declarationNames, ['FindCursor', 'AggregationCursor'])
  assert.ok(
    compilerLibraryPackage.operations?.some((item) => item.bindingId === 'mongodb#module:mongodb:BSON.serialize')
  )
  assert.ok(
    compilerLibraryPackage.operations?.some((item) => item.bindingId === 'mongodb#module:mongodb:BSON.deserialize')
  )
  assert.ok(compilerLibraryPackage.operations?.some((item) => item.bindingId === 'mongodb#Collection.find'))
  assert.ok(compilerLibraryPackage.operations?.some((item) => item.bindingId === 'mongodb#Cursor.toArray'))
  assert.ok(compilerLibraryPackage.operations?.some((item) => item.bindingId === 'mongodb#ObjectId.toJSON'))
  assert.ok(compilerLibraryPackage.operations?.some((item) => item.bindingId === 'mongodb#Collection.createIndexes'))
  assert.ok(compilerLibraryPackage.operations?.some((item) => item.bindingId === 'mongodb#Collection.bulkWrite'))
  assert.ok(compilerLibraryPackage.operations?.some((item) => item.bindingId === 'mongodb#MongoClient.bulkWrite'))
})

test('npm package exposes a data-only Inox compiler contract', async () => {
  const packageJson = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8')) as {
    exports: { '.': { types: string }; './package.json': string }
    files: string[]
    inox: unknown
    peerDependencies: Record<string, string>
    types: string
  }
  const expectedInoxManifest = {
    manifestVersion: 1,
    libraryId: 'mongodb',
    importSource: 'mongodb',
    compilerLibrary: './compiler/library.json',
    declarations: './index.d.ts',
    native: {
      sources: ['./src/mongodb.cc'],
      includeDirs: ['./include']
    }
  }

  assert.deepEqual(packageJson.inox, expectedInoxManifest)
  assert.equal(packageJson.types, './index.d.ts')
  assert.equal(packageJson.exports['.'].types, './index.d.ts')
  assert.equal(packageJson.exports['./package.json'], './package.json')
  assert.equal(packageJson.peerDependencies['@inox-cc/inox'], '0.0.1')
  assert.ok(packageJson.files.includes('compiler/library.json'))
  assert.ok(packageJson.files.includes('third_party/mongo-c-driver'))
  assert.equal(await readFile(join(packageRoot, 'compiler/library.json'), 'utf8'), renderCompilerLibraryManifest())
})

test('mongodb facade does not expose C Driver headers', async () => {
  const header = await readFile(join(packageRoot, 'include/inox/mongodb.h'), 'utf8')
  const implementation = await readFile(join(packageRoot, 'src/mongodb.cc'), 'utf8')

  assert.doesNotMatch(header, /bson\/bson\.h|mongoc\/mongoc\.h/)
  assert.match(implementation, /#include <bson\/bson\.h>/)
})

test('mongo-c-driver has reproducible vendor metadata', async () => {
  const metadata = await readFile(join(packageRoot, 'third_party/mongo-c-driver/INOX_VENDOR_METADATA'), 'utf8')

  assert.match(metadata, /^version=2\.3\.3$/m)
  assert.match(metadata, /^sha256=798109524c633b5136978bbdc6229e4b0af0a4c6ba2d17b8b8fb39855c55258e$/m)
})

test('mongodb does not require package-specific branches in the Inox build', async () => {
  const source = await readFile(join(inoxRoot, 'stdlib/CMakeLists.txt'), 'utf8')

  assert.doesNotMatch(source, /mongo|bson/i)
})

test('mongodb sources and tests are outside the Inox repository', async () => {
  const centralRunner = await readFile(join(inoxRoot, 'tests/all.test.ts'), 'utf8')
  const integrationTests = (await readdir(join(packageRoot, 'tests/integration'))).filter((file) =>
    file.endsWith('.test.ts')
  )

  await assert.rejects(access(join(inoxRoot, 'stdlib/packages/mongodb')))
  await assert.rejects(access(join(inoxRoot, 'third_party/mongo-c-driver')))
  assert.doesNotMatch(centralRunner, /mongodb/i)
  assert.equal(integrationTests.length, 5)
})
