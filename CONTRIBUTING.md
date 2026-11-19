# Contributing

Thanks for helping out! Bug reports, ideas and pull requests are welcome.

## Before you start

- **Bugs and small fixes:** a PR is welcome, ideally with a failing test.
- **Features and larger changes:** please open an issue first so we can agree
  on the approach before you spend time on it.
- Keep PRs small and focused, and justify every new dependency.
- By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Building

You need Node (the version in `.node-version`; with fnm, `fnm use`) and pnpm
(12.21.0 or newer, per `engines.pnpm`; `brew install pnpm` or `npm i -g pnpm`).

```sh
pnpm install
pnpm exec playwright install chromium   # once: tests run in headless Chromium
pnpm test:watch   # tests in watch mode
pnpm build        # dist/ (ESM and type declarations)
pnpm site:dev     # the docs site, against the library's source
```

Tests run in headless Chromium, since MapLibre needs WebGL and real layout,
except `*.server.test.tsx`, which run in Node with Solid's server build to
check what renders on the server.

The docs and demo site lives in `site/`, a private workspace package that
imports the library from `src/` directly. Its examples are real files in
`site/src/examples/`: the site runs each one and shows its source. It is
deployed to GitHub Pages from `main`.

## Checks

CI runs the following, and all must pass:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install --with-deps --only-shell chromium
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm pack --dry-run
pnpm site:build
```

A second job runs `pnpm typecheck` and `pnpm test` against the oldest
`maplibre-gl` the peer range allows. If a change needs a newer MapLibre,
raise the floor in `peerDependencies`, and in the README, in the same PR.

## Commit messages and PR titles

Commits follow [Conventional Commits](https://www.conventionalcommits.org/),
since the changelog is generated from them: `feat:` for new behaviour, `fix:`
for bugs, and `docs`, `refactor`, `test`, `perf`, `ci` or `chore` for the
rest. Mark breaking changes with `!`, as in `feat!: ...`.

PRs are squash-merged, so the **PR title** becomes the commit message, and CI
checks that it is a Conventional Commit.

## Who decides

This project is maintained by one person, who reviews every change and makes
the final call on direction. That's a matter of scale, not a closed door: if
you contribute regularly and want a bigger role, such as reviewing, owning a
part of the code or helping steer it, say so in an issue. This section will
change as the project gains maintainers.

## License

Unless you explicitly state otherwise, any contribution intentionally
submitted for inclusion in this project by you shall be licensed under the
project's license (`MIT OR Apache-2.0`), as defined in the Apache-2.0
license, without any additional terms or conditions.
There is no CLA and no sign-off requirement.
