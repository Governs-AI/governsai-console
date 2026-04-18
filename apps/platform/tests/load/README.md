# Load tests (k6)

Load scripts for GovernsAI services.

## Index

| Target    | Script path                                           | SLA (p95) |
|-----------|-------------------------------------------------------|-----------|
| precheck  | [`precheck/tests/load/precheck_load.js`][precheck-ld] | < 200 ms  |

The precheck load script lives in the precheck repo so its CI can run it
against a locally-booted service. Keep new scripts for dashboard/platform
APIs under this directory; scripts that target other services should live
with the service they exercise.

[precheck-ld]: https://github.com/Governs-AI/precheck/blob/main/tests/load/precheck_load.js

## Convention

Every load script must:

- Set at least one threshold (`http_req_duration`, `http_req_failed`).
- Export `handleSummary` so results land as a CI artifact.
- Document the run contract (rate, duration, SLA) at the top of the file.
