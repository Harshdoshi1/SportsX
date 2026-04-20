import axios from "axios";
import { env } from "./env.js";

export const rapidApiClient = axios.create({
  baseURL: env.rapidApiBaseUrl,
  timeout: env.rapidApiTimeoutMs,
  headers: {
    "Content-Type": "application/json",
    "x-rapidapi-host": env.rapidApiHost,
    "x-rapidapi-key": env.rapidApiKey,
  },
});
