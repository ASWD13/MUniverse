import http from "k6/http";
import { sleep } from "k6";

export const options = {
  vus: 10,
  duration: "10s",
};

export default function () {
  const url = "https://modest-camel-529.convex.cloud/api/mutation";

  const payload = JSON.stringify({
    path: "announcements:createAnnouncement",
    args: {
      title: "Load Test",
      content: "Testing notification load",
      targetRoles: ["student"],
    },
  });

  const res = http.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      // If you have an auth token, add it here:
      // "Authorization": "Bearer <TOKEN>"
    },
  });

  sleep(1);
}