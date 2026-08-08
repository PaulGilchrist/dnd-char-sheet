---
name: test-coverage
description: Analyze code coverage and spawn test-implementation subagents one at a time to improve coverage across the ranked queue.
---

## 1. Analyze coverage
Run `node coverage-analysis.mjs` (the script at the project root). This regenerates `./coverage/coverage-final.json` and writes the ranked queue to `/tmp/coverage_files.json` (top 100 source files with the least coverage). If the script fails, stop and report the error.

## 2. Load the queue
Read `/tmp/coverage_files.json`. It is a JSON array of up to 100 objects, each `{ "path": "<abs path>", "score": <number>, "status": "zero-coverage" | "partial" }`, sorted by score ascending then path. Note: files that are pure re-export shims (no coverable bytecode) are already excluded by the script.

## 3. Process the queue sequentially, one file at a time
NEVER batch multiple files into one subagent.

For each file in order, spawn a SINGLE fresh subagent (subagent_type `general`) with this exact prompt (filling in the placeholders):

```
# Task: Fully audit, plan, and IMPLEMENT the test for the file named '<PATH>' with coverage details needed for lines '<SCORE>% (<STATUS>)'.

## Coverage context:
- File: <PATH>
- Score: <SCORE>%
- Status: <STATUS> (zero-coverage = no existing tests; partial = partial coverage exists)
- [If partial: reference the coverage report output in ./coverage/coverage-final.json for which statements/functions/branches are uncovered]

## Rules:
- Do not run the coverage report yourself. Use only existing coverage data in `./coverage/coverage-final.json`
- Any test using a campaign name MUST use the EXACT campaign name of 'test-campaign' to prevent test data merging with production data. Mock all writes to disk.
- If the existing test files covering this code file, have the tags '@improved-by-ai' or '@cleaned-by-ai'. then remove those tags before adding any new tests to those files. Do not remove those tags from any other files.
- Ensure tests reflect intended functionality.
- When unsure of intended functionality, refer to the respective 'public/data' and 'public/data/2024' json files that define all the game rules. The code should always exactly implement those rules to the letter and if they don't, it's a code bug rather than a test bug.
- Break tests into multiple files as necessary to get the code coverage we need without letting any single test file get over 1000 lines.
- If you cannot fix any single test within 3 attempts, delete that test and continue on.
- NEVER modify production code without asking first.
- NEVER commit code while writing tests.
- Ensure all lint and tests pass before returning to the orchestrator, including if the errors are not related to your changes
```

- Wait for the subagent to complete before launching the next one.
- After each subagent finishes, record a 1-3 sentence outcome summary.
- Do NOT stop for approval, planning review, or confirmation.
- Continue automatically through the ENTIRE queue until it is complete or a blocking error occurs.

## 4. Finish
Print a final summary of all outcomes.
