import axios from 'axios';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

const AxiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: 5000,
  headers: {
    "Content-Type": "application/json",
    accept: "application/json",
  }
});

export default AxiosInstance;