
import axios from "axios";

const api = axios.create({
  baseURL: "https://synergysem3energymonitoringyrg-production.up.railway.app/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the JWT token to API requests
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("synergy_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
