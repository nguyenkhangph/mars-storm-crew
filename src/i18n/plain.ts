/** Text without [[key|word]] glossary markup. */
export const plain = (s: string) => s.replace(/\[\[\w+\|([^\]]+)\]\]/g, '$1');
