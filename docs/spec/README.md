# Official `.xtemplate` schema snapshot

`xtemplate.schema.json` is copied from the authoritative [shardulvs/xtemplate](https://github.com/shardulvs/xtemplate) repository, `master` commit `d4a40883ea129e0a9be3079888178c3ec588b0fc` (MIT licensed).

Reference material: [SPEC.md](https://github.com/shardulvs/xtemplate/blob/master/SPEC.md) and the [upstream schema](https://github.com/shardulvs/xtemplate/blob/master/schema/xtemplate.schema.json).

The schema snapshot is exercised by `tests/official-schema.test.js` using AJV (development only). Runtime validation remains lightweight and offline, with package validation in `src/core/xtemplate-package.js`. Keep this snapshot synchronized when the specification changes.
