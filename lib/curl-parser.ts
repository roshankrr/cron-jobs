export interface ParsedCurl {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export function parseCurl(curlCommand: string): ParsedCurl {
  // Normalize the curl command - remove line continuations and extra whitespace
  const normalized = curlCommand
    .replace(/\\\s*\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const result: ParsedCurl = {
    url: '',
    method: 'GET',
    headers: {},
  };

  // Extract URL - look for http(s):// pattern
  const urlMatch = normalized.match(/['"]?(https?:\/\/[^\s'"]+)['"]?/);
  if (urlMatch) {
    result.url = urlMatch[1];
  }

  // Extract method (-X or --request)
  const methodMatch = normalized.match(/-X\s+['"]?(\w+)['"]?|--request\s+['"]?(\w+)['"]?/i);
  if (methodMatch) {
    result.method = (methodMatch[1] || methodMatch[2]).toUpperCase();
  }

  // Extract headers (-H or --header)
  const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/gi;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(normalized)) !== null) {
    const headerStr = headerMatch[1];
    const colonIndex = headerStr.indexOf(':');
    if (colonIndex !== -1) {
      const key = headerStr.substring(0, colonIndex).trim();
      const value = headerStr.substring(colonIndex + 1).trim();
      result.headers[key] = value;
    }
  }

  // Extract body (-d or --data or --data-raw)
  const dataMatch = normalized.match(/(?:-d|--data|--data-raw)\s+['"](.+?)['"]\s*(?:-|$)|(?:-d|--data|--data-raw)\s+([^\s]+)/);
  if (dataMatch) {
    result.body = dataMatch[1] || dataMatch[2];
    // If there's a body and method is still GET, change to POST
    if (result.method === 'GET') {
      result.method = 'POST';
    }
  }

  return result;
}
