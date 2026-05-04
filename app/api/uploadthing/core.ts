import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";

const f = createUploadthing();

export const ourFileRouter = {
  courseResourceUploader: f(
    {
      blob: {
        maxFileSize: "64MB",
        maxFileCount: 20,
      },
      pdf: {
        maxFileSize: "64MB",
        maxFileCount: 20,
      },
      image: {
        maxFileSize: "16MB",
        maxFileCount: 20,
      },
      video: {
        maxFileSize: "128MB",
        maxFileCount: 5,
      },
      text: {
        maxFileSize: "16MB",
        maxFileCount: 20,
      },
    },
    {
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
      name: file.name,
      size: file.size,
    })),

  assignmentSubmissionUploader: f(
    {
      blob: {
        maxFileSize: "64MB",
        maxFileCount: 1,
      },
      pdf: {
        maxFileSize: "64MB",
        maxFileCount: 1,
      },
      image: {
        maxFileSize: "16MB",
        maxFileCount: 1,
      },
      text: {
        maxFileSize: "16MB",
        maxFileCount: 1,
      },
    },
    {
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

      if (!user) {
        throw new UploadThingError("Forbidden");
      }

      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => ({
      uploadedBy: metadata.userId,
      fileKey: file.key,
      url: file.ufsUrl,
      name: file.name,
      size: file.size,
    })),

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
