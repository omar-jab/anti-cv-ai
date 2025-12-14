/**
 * Get the base API URL.
 * In development, uses the Vite proxy (relative path).
 * In production, uses VITE_API_URL if set, otherwise falls back to relative path.
 */
export function getApiUrl(path: string): string {
    const baseUrl = import.meta.env.VITE_API_URL;

    // If VITE_API_URL is set, use it as base URL
    if (baseUrl) {
        // Remove trailing slash from baseUrl if present
        const cleanBaseUrl = baseUrl.replace(/\/$/, "");
        // Remove leading slash from path if present
        const cleanPath = path.startsWith("/") ? path : `/${path}`;
        return `${cleanBaseUrl}${cleanPath}`;
    }

    // Otherwise, use relative path (works with Vite proxy in dev)
    return path;
}
