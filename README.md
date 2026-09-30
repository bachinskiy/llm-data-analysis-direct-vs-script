# Supplementary materials for LLM data-analysis experiments

This repository contains the supplementary materials for the E2 experiments comparing two analytical workflows:

- **Direct**: an LLM transforms report rows directly;
- **Script**: an LLM generates a program that transforms the rows.

The experiments compare three mechanisms:

- **M2** — interactive Codex;
- **M3** — Codex CLI;
- **M4** — OpenAI API.

The complete experimental package, including inputs, saved outputs, generated scripts, token-usage evidence, cost calculations, and an offline verifier, is available here:

[e2_direct_script](./e2_direct_script/README.md)

The package covers experiments on 250 and 1,000 stored report rows. It supports verification of the saved results and calculations; it does not claim that future model runs will reproduce identical token usage or outputs.
