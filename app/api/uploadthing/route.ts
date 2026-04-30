import { createUploadthing, type FileRouter } from "uploadthing/next";
import { createRouteHandler } from "uploadthing/next";

import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const f = createUploadthing();

export const ourFileRouter = {
    imageUploader: f({
        image: {
            maxFileSize: "4MB",
            maxFileCount: 5,
        },
    })
        .middleware(async () => {
            const { userId } = await auth();

            if (!userId) {
                throw new Error("Unauthorized");
            }

            // Verify role (must be admin or faculty)
            const user = await fetchQuery(api.users.getUserByClerkId, { clerkId: userId });
            if (!user || (user.role !== "admin" && user.role !== "faculty")) {
                throw new Error("Forbidden");
            }

            return { userId };
        })
        .onUploadComplete(async ({ metadata, file }) => {
            // Save file info in Convex
            await fetchMutation(api.files.storeFile, {
                url: file.url,
                userId: metadata.userId,
                name: file.name,
                size: file.size,
            });

            return {
                uploadedBy: metadata.userId,
                url: file.url,
            };
        }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

// Route handler (THIS is what Next.js uses)
export const { GET, POST } = createRouteHandler({
    router: ourFileRouter,
});