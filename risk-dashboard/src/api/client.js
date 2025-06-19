// src/api/client.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000", // point to your FastAPI during dev
  timeout: 5000,
});

// Optionally, add interceptors for error handling
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API error:", error.response || error.message);
    return Promise.reject(error);
  }
);

export default API;
