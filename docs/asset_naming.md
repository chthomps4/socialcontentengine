# Image Asset Naming Convention

Use deterministic filenames so every visual can be traced to a post draft.

Pattern:

```text
assets/images/{brand_slug}/{yyyy}/{mm}/{yyyy-mm-dd}_{brand_slug}_{platform_slug}_{campaign_slug}_{pillar_slug}_{post_id}.png
```

Example:

```text
assets/images/business-signal-workshop/2026/06/2026-06-01_business-signal-workshop_linkedin_social-content-engine-launch_systems_bsw-2026-06-01-linkedin.png
```

Rules:

- Use lowercase slugs.
- Use hyphens inside slug values.
- Keep one final asset filename per content calendar row.
- Do not replace a file silently after publication. Create a new version suffix if needed, such as `_v2`.
- Keep source files and exports in the same brand/date folder when design tools generate multiple formats.
