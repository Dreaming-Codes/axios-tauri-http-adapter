import type {InternalAxiosRequestConfig, AxiosResponse, AxiosRequestConfig} from 'axios';
import {AxiosError} from 'axios';
import {getReasonPhrase} from 'http-status-codes';
import {invoke} from "@tauri-apps/api";

function getCorrectBodyType(data: unknown): BodyInit | null {
    if (typeof data === 'string') return data;
    if (typeof data === 'object') return JSON.stringify(data);
    return null;
}

function getCorrectUrl(baseURL: string | undefined, url: string | undefined): string {
    return baseURL ? `${baseURL}${url}` : `${url}`;
}

export default function axiosAdapter<T>() {
    return async (config: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        try {

            // Use filter to help remove undefined headers
            const headers = Object.entries(config.headers || {})
                .filter(([, value]) => value !== undefined);

            const requestData = {
                method: config.method?.toUpperCase(),
                url: getCorrectUrl(config.baseURL, config.url),
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

            const data = (config.responseType === 'json' || config.responseType === undefined) ? JSON.parse(new TextDecoder().decode(new Uint8Array(body))) : new TextDecoder().decode(new Uint8Array(body));

            const axiosResponse: AxiosResponse<T> = {
                data,
                status: response.status,
                statusText: getReasonPhrase(response.status),
                headers: Object.fromEntries(response.headers),
                config: config as InternalAxiosRequestConfig
            };

            if (response.status >= 200 && response.status < 300) {
                return axiosResponse;
            } else {
                const code = [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4];
                const message = 'Request failed with status code ' + axiosResponse.status;
                throw new AxiosError(message, code, config as InternalAxiosRequestConfig, {}, axiosResponse);
            }
        } catch (error) {
            throw error;
        }
    }
}
