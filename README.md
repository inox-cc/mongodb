# MongoDB

This package provides the Inox MongoDB driver. It uses the MongoDB C Driver
behind a C++20 facade and exposes the supported subset through the bare
`mongodb` import.

The BSON boundary preserves strings, booleans, numbers, null, arrays, plain
objects, `Uint8Array`, `Date`, and `ObjectId`. Numbers are encoded as BSON
doubles. Decoded BSON integers outside the JavaScript safe integer range are
rejected instead of being rounded. Undefined object fields are omitted;
undefined array entries become null so indexes remain stable.

`ObjectId.toString()` and `ObjectId.toJSON()` both return the canonical
24-character hexadecimal representation. The native runtime descriptor exposes
these conversions to nested `console.log()` and `JSON.stringify()` calls.

The supported client API currently includes `MongoClient`, `Db`, typed
`Collection<T>`, connection pooling, basic CRUD, lazy find and aggregation
cursors, distinct values, and exact or estimated document counts. Cursors
support `sort()`, `limit()`, sequential `next()`, and `toArray()`. Both
`MongoClient.connect(uri, options)` and `new MongoClient(uri, options).connect()`
are available. Supported options are `appName`, `maxPoolSize`, and
`serverSelectionTimeoutMS`.

Collections support `createIndex()`, `createIndexes()`, and ordered or unordered
`bulkWrite()` operations. `MongoClient.bulkWrite()` performs writes across
multiple namespaces and requires MongoDB 8.0 or newer, matching the server
requirement of the underlying bulk-write command.

Database work runs outside the event-loop thread. Arguments cross the worker
boundary as owned BSON, and results are converted back to managed Inox values
before their promises settle. `MongoClient.close()` rejects new work and waits
for already queued operations before destroying its native pool. Repeated
`close()` calls are safe.

The current package requires the libuv loop backend. Transactions, sessions,
change streams, GridFS, client-side encryption, and authentication extensions
are not part of the supported API yet.

## Development

Development currently requires the Inox repository in the adjacent `../inox`
directory, Node.js 24 or newer, pnpm 11.21, CMake, and a C++20 compiler. Run
`pnpm install` once and `pnpm check` before committing changes.

The compiler integration shipped to consumers is data-only. `package.json`
points Inox at `compiler/library.json`, the TypeScript declarations, and the
package-owned native source and include directories. After changing
`compiler/index.ts`, regenerate the checked-in manifest:

```bash
pnpm compiler:manifest
```

`pnpm check` also verifies that the generated manifest is current.

The architecture tests do not require a MongoDB server. Runtime integration
tests require `mongod`. Their files export descriptors for the Inox library
test harness rather than registering standalone `node:test` tests; running them
from this repository will require the external-package test entrypoint that is
not implemented in Inox yet.

The package remains private while the matching external-package support is
being completed in Inox. Once both sides are released, applications import the
package as `mongodb`; the scoped npm package name remains `@inox-cc/mongodb`.

The bundled MongoDB C Driver remains under its own license and attribution
files in `third_party/mongo-c-driver`.
