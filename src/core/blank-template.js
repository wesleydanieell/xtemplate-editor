/** New Studio documents begin with no content and no defined variables.
 * Metadata is separate from the actual XNotes template geometry. */
export function createBlankTemplate({
  name = 'Untitled template',
  id = 'xtemplate.custom.untitled',
  description = '',
  kind = 'page',
  author = '',
  license = '',
  version = '',
  tags = [],
} = {}) {
  const template = {
    xtemplate: 1,
    id,
    name,
    kind: kind === 'cover' ? 'cover' : 'page',
    params: {},
    items: [],
  };
  if(description)template.description=description;
  if(author)template.author=author;
  if(license)template.license=license;
  if(version)template.version=version;
  if(tags.length)template.tags=[...tags];
  return template;
}
