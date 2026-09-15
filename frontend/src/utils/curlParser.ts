export interface ParsedCurlResult {
  method: string;
  baseUrl: string;
  port: string;
  usePort: boolean;
  apiPath: string;
  headers: { id: string; key: string; value: string; enabled: boolean }[];
  params: { id: string; key: string; value: string; enabled: boolean }[];
  body: string;
  bodyType: string;
  authType: string;
  authToken: string;
  authConfig?: any;
}

export function parseCurl(curlText: string): ParsedCurlResult | null {
  if (!curlText || !curlText.trim()) return null;

  // Normalize multi-line cURL (\ at line endings)
  const cleaned = curlText
    .replace(/\\\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned.toLowerCase().startsWith('curl')) {
    return null;
  }

  // Tokenize considering single and double quotes
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }

  let method = 'GET';
  let targetUrl = '';
  const headers: { id: string; key: string; value: string; enabled: boolean }[] = [];
  let body = '';
  let authType = 'none';
  let authToken = '';
  let authConfig: any = {};

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];

    if ((token === '-X' || token === '--request') && i + 1 < tokens.length) {
      method = tokens[++i].toUpperCase();
    } else if ((token === '-H' || token === '--header') && i + 1 < tokens.length) {
      const headerStr = tokens[++i];
      const colonIdx = headerStr.indexOf(':');
      if (colonIdx > 0) {
        const key = headerStr.slice(0, colonIdx).trim();
        const val = headerStr.slice(colonIdx + 1).trim();
        if (key.toLowerCase() === 'authorization') {
          if (val.toLowerCase().startsWith('bearer ')) {
            authType = 'bearer';
            authToken = val.slice(7).trim();
          } else if (val.toLowerCase().startsWith('basic ')) {
            authType = 'basic';
            try {
              const decoded = atob(val.slice(6).trim());
              const [u, p] = decoded.split(':');
              authConfig = { username: u || '', password: p || '' };
            } catch {
              headers.push({ id: Date.now() + Math.random().toString(), key, value: val, enabled: true });
            }
          } else {
            headers.push({ id: Date.now() + Math.random().toString(), key, value: val, enabled: true });
          }
        } else {
          headers.push({ id: Date.now() + Math.random().toString(), key, value: val, enabled: true });
        }
      }
    } else if (
      (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary' || token === '--data-urlencode') &&
      i + 1 < tokens.length
    ) {
      body = tokens[++i];
      if (method === 'GET') method = 'POST';
    } else if ((token === '-u' || token === '--user') && i + 1 < tokens.length) {
      const userPass = tokens[++i];
      authType = 'basic';
      const [u, p] = userPass.split(':');
      authConfig = { username: u || '', password: p || '' };
    } else if (token.startsWith('http://') || token.startsWith('https://') || token.startsWith('localhost') || token.startsWith('{{')) {
      targetUrl = token;
    } else if (!targetUrl && !token.startsWith('-')) {
      targetUrl = token;
    }
  }

  // Parse URL components
  let baseUrl = targetUrl;
  let port = '8080';
  let usePort = false;
  let apiPath = '';
  const params: { id: string; key: string; value: string; enabled: boolean }[] = [];

  try {
    const urlObj = new URL(targetUrl.includes('://') ? targetUrl : `http://${targetUrl}`);
    baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
    if (urlObj.port) {
      port = urlObj.port;
      usePort = true;
    }
    apiPath = urlObj.pathname;
    if (urlObj.search) {
      apiPath += urlObj.search;
      urlObj.searchParams.forEach((v, k) => {
        params.push({ id: Date.now() + Math.random().toString(), key: k, value: v, enabled: true });
      });
    }
  } catch {
    // If not a standard URL, fallback
    baseUrl = targetUrl;
  }

  return {
    method,
    baseUrl,
    port,
    usePort,
    apiPath,
    headers: headers.length > 0 ? headers : [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
    params,
    body,
    bodyType: 'json',
    authType,
    authToken,
    authConfig
  };
}

export function generateCurlSnippet(method: string, fullUrl: string, headers: Record<string, string>, body: string): string {
  let cmd = `curl -X ${method.toUpperCase()} '${fullUrl}'`;

  Object.entries(headers).forEach(([k, v]) => {
    cmd += ` \\\n  -H '${k}: ${v}'`;
  });

  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
    const escapedBody = body.replace(/'/g, "'\\''");
    cmd += ` \\\n  --data-raw '${escapedBody}'`;
  }

  return cmd;
}

export function generateCodeSnippet(
  lang: 'curl' | 'fetch' | 'axios' | 'python' | 'go' | 'nodejs',
  method: string,
  fullUrl: string,
  headers: Record<string, string>,
  body: string
): string {
  const m = method.toUpperCase();

  switch (lang) {
    case 'curl':
      return generateCurlSnippet(method, fullUrl, headers, body);

    case 'fetch': {
      const options: any = { method: m, headers };
      if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) {
        try {
          options.body = JSON.parse(body);
        } catch {
          options.body = body;
        }
      }
      return `fetch('${fullUrl}', ${JSON.stringify(options, null, 2)})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
    }

    case 'axios': {
      return `import axios from 'axios';

const config = {
  method: '${m.toLowerCase()}',
  url: '${fullUrl}',
  headers: ${JSON.stringify(headers, null, 2)},
  ${body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m) ? `data: ${body}` : ''}
};

axios(config)
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error(error);
  });`;
    }

    case 'python': {
      return `import requests
import json

url = "${fullUrl}"
headers = ${JSON.stringify(headers, null, 2)}
${body ? `payload = ${body}` : 'payload = {}'}

response = requests.request("${m}", url, headers=headers, json=payload if payload else None)

print(response.status_code)
print(response.text)`;
    }

    case 'go': {
      return `package main

import (
\t"fmt"
\t"io"
\t"net/http"
\t"strings"
)

func main() {
\turl := "${fullUrl}"
\tmethod := "${m}"

\tvar payload io.Reader
\t${body ? `payload = strings.NewReader(\`${body}\`)` : `payload = nil`}

\tclient := &http.Client{}
\treq, err := http.NewRequest(method, url, payload)
\tif err != nil {
\t\tfmt.Println(err)
\t\treturn
\t}
\t${Object.entries(headers)
  .map(([k, v]) => `req.Header.Add("${k}", "${v}")`)
  .join('\n\t')}

\tres, err := client.Do(req)
\tif err != nil {
\t\tfmt.Println(err)
\t\treturn
\t}
\tdefer res.Body.Close()

\tbody, err := io.ReadAll(res.Body)
\tif err != nil {
\t\tfmt.Println(err)
\t\treturn
\t}
\tfmt.Println(string(body))
}`;
    }

    case 'nodejs': {
      return `const https = require('https');

const options = {
  method: '${m}',
  headers: ${JSON.stringify(headers, null, 2)}
};

const req = https.request('${fullUrl}', options, (res) => {
  let chunks = [];

  res.on('data', (chunk) => {
    chunks.push(chunk);
  });

  res.on('end', () => {
    const body = Buffer.concat(chunks);
    console.log(body.toString());
  });
});

req.on('error', (error) => {
  console.error(error);
});

${body ? `req.write(\`${body}\`);` : ''}
req.end();`;
    }

    default:
      return '';
  }
}
