# Security policy

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub:
[Report a vulnerability](https://github.com/BenjaminLucier/maplibre-solidjs/security/advisories/new).
If you can't use GitHub, email benjaminlucier@gmail.com instead. Please don't open a public
issue or PR for a suspected vulnerability.

You can expect an acknowledgement within 3 working days. Fixes are coordinated
with you, and details are disclosed publicly once a fixed release is available,
or after 90 days at the latest.

## Scope

In scope: the code in this repository. It is a thin layer over MapLibre GL
JS, so the realistic risks are things like option values or event data from
props reaching the map in a way the documentation says they don't, or the
package shipping something other than what is in this repository.

Out of scope:

- Vulnerabilities in dependencies that don't affect this code. Report them
  upstream; fixes are picked up through Dependabot.
- Vulnerabilities in MapLibre GL JS itself, including style, tile and
  expression handling. Report them to
  [maplibre/maplibre-gl-js](https://github.com/maplibre/maplibre-gl-js/security).
- Map styles, tiles and other data your application loads; their safety is up
  to whoever serves them.

## Safe harbour

Good-faith research that follows this policy, avoids accessing other people's
data, and gives us reasonable time to fix issues will not be pursued by the
maintainers.
