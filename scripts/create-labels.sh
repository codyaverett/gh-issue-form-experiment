#!/bin/bash
# Create required labels for the issue form workflow system

REPO="codyaverett/gh-issue-form-experiment"

echo "Creating labels for $REPO..."

# Wizard flow labels
gh label create "wizard" --description "Multi-stage wizard form" --color "7C3AED" --repo "$REPO" 2>/dev/null || echo "Label 'wizard' already exists"
gh label create "stage-1" --description "Wizard Stage 1: Project Info" --color "8B5CF6" --repo "$REPO" 2>/dev/null || echo "Label 'stage-1' already exists"
gh label create "stage-2" --description "Wizard Stage 2: Technical Config" --color "A78BFA" --repo "$REPO" 2>/dev/null || echo "Label 'stage-2' already exists"
gh label create "stage-3" --description "Wizard Stage 3: Review & Confirm" --color "C4B5FD" --repo "$REPO" 2>/dev/null || echo "Label 'stage-3' already exists"

# General form labels
gh label create "form-submission" --description "Issue created from form template" --color "0EA5E9" --repo "$REPO" 2>/dev/null || echo "Label 'form-submission' already exists"
gh label create "deployment" --description "Deployment request" --color "10B981" --repo "$REPO" 2>/dev/null || echo "Label 'deployment' already exists"
gh label create "approval" --description "Requires approval" --color "F59E0B" --repo "$REPO" 2>/dev/null || echo "Label 'approval' already exists"
gh label create "awaiting-input" --description "Waiting for user input" --color "EAB308" --repo "$REPO" 2>/dev/null || echo "Label 'awaiting-input' already exists"

# State management labels
gh label create "workflow-state" --description "Workflow state storage issue" --color "6B7280" --repo "$REPO" 2>/dev/null || echo "Label 'workflow-state' already exists"
gh label create "processed" --description "Form has been processed" --color "22C55E" --repo "$REPO" 2>/dev/null || echo "Label 'processed' already exists"
gh label create "completed" --description "Workflow completed" --color "16A34A" --repo "$REPO" 2>/dev/null || echo "Label 'completed' already exists"

echo ""
echo "Done! Current labels:"
gh label list --repo "$REPO"
