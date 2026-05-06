const TEMPLATE_VARIABLE_PATTERN = "\\{\\{\\s*([a-zA-Z0-9_.-]+)\\s*\\}\\}"

function getTemplateVariableRegex(): RegExp {
  return new RegExp(TEMPLATE_VARIABLE_PATTERN, "g")
}

export function extractTemplateVariables(text: string): string[] {
  const matches = text.matchAll(getTemplateVariableRegex())
  return [...new Set(Array.from(matches, (m) => m[1]))]
}

export function renderTemplateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(getTemplateVariableRegex(), (_, key: string) => {
    return variables[key] ?? `{{${key}}}`
  })
}
