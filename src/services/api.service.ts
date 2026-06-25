import axios from "axios";
import { env } from "@/config/env";

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("axion.auth.token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
