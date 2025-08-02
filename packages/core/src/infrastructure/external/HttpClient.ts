// packages/core/src/infrastructure/external/HttpClient.ts

import { ok, hdr } from "@clinickeys-agents/core/utils";

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
  token?: string;
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
    let headers = options.headers || {};
    if (options.token) {
      headers = { ...hdr(options.token), ...headers };
    }

    const fetchOptions: RequestInit = {
      method: options.method || "GET",
      headers,
      body: options.body
        ? typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body)
        : undefined,
      signal: options.signal,
    };

    const res = await fetch(url, fetchOptions);
    const data = await ok(res, url) as T;
    return {
      status: res.status,
      data,
      headers: res.headers,
    };
  }
}
