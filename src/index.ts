import type {AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig} from 'axios';
import {AxiosError} from 'axios';
import {getReasonPhrase} from 'http-status-codes';
import {invoke} from "@tauri-apps/api/core";

interface ClientConfig {
    method?: string;
    url: string;
    headers: [string, string][];
    data?: number[];
    maxRedirections?: number;
    connectTimeout?: number;
    proxy?: Proxy;
}

interface Proxy {
    all?: string | ProxyConfig;
    http?: string | ProxyConfig;
    https?: string | ProxyConfig;
}

interface ProxyConfig {
    url: string;
    basicAuth?: {
        username: string;
        password: string;
    };
    noProxy?: string;
}

interface FetchSendResponse {
    status: number;
    statusText: string;
    headers: [string, string][];
    rid: number;
    url: string;
}

function getCorrectBodyType(data: unknown): number[] | null {
    if (typeof data === 'string') return Array.from(new TextEncoder().encode(data));
    if (typeof data === 'object') return Array.from(new TextEncoder().encode(JSON.stringify(data)));
    return null;
}

function serializeParams(params: Record<string, any>): string {
    return Object.entries(params)
        .filter(([_, val]) => val !== undefined) // Exclude undefined values
        .map(([key, val]) => {
            if (val === null) {
                return encodeURIComponent(key);
            }
            return `${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
        })
        .join('&');
}

function getCorrectUrl(baseURL: string | undefined, url: string | undefined, params?: Record<string, any>): string {
    let completeUrl = baseURL ? `${baseURL}${url}` : `${url}`;
    if (params) {
        const serialized = serializeParams(params);
        completeUrl += `?${serialized}`;
    }
    return completeUrl;
}

export default function axiosAdapter<T>() {
    return async (config: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        const headers = Object.entries(config.headers || {}).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]);
        const requestData: ClientConfig = {
            method: config.method?.toUpperCase(),
            url: getCorrectUrl(config.baseURL, config.url, config.params),
            headers: headers as [string, string][],
            data: getCorrectBodyType(config.data) ?? undefined
        };

        const rid = await invoke<number>("plugin:http|fetch", {
            clientConfig: requestData,
        });

        const {message: response} = await invoke<{ message: FetchSendResponse }>("plugin:http|fetch_send", {rid});

        const {message: body} = await invoke<{ message: number[] }>("plugin:http|fetch_read_body", {rid: response.rid});

        const isOk = response.status >= 200 && response.status < 300;

        let stringData = new TextDecoder().decode(new Uint8Array(body));

        let data;
        try {
            data = (config.responseType === 'json' || config.responseType === undefined) ? JSON.parse(stringData) : stringData;
        } catch (e) {
            data = stringData; // Fallback to raw string data if parsing fails
        }

        const axiosResponse: AxiosResponse<T> = {
            data,
            status: response.status,
            statusText: getReasonPhrase(response.status),
            headers: Object.fromEntries(response.headers),
            config: config as InternalAxiosRequestConfig,
        };

        if (isOk) {
            return axiosResponse;
        } else {
            const code = [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4];
            const message = 'Request failed with status code ' + axiosResponse.status;
            throw new AxiosError(message, code, config as InternalAxiosRequestConfig, requestData, axiosResponse);
        }
    }
}
