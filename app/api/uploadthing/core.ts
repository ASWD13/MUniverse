import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";

const f = createUploadthing();

export const ourFileRouter = {
  imageUploader: f(
    {
      image: {
        maxFileSize: "4MB",
        maxFileCount: 5,
      },
    },
    {
      // Let the client completion callback fire as soon as the upload finishes.
      // The server-side record write still runs in the background.
      awaitServerData: false,
    },
  )
    .middleware(async () => {
      const { userId } = await auth();

      if (!userId) {
        throw new UploadThingError("Unauthorized");
      }

      const user = await fetchQuery(api.users.getUserByClerkId, {
        clerkId: userId,
      });

      if (!user || (user.role !== "admin" && user.role !== "faculty")) {
        throw new UploadThingError("Forbidden");
      }

      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => ({
      uploadedBy: metadata.userId,
      fileKey: file.key,
      url: file.ufsUrl,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
