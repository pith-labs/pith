const API_URL = import.meta.env.VITE_API_URL as string;

// Ping the API every 14 minutes to prevent Render free-tier sleep
function keepAlive() {
  fetch(`${API_URL}/`).catch(() => {});
}

// Ping on startup and then every 14 minutes
keepAlive();
setInterval(keepAlive, 14 * 60 * 1000);
