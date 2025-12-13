/**
 * Dynamic form builder that renders forms based on JSON schemas
 * Supports GitHub API data sources and conditional field logic
 */
class FormBuilder {
  constructor(api, schema) {
    this.api = api;
    this.schema = schema;
    this.urlParams = new URLSearchParams(window.location.search);
    this.fieldValues = {};
    this.fieldElements = {};
    this.loadingFields = new Set();

    // Pre-populate field values from URL params
    this.schema.fields.forEach(field => {
      const urlValue = this.urlParams.get(field.id);
      if (urlValue) {
        this.fieldValues[field.id] = urlValue;
      }
    });
  }

  /**
   * Load options for a field based on its source configuration
   */
  async loadFieldOptions(fieldDef) {
    switch (fieldDef.source) {
      case 'github_api':
        return this.loadGitHubData(fieldDef);
      case 'url_param':
        return this.urlParams.get(fieldDef.param) || fieldDef.default || '';
      case 'conditional':
        return this.loadConditionalOptions(fieldDef);
      case 'static':
        return this.normalizeOptions(fieldDef.options || []);
      default:
        return this.normalizeOptions(fieldDef.options || []);
    }
  }

  /**
   * Normalize options to consistent {value, label} format
   */
  normalizeOptions(options) {
    return options.map(opt => {
      if (typeof opt === 'string') {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }

  /**
   * Fetch data from GitHub API based on endpoint configuration
   */
  async loadGitHubData(fieldDef) {
    const methodMap = {
      'branches': 'getBranches',
      'releases': 'getReleases',
      'tags': 'getTags',
      'labels': 'getLabels',
      'contributors': 'getContributors',
      'collaborators': 'getCollaborators'
    };

    const method = methodMap[fieldDef.endpoint];
    if (!method) {
      console.error(`Unknown GitHub endpoint: ${fieldDef.endpoint}`);
      return [];
    }

    try {
      const options = await this.api[method](fieldDef.filter);
      return options;
    } catch (error) {
      console.error(`Error fetching ${fieldDef.endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get options for a conditional field based on dependencies
   */
  loadConditionalOptions(fieldDef) {
    const dependsValue = this.fieldValues[fieldDef.depends_on] ||
                         this.urlParams.get(fieldDef.depends_on);

    const conditions = fieldDef.conditions || {};
    const options = conditions[dependsValue] ||
                    conditions['default'] ||
                    [];

    return this.normalizeOptions(options);
  }

  /**
   * Create the DOM element for a field
   */
  renderField(fieldDef, options) {
    const container = document.createElement('div');
    container.className = 'form-group mb-4';
    container.id = `field-container-${fieldDef.id}`;

    // Hidden fields
    if (fieldDef.type === 'hidden') {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.id = fieldDef.id;
      input.name = fieldDef.id;
      input.value = typeof options === 'string' ? options : (this.fieldValues[fieldDef.id] || '');
      container.appendChild(input);
      this.fieldElements[fieldDef.id] = input;
      return container;
    }

    // Label
    const label = document.createElement('label');
    label.className = 'form-label d-block mb-1';
    label.htmlFor = fieldDef.id;
    label.textContent = fieldDef.label;
    if (fieldDef.required) {
      const req = document.createElement('span');
      req.className = 'text-danger ml-1';
      req.textContent = '*';
      label.appendChild(req);
    }
    container.appendChild(label);

    // Description
    if (fieldDef.description) {
      const desc = document.createElement('p');
      desc.className = 'form-text color-fg-muted f6 mb-2';
      desc.textContent = fieldDef.description;
      container.appendChild(desc);
    }

    // Field element based on type
    switch (fieldDef.type) {
      case 'dropdown':
        this.renderDropdown(container, fieldDef, options);
        break;
      case 'checkboxes':
        this.renderCheckboxes(container, fieldDef, options);
        break;
      case 'input':
        this.renderInput(container, fieldDef);
        break;
      case 'textarea':
        this.renderTextarea(container, fieldDef);
        break;
      default:
        console.warn(`Unknown field type: ${fieldDef.type}`);
    }

    return container;
  }

  /**
   * Render a dropdown/select field
   */
  renderDropdown(container, fieldDef, options) {
    const select = document.createElement('select');
    select.id = fieldDef.id;
    select.name = fieldDef.id;
    select.className = 'form-select form-control';
    select.required = fieldDef.required;

    // Placeholder option
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = fieldDef.placeholder || '-- Select --';
    select.appendChild(placeholder);

    // Populate options
    if (Array.isArray(options)) {
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.isDefault) {
          option.dataset.default = 'true';
        }
        select.appendChild(option);
      });
    }

    // Set pre-selected value from URL params
    const preselected = this.fieldValues[fieldDef.id];
    if (preselected) {
      select.value = preselected;
    }

    // Handle changes for conditional fields
    select.addEventListener('change', () => {
      this.fieldValues[fieldDef.id] = select.value;
      this.updateDependentFields(fieldDef.id);
    });

    container.appendChild(select);
    this.fieldElements[fieldDef.id] = select;
  }

  /**
   * Render checkbox group
   */
  renderCheckboxes(container, fieldDef, options) {
    const checkboxGroup = document.createElement('div');
    checkboxGroup.className = 'checkbox-group';
    checkboxGroup.id = fieldDef.id;

    const preselected = (this.fieldValues[fieldDef.id] || '').split(',').map(s => s.trim());

    if (Array.isArray(options)) {
      options.forEach(opt => {
        const wrapper = document.createElement('div');
        wrapper.className = 'form-checkbox mb-1';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'form-checkbox-input';
        checkbox.id = `${fieldDef.id}_${opt.value.replace(/\s+/g, '_')}`;
        checkbox.name = fieldDef.id;
        checkbox.value = opt.value;

        if (preselected.includes(opt.value)) {
          checkbox.checked = true;
        }

        const cbLabel = document.createElement('label');
        cbLabel.className = 'form-checkbox-label';
        cbLabel.htmlFor = checkbox.id;

        // If label has a color (for GitHub labels), show a color swatch
        if (opt.color) {
          const swatch = document.createElement('span');
          swatch.className = 'label-swatch';
          swatch.style.backgroundColor = `#${opt.color}`;
          swatch.style.display = 'inline-block';
          swatch.style.width = '12px';
          swatch.style.height = '12px';
          swatch.style.borderRadius = '2px';
          swatch.style.marginRight = '6px';
          cbLabel.appendChild(swatch);
        }

        cbLabel.appendChild(document.createTextNode(opt.label));

        // Description as tooltip
        if (opt.description) {
          cbLabel.title = opt.description;
        }

        wrapper.appendChild(checkbox);
        wrapper.appendChild(cbLabel);
        checkboxGroup.appendChild(wrapper);
      });
    }

    container.appendChild(checkboxGroup);
    this.fieldElements[fieldDef.id] = checkboxGroup;
  }

  /**
   * Render text input field
   */
  renderInput(container, fieldDef) {
    const input = document.createElement('input');
    input.type = fieldDef.inputType || 'text';
    input.id = fieldDef.id;
    input.name = fieldDef.id;
    input.className = 'form-control';
    input.required = fieldDef.required;
    input.placeholder = fieldDef.placeholder || '';

    const preselected = this.fieldValues[fieldDef.id];
    if (preselected) {
      input.value = preselected;
    }

    container.appendChild(input);
    this.fieldElements[fieldDef.id] = input;
  }

  /**
   * Render textarea field
   */
  renderTextarea(container, fieldDef) {
    const textarea = document.createElement('textarea');
    textarea.id = fieldDef.id;
    textarea.name = fieldDef.id;
    textarea.className = 'form-control';
    textarea.required = fieldDef.required;
    textarea.placeholder = fieldDef.placeholder || '';
    textarea.rows = fieldDef.rows || 4;

    const preselected = this.fieldValues[fieldDef.id];
    if (preselected) {
      textarea.value = preselected;
    }

    container.appendChild(textarea);
    this.fieldElements[fieldDef.id] = textarea;
  }

  /**
   * Update fields that depend on a changed field
   */
  async updateDependentFields(changedFieldId) {
    const dependentFields = this.schema.fields.filter(
      f => f.source === 'conditional' && f.depends_on === changedFieldId
    );

    for (const field of dependentFields) {
      const options = this.loadConditionalOptions(field);
      await this.updateFieldOptions(field.id, options);
    }
  }

  /**
   * Update options for a dropdown or checkbox field
   */
  async updateFieldOptions(fieldId, options) {
    const fieldDef = this.schema.fields.find(f => f.id === fieldId);
    const element = this.fieldElements[fieldId];

    if (!fieldDef || !element) return;

    if (fieldDef.type === 'dropdown') {
      // Clear and repopulate dropdown
      element.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = fieldDef.placeholder || '-- Select --';
      element.appendChild(placeholder);

      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        element.appendChild(option);
      });

      // Clear selection since options changed
      element.value = '';
      this.fieldValues[fieldId] = '';
    } else if (fieldDef.type === 'checkboxes') {
      // Re-render checkbox group
      const container = document.getElementById(`field-container-${fieldId}`);
      const existingGroup = container.querySelector('.checkbox-group');
      if (existingGroup) {
        existingGroup.remove();
      }
      this.renderCheckboxes(container, fieldDef, options);
    }
  }

  /**
   * Get current form values
   */
  getFormValues() {
    const values = {};

    this.schema.fields.forEach(field => {
      const element = this.fieldElements[field.id];
      if (!element) return;

      if (field.type === 'checkboxes') {
        const checkboxes = element.querySelectorAll('input[type="checkbox"]:checked');
        values[field.id] = Array.from(checkboxes).map(cb => cb.value);
      } else {
        values[field.id] = element.value;
      }
    });

    return values;
  }

  /**
   * Generate issue body markdown from form values
   */
  generateIssueBody() {
    const values = this.getFormValues();
    let body = '';

    for (const field of this.schema.fields) {
      if (field.type === 'hidden') continue;

      let value = values[field.id];
      if (Array.isArray(value)) {
        value = value.join(', ');
      }

      body += `### ${field.label}\n\n${value || '_No response_'}\n\n`;
    }

    return body;
  }

  /**
   * Generate a pre-filled GitHub issue URL
   */
  generatePrefilledUrl() {
    const values = this.getFormValues();
    const params = new URLSearchParams();
    const config = window.FORM_CONFIG;

    // Set template
    if (this.schema.output?.template) {
      params.set('template', this.schema.output.template);
    }

    // Add form values as URL params
    for (const field of this.schema.fields) {
      let value = values[field.id];

      if (Array.isArray(value)) {
        value = value.join(', ');
      }

      if (value) {
        // GitHub uses specific encoding for # in issue references
        if (field.id.includes('issue') && value.startsWith('#')) {
          value = value; // Keep the # for issue references
        }
        params.set(field.id, value);
      }
    }

    // Add labels if specified in schema
    if (this.schema.output?.labels) {
      params.set('labels', this.schema.output.labels.join(','));
    }

    return `https://github.com/${config.owner}/${config.repo}/issues/new?${params.toString()}`;
  }

  /**
   * Generate URL to another dynamic form (for multi-stage wizards)
   */
  generateNextStageUrl(nextFormName, additionalParams = {}) {
    const values = this.getFormValues();
    const params = new URLSearchParams();
    const config = window.FORM_CONFIG;

    params.set('form', nextFormName);

    // Pass current stage's issue number if we have it
    // (would be set after this issue is created)

    // Pass along key values for conditional logic in next stage
    for (const [key, value] of Object.entries(additionalParams)) {
      params.set(key, value);
    }

    // Pass values that might be needed for conditionals
    for (const field of this.schema.fields) {
      if (field.passToNextStage) {
        let value = values[field.id];
        if (Array.isArray(value)) value = value.join(',');
        if (value) params.set(field.id, value);
      }
    }

    const pagesBase = `https://${config.owner}.github.io/${config.repo}`;
    return `${pagesBase}/form.html?${params.toString()}`;
  }

  /**
   * Validate form before submission
   */
  validate() {
    const values = this.getFormValues();
    const errors = [];

    for (const field of this.schema.fields) {
      if (field.required) {
        const value = values[field.id];
        const isEmpty = Array.isArray(value) ? value.length === 0 : !value;

        if (isEmpty) {
          errors.push({ field: field.id, message: `${field.label} is required` });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Export for use
window.FormBuilder = FormBuilder;
