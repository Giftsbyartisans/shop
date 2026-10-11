// The dropdown already displays the policy title; omit matching opening headings.
export function policyBody(title: string, text: string): string {
  const normalize = (value: string) => value.trim().replace(/^#{1,6}\s+/, '')
    .replace(/^\*\*(.*?)\*\*$/, '$1').replace(/^__(.*?)__$/, '$1')
    .replace(/:$/, '').trim().toLocaleLowerCase();
  const lines = text.split(/\r?\n/);
  while (lines.length && !lines[0].trim()) lines.shift();
  const heading = normalize(title);
  while (heading && lines.length && normalize(lines[0]) === heading) {
    lines.shift();
    while (lines.length && !lines[0].trim()) lines.shift();
  }
  return lines.join('\n');
}
