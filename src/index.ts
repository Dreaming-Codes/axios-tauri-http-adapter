import type {InternalAxiosRequestConfig, AxiosResponse, AxiosRequestConfig} from 'axios';
import {AxiosError} from 'axios';
import {getReasonPhrase} from 'http-status-codes';
import {invoke} from "@tauri-apps/api";

function getCorrectBodyType(data: unknown): number[] | null {
    if (typeof data === 'string') return Array.from(new TextEncoder().encode(data));
    if (typeof data === 'object') return Array.from(new TextEncoder().encode(JSON.stringify(data)));
    return null;
}

function serializeParams(params: Record<string, any>): string {
    return Object.entries(params)
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
        try {

            // Use filter to help remove undefined headers
            const headers = Object.entries(config.headers || {})
                .filter(([, value]) => value !== undefined);

            const requestData = {
                method: config.method?.toUpperCase(),
                url: getCorrectUrl(config.baseURL, config.url, config.params),
                headers,
                data: getCorrectBodyType(config.data),
            };

            const rid = await invoke<number>("plugin:http|fetch", requestData);

            interface FetchSendResponse {
                status: number;
                statusText: string;
                headers: [[string, string]];
                url: string;
            }

            const response = await invoke<FetchSendResponse>("plugin:http|fetch_send", {rid});

            const body = await invoke<number[]>("plugin:http|fetch_read_body", {rid});

            const isOk = response.status >= 200 && response.status < 300;

            let stringData = new TextDecoder().decode(new Uint8Array(body));

            let data;
            try {
                data = (config.responseType === 'json' || config.responseType === undefined) ? JSON.parse(stringData) : stringData;
            } catch (e) {
                data = new TextDecoder().decode(new Uint8Array(body));
            }

            const axiosResponse: AxiosResponse<T> = {
                data,
                status: response.status,
                statusText: getReasonPhrase(response.status),
                headers: Object.fromEntries(response.headers),
                config: config as InternalAxiosRequestConfig
            };

            if (isOk) {
                return axiosResponse;
            } else {
                const code = [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4];
                const message = 'Request failed with status code ' + axiosResponse.status;
                throw new AxiosError(message, code, config as InternalAxiosRequestConfig, requestData, axiosResponse);
            }
        } catch (error) {
            throw error;
        }
    }
}
