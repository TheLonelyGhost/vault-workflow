# Vault Workflow via GitHub Actions

This is a mixture of shared workflows, composite actions, and TypeScript-based
actions that drive a delegation-based design for managing HashiCorp Vault.

## Backends

Supported terraform state backends include:

- AWS S3 (using lock files)

Planned support includes:

- HCP Terraform / Terraform Cloud / Terraform Enterprise (or API equivalent)
- Google Cloud Storage (GCS)

## Runtimes

Any runtime that holds 1:1 feature parity with HashiCorp's `terraform` binary
may be used. In this context, feature parity includes:

- all subcommands
- all options
- all (machine-oriented) output (e.g., `terraform show -json`)
- all exit codes (e.g., `-detailed-exitcode`)

In short, these runtimes are (generally) supported:

- HashiCorp Terraform (`terraform`)
- OpenTofu (`tofu`)
