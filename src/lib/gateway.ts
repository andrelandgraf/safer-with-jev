export async function proxyGateway(options: {
  baseUrl: string;
  token: string;
  path: string;
  method: string;
  body?: string;
}): Promise<Response> {
  const url = `${options.baseUrl}${options.path}`;
  const upstream = await fetch(url, {
    method: options.method,
    headers: {
      Authorization: `Bearer ${options.token}`,
      "Content-Type": "application/json",
    },
    body: options.body,
  });

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
