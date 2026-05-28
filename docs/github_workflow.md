# GitHub Workflow

## Weekly Automation Branches

Every Sunday automation run should create or update a branch for the following week:

```text
codex/social-content-week-of-YYYY-MM-DD
```

Use the Monday of the prepared week as `YYYY-MM-DD`.

## Pull Requests

Open a draft PR against `main`:

```text
Prepare social content ops for week of YYYY-MM-DD
```

The PR body should include:

- Summary of generated or updated content
- Approval queue count
- Image prompt batch location
- Metrics import/report summary
- Tests run
- Remaining assumptions

## Safety Rules

- Do not commit directly to `main`.
- Do not mark generated content as `approved`.
- Do not mark content as `scheduled` or `published` unless source data already proves human approval.
- Do not store API keys or tokens in the repo.

## Merge Checklist

- Content has been reviewed by a human.
- Any approved assets match the asset filename convention.
- No unsupported claims are present.
- Tests pass.
- README/docs remain accurate.
