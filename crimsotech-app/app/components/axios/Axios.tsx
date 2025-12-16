import axios from 'axios';

const baseUrl = import.meta.env.VITE_API_BASE_URL;

const AxiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: 5000,
  headers: {
    // Do not set a global Content-Type. Let Axios infer it.
    // This is critical for multipart/form-data to include correct boundaries.
    accept: "application/json",
  }
});

export default AxiosInstance;