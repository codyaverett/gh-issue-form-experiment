# Three-Stage Wizard Flow

A GitHub Actions workflow that implements a Concord-like multi-stage form wizard using GitHub Issues.

## Overview

This workflow bypasses GitHub Actions' 10-input limit by:
1. Using GitHub Issue Forms for the initial input (Stage 1)
2. Using issue comments for subsequent stages (Stage 2 & 3)
3. Keeping everything in a single issue thread for easy tracking

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      SINGLE ISSUE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User creates issue with Stage 1 form                    │
│     └── Labels: [wizard, stage-1, form-submission]          │
│                                                             │
│  2. Workflow posts Stage 2 template comment                 │
│     └── Labels updated: [wizard, awaiting-stage-2]          │
│                                                             │
│  3. User replies with Stage 2 answers                       │
│                                                             │
│  4. Workflow posts Stage 3 template comment                 │
│     └── Labels updated: [wizard, awaiting-stage-3]          │
│                                                             │
│  5. User replies with confirmation                          │
│                                                             │
│  6. Workflow posts final summary & closes issue             │
│     └── Labels updated: [wizard, completed]                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Step 1: Create a New Project Request

1. Go to **Issues** → **New Issue**
2. Select **"Stage 1: Project Information"**
3. Fill out the form:
   - Project Name (required)
   - Project Description (required)
   - Project Type (required)
   - Team Size (required)
   - Owner Email (required)
4. Click **Submit new issue**

### Step 2: Provide Technical Configuration

After submitting, the workflow will comment with a Stage 2 template.

**Copy and fill in this template as a reply:**

```
**Language:** TypeScript
**Framework:** React
**Environment:** Dev + Staging + Production

**Features:**
- Database (PostgreSQL/MySQL)
- Authentication
- CI/CD Pipeline
```

**Available Options:**

| Field | Options |
|-------|---------|
| Language | TypeScript, JavaScript, Python, Go, Rust, Java |
| Framework | React, Vue, Next.js, Express, FastAPI, Django, None |
| Environment | Development Only, Dev + Staging, Dev + Staging + Production |

**Features (pick what you need):**
- Database (PostgreSQL/MySQL)
- Redis Cache
- Message Queue
- File Storage (S3)
- Authentication
- CI/CD Pipeline

### Step 3: Review and Confirm

After Stage 2, the workflow will summarize your choices and ask for confirmation.

**Reply with:**

```
**Confirmation:** Yes, proceed
**Additional Notes:** Any special instructions
```

**Confirmation Options:**
- `Yes, proceed` - Confirms the project setup
- `No, cancel` - Cancels the request

### Step 4: Done!

The workflow will post a final summary with all collected data and close the issue.

## Labels

The workflow uses labels to track state:

| Label | Meaning |
|-------|---------|
| `wizard` | Issue is part of the wizard flow |
| `stage-1` | Initial form submitted |
| `awaiting-stage-2` | Waiting for Stage 2 comment |
| `awaiting-stage-3` | Waiting for Stage 3 comment |
| `completed` | Wizard finished |
| `form-submission` | Created from issue form |

## Example Complete Flow

### Issue Created (Stage 1)
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

### User Reply (Stage 2)
```markdown
**Language:** TypeScript
**Framework:** Next.js
**Environment:** Dev + Staging + Production

**Features:**
- Database (PostgreSQL/MySQL)
- Authentication
- CI/CD Pipeline
```

### User Reply (Stage 3)
```markdown
**Confirmation:** Yes, proceed
**Additional Notes:** Please set up with PostgreSQL
```

### Final Summary (Posted by Workflow)
```markdown
## 🎉 Wizard Complete ✅

**Status:** CONFIRMED - Ready for resource creation!

| Stage | Field | Value |
|-------|-------|-------|
| 1 | Project Name | my-awesome-app |
| 1 | Project Type | Web Application |
| 1 | Team Size | 2-5 (Small) |
| 2 | Language | TypeScript |
| 2 | Framework | Next.js |
| 2 | Environment | Dev + Staging + Production |
| 3 | Confirmation | Yes, proceed |

### Features
✓ Database (PostgreSQL/MySQL)
✓ Authentication
✓ CI/CD Pipeline
```

## Extending the Workflow

### Adding More Stages

To add a Stage 4:

1. Create a new job `process-stage-4` triggered by `awaiting-stage-4` label
2. Update Stage 3 to add `awaiting-stage-4` label instead of closing
3. Stage 4 job posts summary and closes

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
2. **Check issue has labels**: View the issue and verify labels are applied
3. **Check comment author**: Bot comments are ignored to prevent loops

### Comment Not Being Parsed

Ensure your reply follows the exact format:
```
**Field:** Value
```

The `**` around the field name and the `:` after are required.

## Files

| File | Purpose |
|------|---------|
| `.github/workflows/wizard-flow.yml` | Main workflow |
| `.github/ISSUE_TEMPLATE/stage-1-project-info.yml` | Stage 1 form |
| `scripts/create-labels.sh` | Creates required labels |
| `docs/wizard-flow.md` | This documentation |
