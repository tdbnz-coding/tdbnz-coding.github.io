export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "GET") {
      return jsonError("Method not allowed", 405);
    }

    const airport = (url.searchParams.get("airport") || "CHC").toUpperCase();

    try {
      if (airport === "AKL") return await handleAuckland(url);
      if (airport === "CHC") return await handleChristchurch(url);
      return jsonError("Unsupported airport. Use CHC or AKL.", 400);
    } catch (error) {
      console.error(error);
      return jsonError("Unable to retrieve flight data", 502);
    }
  }
};

async function handleAuckland(url) {
  const direction = (url.searchParams.get("flightDirection") || "A").toUpperCase();

  if (!["A", "D"].includes(direction)) {
    return jsonError("Invalid Auckland flightDirection. Use A or D.", 400);
  }

  const upstream = new URL(
    "https://www.aucklandairport.co.nz/content/aial/api/v1/flights"
  );
  upstream.searchParams.set("flightDirection", direction);

  const response = await fetch(upstream.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": "ThomasNZ-FlightBoard/1.0"
    }
  });

  return proxyResponse(response);
}

async function handleChristchurch(url) {
  const direction = url.searchParams.get("flightDirection") || "Arrive";
  const type = url.searchParams.get("flightType") || "Domestic";
  const maxFlights = url.searchParams.get("maxFlights") || "";

  if (!["Arrive", "Depart"].includes(direction)) {
    return jsonError("Invalid Christchurch flightDirection. Use Arrive or Depart.", 400);
  }

  if (!["Domestic", "International"].includes(type)) {
    return jsonError("Invalid Christchurch flightType. Use Domestic or International.", 400);
  }

  const upstream = new URL(
    "https://www.christchurchairport.co.nz/api/flights"
  );

  upstream.searchParams.set("maxFlights", maxFlights);
  upstream.searchParams.set("flightDirection", direction);
  upstream.searchParams.set("flightType", type);

  const response = await fetch(upstream.toString(), {
    headers: {
      "Accept": "application/json",
      "User-Agent": "ThomasNZ-FlightBoard/1.0"
    }
  });

  return proxyResponse(response);
}

async function proxyResponse(response) {
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function jsonError(message, status) {
  return new Response(JSON.stringify({
    success: false,
    error: message
  }), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=UTF-8"
    }
  });
}
