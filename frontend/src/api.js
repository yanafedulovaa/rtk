import axios from "axios";

const api = axios.create({
  baseURL: "http://185.146.3.192/api", 
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
