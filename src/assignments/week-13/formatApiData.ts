export function formatFieldLabel(field: string): string {
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatApiValue(value: unknown, depth = 0): string {
  if (value === null || value === undefined || value === '') {
    return 'Not provided';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.length === 0
      ? 'None'
      : value.map((item) => formatApiValue(item, depth)).join(', ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return 'None';
    }
    const indentation = '  '.repeat(depth);
    return entries
      .map(
        ([key, nestedValue]) =>
          `${indentation}${formatFieldLabel(key)}: ${formatApiValue(nestedValue, depth + 1)}`,
      )
      .join('\n');
  }
  return String(value);
}
