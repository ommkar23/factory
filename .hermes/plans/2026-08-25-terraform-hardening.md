# Terraform hardening

1. To-do: Separate API and application runtime identities and restrict API secret access to the API identity.
   To-verify: Inspect the Terraform dependency graph and validate that frontend services have no secret accessor binding.
2. To-do: Define initial API runtime configuration, secret references, and a reproducible secret provisioning order.
   To-verify: Run Terraform validation and confirm a greenfield plan can create a configured API revision only after secret versions exist.
3. To-do: Consolidate service image metadata, generate load-balancer path rules, and add production deletion safeguards.
   To-verify: Run formatting, static validation, and inspect a real-state plan for unintended replacement or deletion.
4. To-do: Correct deployment, IAM, backend, and verification documentation.
   To-verify: Review the documented bootstrap and verification sequence against the Terraform resources and outputs.
