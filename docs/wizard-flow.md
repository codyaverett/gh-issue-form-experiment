# Multi-Issue Wizard Flow

A GitHub Actions workflow that implements a multi-stage form wizard using separate GitHub Issue Forms for each stage, linked via pre-filled URLs.

## Overview

This workflow implements a 3-stage wizard where each stage is a separate GitHub Issue:

```
Stage 1 Issue (Project Info)
    -> Comment with pre-filled Stage 2 URL

Stage 2 Issue (Technical Config)
    -> Closes Stage 1
    -> Comment with pre-filled Stage 3 URL

Stage 3 Issue (Confirm)
    -> Closes Stage 2 (and Stage 1 if open)
    -> Posts final summary with links to all stages
    -> Closes itself
```

## How It Works

1. **Stage 1**: User creates issue using Stage 1 form
   - Workflow posts comment with link to Stage 2 form (pre-filled with Stage 1 reference)
   - Labels: `wizard`, `stage-1`, `form-submission`, `awaiting-stage-2`

2. **Stage 2**: User clicks link, submits Stage 2 form (new issue)
   - Workflow closes Stage 1 issue
   - Posts comment with link to Stage 3 form (pre-filled with Stage 1 & 2 references)
   - Labels: `wizard`, `stage-2`, `form-submission`, `awaiting-stage-3`

3. **Stage 3**: User clicks link, submits Stage 3 form (new issue)
   - Workflow closes Stage 2 (and Stage 1 if still open)
   - Posts complete summary with links to all stages
   - Closes Stage 3 with `completed` label

## Usage

### Step 1: Start a New Project Request

1. Go to **Issues** -> **New Issue**
2. Select **"Stage 1: Project Information"**
3. Fill out the form:
   - Project Name (required)
   - Project Description (required)
   - Project Type (required)
   - Team Size (required)
   - Owner Email (required)
4. Click **Submit new issue**

After submission, the workflow will post a comment with a **Continue to Stage 2** link.

### Step 2: Provide Technical Configuration

1. Click the **Continue to Stage 2** link in the comment
2. The Stage 1 reference will be pre-filled
3. Fill out the form:
   - Primary Language (required)
   - Framework (required)
   - Target Environments (required)
   - Required Features (checkboxes)
4. Click **Submit new issue**

After submission, the workflow will close Stage 1 and post a **Continue to Stage 3** link.

### Step 3: Review and Confirm

1. Click the **Continue to Stage 3** link in the comment
2. Stage 1 and Stage 2 references will be pre-filled
3. Review the summary in the previous stage comments
4. Select confirmation:
   - "Yes, proceed with project creation"
   - "No, cancel this request"
5. Add any additional notes (optional)
6. Click **Submit new issue**

### Step 4: Done!

The workflow will:
- Close all previous stage issues
- Post a complete summary with links to all stages
- Close the Stage 3 issue

## Pre-filled URL Format

GitHub Issue Forms support pre-filling fields via URL query parameters:

```
https://github.com/{owner}/{repo}/issues/new?template={template}.yml&{field_id}={encoded_value}
```

Example:
```
https://github.com/owner/repo/issues/new?template=stage-2-technical-config.yml&stage1_issue=%23123
```

Note: `#` must be URL-encoded as `%23`

## Labels

The workflow uses labels to track state:

| Label | Meaning |
|-------|---------|
| `wizard` | Issue is part of the wizard flow |
| `stage-1` | Stage 1: Project Information |
| `stage-2` | Stage 2: Technical Configuration |
| `stage-3` | Stage 3: Review & Confirm |
| `awaiting-stage-2` | Stage 1 complete, awaiting Stage 2 |
| `awaiting-stage-3` | Stage 2 complete, awaiting Stage 3 |
| `completed` | Wizard finished |
| `form-submission` | Created from issue form |

## Example Complete Flow

### Stage 1 Issue Created
```markdown
### Project Name
my-awesome-app

### Project Description
A web application for managing tasks

### Project Type
Web Application

### Team Size
2-5 (Small)

### Project Owner Email
dev@example.com
```

**Workflow Comment:**
```markdown
## Stage 1 Complete!

**Project:** my-awesome-app
**Type:** Web Application
...

**[Continue to Stage 2](https://github.com/.../issues/new?template=stage-2-technical-config.yml&stage1_issue=%23123)**
```

### Stage 2 Issue Created
```markdown
### Stage 1 Issue Reference
#123

### Primary Language
TypeScript

### Framework
Next.js

### Target Environments
Dev + Staging + Production

### Required Features
- [X] Database (PostgreSQL/MySQL)
- [X] Authentication
- [X] CI/CD Pipeline
```

**Workflow Actions:**
- Closes Stage 1 (#123)
- Posts comment with Stage 3 link

### Stage 3 Issue Created
```markdown
### Stage 1 Issue Reference
#123

### Stage 2 Issue Reference
#124

### Confirmation
Yes, proceed with project creation

### Additional Notes
Please set up with PostgreSQL
```

**Workflow Actions:**
- Closes Stage 2 (#124)
- Posts final summary:

```markdown
## Project Request Confirmed ✅

**Status:** CONFIRMED - Ready for resource creation!

### Related Issues
| Stage | Issue | Description |
|-------|-------|-------------|
| 1 | #123 | Project Information |
| 2 | #124 | Technical Configuration |
| 3 | #125 | Review & Confirmation |

### Complete Project Summary
...
```

## Extending the Workflow

### Adding More Stages

To add a Stage 4:

1. Create `.github/ISSUE_TEMPLATE/stage-4-xxx.yml` with references to all previous stages
2. Update Stage 3 to generate Stage 4 URL instead of closing
3. Create new `process-stage-4` job that closes all previous stages

### Triggering Other Workflows

After Stage 3 confirms, you can trigger additional workflows:

```yaml
- name: Trigger Resource Creation
  if: steps.parse.outputs.confirmed == 'true'
  uses: actions/github-script@v7
  with:
    script: |
      await github.rest.actions.createWorkflowDispatch({
        owner: context.repo.owner,
        repo: context.repo.repo,
        workflow_id: 'create-resources.yml',
        ref: 'main',
        inputs: {
          project_data: '${{ steps.load-all.outputs.all_data }}'
        }
      });
```

## Troubleshooting

### Jobs Being Skipped

1. **Check labels exist**: Run `scripts/create-labels.sh` to create required labels
2. **Check issue has labels**: Verify the issue form applies the correct labels
3. **Check template name**: Ensure the template file names match exactly

### Stage Reference Not Found

Ensure the pre-filled URL correctly encodes the `#` symbol as `%23`:
- Correct: `stage1_issue=%23123`
- Incorrect: `stage1_issue=#123`

### Previous Stage Not Closing

Check that:
- The stage reference field is filled correctly (e.g., `#123`)
- The workflow has `issues: write` permission
- The referenced issue exists and is accessible

## Files

| File | Purpose |
|------|---------|
| `.github/workflows/wizard-flow.yml` | Main workflow |
| `.github/ISSUE_TEMPLATE/stage-1-project-info.yml` | Stage 1 form |
| `.github/ISSUE_TEMPLATE/stage-2-technical-config.yml` | Stage 2 form |
| `.github/ISSUE_TEMPLATE/stage-3-confirm.yml` | Stage 3 form |
| `scripts/create-labels.sh` | Creates required labels |
| `docs/wizard-flow.md` | This documentation |
