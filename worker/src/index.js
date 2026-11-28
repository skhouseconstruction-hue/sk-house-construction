const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function response(body, status = 200, origin = "*") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      "access-control-allow-origin": origin || "*",
      "access-control-allow-methods": "GET, PUT, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "vary": "Origin",
      "cache-control": "no-store"
    }
  });
}

async function authenticate(request, env) {
  const header = request.headers.get("authorization") || "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  if (!base || !env.SUPABASE_ANON_KEY) throw new Error("AUTH_SERVICE_NOT_CONFIGURED");
  const res = await fetch(base + "/auth/v1/user", {
    headers: {
      "apikey": env.SUPABASE_ANON_KEY,
      "authorization": "Bearer " + token
    }
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user && typeof user.id === "string" ? user : null;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "*";
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "GET, PUT, OPTIONS",
          "access-control-allow-headers": "authorization, content-type",
          "access-control-max-age": "86400",
          "vary": "Origin"
        }
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return response({ ok: true, service: "sk-house-construction-api" }, 200, origin);
    }
    if (url.pathname !== "/api/state" || !["GET", "PUT"].includes(request.method)) {
      return response({ error: "NOT_FOUND" }, 404, origin);
    }

    try {
      const user = await authenticate(request, env);
      if (!user) return response({ error: "UNAUTHORIZED" }, 401, origin);

      if (request.method === "GET") {
        const row = await env.DB.prepare(
          "SELECT payload, updated_at FROM company_state WHERE user_id = ?"
        ).bind(user.id).first();
        if (!row) return response({ payload: null, updatedAt: null }, 200, origin);
        let payload;
        try { payload = JSON.parse(row.payload); }
        catch { return response({ error: "INVALID_STORED_PAYLOAD" }, 500, origin); }
        return response({ payload, updatedAt: row.updated_at }, 200, origin);
      }

      const body = await request.json();
      if (!body || typeof body !== "object" || !body.payload ||
          typeof body.payload !== "object" || Array.isArray(body.payload)) {
        return response({ error: "INVALID_PAYLOAD" }, 400, origin);
      }
      const payloadText = JSON.stringify(body.payload);
      if (payloadText.length > 8_000_000) {
        return response({ error: "PAYLOAD_TOO_LARGE" }, 413, origin);
      }
      const stamp = new Date().toISOString();
      const expected = body.expectedUpdatedAt ?? null;

      if (expected === null) {
        try {
          await env.DB.prepare(
            "INSERT INTO company_state (user_id, payload, updated_at) VALUES (?, ?, ?)"
          ).bind(user.id, payloadText, stamp).run();
        } catch (error) {
          const existing = await env.DB.prepare(
            "SELECT payload, updated_at FROM company_state WHERE user_id = ?"
          ).bind(user.id).first();
          if (!existing) throw error;
          return response({ error: "CONFLICT", payload: JSON.parse(existing.payload), updatedAt: existing.updated_at }, 409, origin);
        }
      } else {
        const result = await env.DB.prepare(
          "UPDATE company_state SET payload = ?, updated_at = ? WHERE user_id = ? AND updated_at = ?"
        ).bind(payloadText, stamp, user.id, String(expected)).run();
        if (!result.meta?.changes) {
          const existing = await env.DB.prepare(
            "SELECT payload, updated_at FROM company_state WHERE user_id = ?"
          ).bind(user.id).first();
          return response({
            error: "CONFLICT",
            payload: existing ? JSON.parse(existing.payload) : null,
            updatedAt: existing?.updated_at || null
          }, 409, origin);
        }
      }

      return response({ ok: true, payload: body.payload, updatedAt: stamp }, 200, origin);
    } catch (error) {
      console.error("SKHC API:", error);
      const message = error?.message === "AUTH_SERVICE_NOT_CONFIGURED"
        ? "AUTH_SERVICE_NOT_CONFIGURED"
        : "INTERNAL_ERROR";
      return response({ error: message }, 500, origin);
    }
  }
};
