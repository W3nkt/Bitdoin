export interface Env {
  WHATSAPP_VERIFY_TOKEN: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return Response.json({
        service: "Bitdoin API",
        status: "online",
      });
    }

    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
      });
    }

    // Meta verifies this endpoint using a GET request.
    if (
      request.method === "GET" &&
      url.pathname === "/webhooks/whatsapp"
    ) {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (
        mode === "subscribe" &&
        token === env.WHATSAPP_VERIFY_TOKEN &&
        challenge
      ) {
        return new Response(challenge, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

      return new Response("Forbidden", {
        status: 403,
      });
    }

    // Meta will send incoming messages and delivery updates here.
    if (
      request.method === "POST" &&
      url.pathname === "/webhooks/whatsapp"
    ) {
      const body = await request.json();

      console.log(
        "WhatsApp webhook:",
        JSON.stringify(body),
      );

      return Response.json({
        received: true,
      });
    }

    return Response.json(
      {
        error: "Not Found",
      },
      {
        status: 404,
      },
    );
  },
};