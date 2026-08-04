---
name: apply
description: Apply deterministic transform/emit and run target-specific postprocess workflow
---

# /transpec:apply

Run the Transpec apply workflow for this project.

## Goal

Apply deterministic transformation/emission using RAW IR plus any generated enhanced analysis, then review or refine the generated target-specific grounded specs.

## Steps

1. Read `.transpec/config.yaml`.
2. Confirm the enhanced analysis file exists if this project requires semantic enrichment:
   ```
   .transpec/workspace/enhanced-analysis.json
   ```
3. Run:
   ```bash
   transpec apply
   ```
4. Review the deterministic grounded docs that `transpec apply` already generated under `.trellis/spec/`.
5. Read the target postprocess skill:
   ```
   .transpec/skills/postprocess/trellis/SKILL.md
   ```
6. Read the generated postprocess context:
   ```
   .transpec/workspace/postprocess-context.json
   ```
7. Follow the postprocess skill only if the generated grounded docs still need refinement or expansion.

## Important

- The CLI handles deterministic transform/emit plumbing.
- The CLI also runs deterministic postprocess generation for supported target frameworks.
- Use the project-local skill markdown already generated in `.transpec/skills/`.
- Do not fetch skill markdown from the installed npm package during agent execution.

