import type { APIRoute } from "astro";

export const get: APIRoute = () => {
    return {
        body: JSON.stringify({
            message: "hello"
        })
    }
}