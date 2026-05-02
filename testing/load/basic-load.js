import http from "k6/http";
import { sleep } from "k6";

export default function () {
  const url = "https://modest-camel-529.convex.cloud/api/query";

  const payload = JSON.stringify({
    path: "announcements:getAnnouncements",
    args: {},
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  http.post(url, payload, params);

  sleep(1);
}