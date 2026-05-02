import http from "k6/http";
import { sleep } from "k6";

export const options = {
  vus: 20,
  duration: "10s",
};

export default function () {
  const url = "https://modest-camel-529.convex.cloud/api/query";

  const payload = JSON.stringify({
    path: "announcements:getAnnouncements",
    args: {},
  });

  const res = http.post(url, payload, {
    headers: { "Content-Type": "application/json" },
  });

  sleep(0.5);
}