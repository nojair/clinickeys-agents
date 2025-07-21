// packages/core/src/infrastructure/external/HttpClient.ts

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
}

export interface HttpResponse<T = any> {
  status: number;
  data: T;
  headers: Headers;
}

export class HttpClient {
  async request<T = any>(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const fetchOptions: RequestInit = {
      method: options.method || "GET",
      headers: options.headers,
      body: options.body
        ? typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
      signal: options.signal,
    };
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get("content-type");
    let data: any;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    return {
      status: response.status,
      data,
      headers: response.headers,
    };
  }
}
