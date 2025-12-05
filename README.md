# GitHub Issue Forms Workflow Framework

A proof-of-concept demonstrating how to bypass GitHub Actions' 10-input limit using GitHub Issue Forms, with Concord-like workflow pause/resume capabilities.

## Overview

GitHub Actions `workflow_dispatch` has a hard limit of 10 inputs. This framework bypasses that limitation by:

1. Using GitHub Issue Forms (which have no field limit) as the input mechanism
2. Parsing the issue markdown body into structured JSON
3. Triggering workflows via issue events
4. Supporting mid-workflow pauses that create new form issues for additional input

Inspired by [Walmart Labs Concord](https://concord.walmartlabs.com/docs/getting-started/forms.html).

## Architecture

```
[User] --> [Issue Form (16+ fields)] --> [Issue Created]
                                              |
                                              v
                              +---------------------------+
                              | issue-form-handler.yml    |
                              | 1. Parse markdown to JSON |
                              | 2. Validate form data     |
                              | 3. Trigger orchestrator   |
                              | 4. Close issue            |
                              +---------------------------+
                                              |
                                              v
                              +---------------------------+
                              | deployment-orchestrator   |
                              | - Execute workflow steps  |
                              | - PAUSE: Create approval  |
                              |   issue for production    |
                              | - RESUME: On form submit  |
                              +---------------------------+
```

## Features

- **16+ Form Fields**: Demonstrates input, dropdown, textarea, checkboxes, and multi-select
- **Automatic Parsing**: Converts issue form markdown to JSON
- **Workflow Chaining**: Triggers downstream workflows with parsed data
- **Pause/Resume**: Production deployments pause for approval via new issue form
- **State Persistence**: Workflow state stored in GitHub Issues
- **Validation**: Form data validation with error reporting

## File Structure

```
.github/
├── ISSUE_TEMPLATE/
│   ├── 01-deployment-request.yml   # Main form (16 fields)
│   └── 02-approval-form.yml        # Mid-workflow approval
├── workflows/
│   ├── issue-form-handler.yml      # Parse & route issues
│   ├── deployment-orchestrator.yml # Multi-step workflow
│   └── state-manager.yml           # State persistence
└── scripts/
    └── parse-issue-form.js         # Markdown parser
```

## Usage

### 1. Create a Deployment Request

1. Go to **Issues** > **New Issue**
2. Select **Deployment Request** template
3. Fill out the form (16 fields available)
4. Submit the issue

### 2. Automatic Processing

The `issue-form-handler` workflow will:
- Parse the form into JSON
- Validate required fields
- Close the issue with a tracking comment
- Trigger the `deployment-orchestrator`

### 3. Production Approval Flow

If deploying to production:
1. Workflow pauses and creates an **Approval Request** issue
2. Approver fills out the approval form
3. Workflow resumes with the approval decision
4. Deployment executes if approved

## Form Fields

The deployment request form includes:

| Field | Type | Required |
|-------|------|----------|
| Application Name | input | Yes |
| Target Environment | dropdown | Yes |
| Version/Tag | input | Yes |
| Deployment Region(s) | dropdown (multi) | No |
| Number of Replicas | input | No |
| CPU Limit | input | No |
| Memory Limit | input | No |
| Environment Variables | textarea | No |
| Health Check Type | dropdown | No |
| Health Check Path | input | No |
| Features | checkboxes | No |
| Rollout Strategy | dropdown | No |
| Canary Percentage | input | No |
| Custom Annotations | textarea | No |
| Additional Notes | textarea | No |
| Workflow Context | input (internal) | No |

## How Parsing Works

Issue forms generate predictable markdown:

```markdown
### Application Name

my-service

### Target Environment

production

### Features

- [X] Enable autoscaling (HPA)
- [X] Enable structured logging
- [ ] Enable Prometheus metrics
```

The parser converts this to:

```json
{
  "applicationName": "my-service",
  "targetEnvironment": "production",
  "features": [
    { "label": "Enable autoscaling (HPA)", "checked": true },
    { "label": "Enable structured logging", "checked": true },
    { "label": "Enable Prometheus metrics", "checked": false }
  ]
}
```

## State Management

Workflow state is persisted in GitHub Issues:

1. **State Issues**: Created with `[STATE] wf-{id}` title and `workflow-state` label
2. **State Format**: JSON stored in a code block in the issue body
3. **Cleanup**: State issues are closed when workflow completes

## Concord-like Features

This POC implements patterns from Walmart Labs Concord:

| Concord Feature | Implementation |
|-----------------|----------------|
| Form definitions | Issue form YAML templates |
| Form pause | Create new issue, exit workflow |
| Form resume | Issue handler triggers with context |
| Form data access | JSON parsed from issue body |
| Workflow state | Stored in GitHub Issues |

## Limitations

- **No true blocking**: Workflows exit and restart (vs Concord's in-process pause)
- **65KB payload limit**: workflow_dispatch inputs are limited; use artifacts for large payloads
- **Rate limits**: Heavy use may hit GitHub API limits
- **No real-time UI**: Users must manually check for new approval issues

## Development

### Test the Parser

```bash
# Via npm script
npm run test:parse

# Direct usage
echo "### Field Name

value" | node .github/scripts/parse-issue-form.js
```

### Manual Workflow Trigger

```bash
gh workflow run deployment-orchestrator.yml \
  -f form_data='{"applicationName":"test","targetEnvironment":"dev","versionTag":"v1.0.0"}' \
  -f issue_number=1 \
  -f workflow_id="wf-manual-test"
```

## License

MIT
