import type { APIRoute } from "astro";

export const get: APIRoute = () => {
    return new Response(JSON.stringify({
        message: "hello"
    }))
}