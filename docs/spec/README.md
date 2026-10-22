# Official `.xtemplate` schema snapshot

`xtemplate.schema.json` is copied from the authoritative [shardulvs/xtemplate](https://github.com/shardulvs/xtemplate) repository, `master` commit `d4a40883ea129e0a9be3079888178c3ec588b0fc` (MIT licensed).

Reference material: [SPEC.md](https://github.com/shardulvs/xtemplate/blob/master/SPEC.md) and the [upstream schema](https://github.com/shardulvs/xtemplate/blob/master/schema/xtemplate.schema.json).

The schema snapshot is compiled by `npm run schema:build` into a browser-safe, dependency-free `src/core/official-schema-validator.js`. Runtime validation runs on imports, edits and exports, in addition to the size, depth and ZIP checks in `src/core/validate-template.js` and `src/core/xtemplate-package.js`. `tests/official-schema.test.js` compares the generated validator with AJV and tests sample templates. Keep the snapshot and the generated validator synchronized when the specification changes.

## Studio layer labels

Studio previously stored visual layer labels as a nonstandard `name` property on individual nodes. The official schema permits metadata extensions only with `x-` prefixes, so new labels are serialized as `x-name`. Legacy nodes are upgraded on import by `src/core/template-migration.js`, including nested groups/repeats, preserving the human-readable names while keeping exports compatible with the upstream specification.
