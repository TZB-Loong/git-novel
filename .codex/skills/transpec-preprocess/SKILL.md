---
name: transpec-preprocess
description: Prepare RAW IR and execute source-specific preprocess workflow.
license: Apache-2.0
compatibility: Requires transpec CLI.
metadata:
  author: transpec
  version: "1.0"
---

# transpec-preprocess Skill

Run the Transpec preprocess workflow for this project.

## Goal

Prepare deterministic RAW IR, then execute the source-specific preprocess skill and write enhanced analysis back into the project runtime directory.

## Steps

1. Read `.transpec/config.yaml`.
2. Run:
   ```bash
   transpec preprocess
   ```
3. Read the source preprocess skill:
   ```
   .transpec/skills/preprocess/openspec/SKILL.md
   ```
4. Read the generated preprocess context:
   ```
   .transpec/workspace/preprocess-context.json
   ```
5. Follow the preprocess skill and analyze the source project.
6. Write the enhanced analysis JSON to:
   ```
   .transpec/workspace/enhanced-analysis.json
   ```
7. Refresh the preprocess context snapshot so `hasEnhancedAnalysis` reflects the written analysis:
   ```bash
   transpec preprocess --skip-convert
   ```

## Enhanced Analysis Output Format

```json
{
  "version": "1.0.0",
  "generatedAt": "ISO-8601 timestamp",
  "sourceFramework": "<source framework>",
  "targetFramework": "<target framework>",
  "entities": {
    "<entity-id>": {
      "intent": "One sentence describing the goal",
      "keyPoints": ["Point 1"],
      "dependencies": ["dependency"],
      "constraints": ["constraint"],
      "requirement": ["requirement"],
      "design": ["design decision"],
      "implementNote": ["implementation note"]
    }
  }
}
```

## Important

- Do not look for built-in skill markdown inside the installed npm package.
- Use the project-local skill markdown already generated in `.transpec/skills/`.
- Validate the JSON by re-reading the file after writing it.
- The final `transpec preprocess --skip-convert` refresh keeps `.transpec/workspace/preprocess-context.json` consistent with the saved enhanced analysis.

