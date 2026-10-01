# LLM data analysis direct vs script

Supplementary materials for an empirical study of LLM-supported data
analytics. The repository separates an earlier exploratory package from the
later audited evidence package; they must not be treated as one homogeneous
experiment.

## Current audited evidence package

The current package is
[`controlled_BC_2026-10-01`](./controlled_BC_2026-10-01/README.md).
Its immutable publication snapshots are listed on the
[GitHub Releases page](https://github.com/bachinskiy/llm-data-analysis-direct-vs-script/releases).

It contains:

- Series B: 18 selected successful executions of a 1,000-record formalized
  transformation, with prompts, outputs, tool traces, usage evidence, and
  generated programs;
- Series C: three program-generation executions applied to the full available
  215,849-record table;
- an offline verifier, replay helper, pricing rules, protocol, and explicit
  documentation of known limitations.

The package reports observed trajectories, not a fully controlled causal
comparison of interfaces. In particular, historical M2/M3 runs named
`direct` used PowerShell during transformation; the package documents this
fact rather than relabeling the original records.

To verify saved outputs locally, see the package README and run:

```sh
python verify.py --replay-scripts
```

No OpenAI key, database, or internet connection is required for that check.

## Historical E2 package

[`e2_direct_script`](./e2_direct_script/README.md) preserves earlier
experiments on 250 and 1,000 stored report rows. It is useful as historical
engineering evidence, but it is not the audited Series B/C package and does
not support the same claims.

## Data and reuse

The packages use a retained historical import of the Kaggle *Railroad
Accident & Incident Data* dataset. The repository does not grant rights to
third-party source data. See each package's `DATA_SOURCE.md` for provenance
and data-use notes.

Author-created code and documentation are available under the
[MIT License](./LICENSE). This license does not apply to third-party source
data or to their documentation and terms of use.
