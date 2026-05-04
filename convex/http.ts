import { httpRouter } from "convex/server";
import { health } from "./metrics";

const http = httpRouter();

http.route({
  path: "/health",
  method: "GET",
  handler: health,
});

export default http;
