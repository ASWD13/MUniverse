type Role = "student" | "faculty" | "admin";

type UserDoc = {
    _id: string;
    clerkId: string;
    role: Role;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    enrollmentNumber?: string;
    department?: string;
    employeeId?: string;
    updatedAt?: number;
};

type AnnouncementDoc = {
    _id: string;
    title: string;
    content: string;
    authorId: string;
    targetRoles: Role[];
    updatedAt: number;
};

type AnnouncementReadDoc = {
    _id: string;
    userId: string;
    announcementId: string;
    readAt: number;
};

type NotificationDoc = {
    _id: string;
    userId: string;
    type: "general" | "announcement" | "event";
    content: string;
    isRead: boolean;
    relatedId?: string;
};

type TableMap = {
    users: UserDoc[];
    announcements: AnnouncementDoc[];
    announcementReads: AnnouncementReadDoc[];
    notifications: NotificationDoc[];
};

type TableName = keyof TableMap;

type SeedDoc<T extends { _id: string }> = Omit<T, "_id"> & { _id?: string };

type CreateFakeCtxOptions = {
    identitySubject?: string | null;
    users?: SeedDoc<UserDoc>[];
    announcements?: SeedDoc<AnnouncementDoc>[];
    announcementReads?: SeedDoc<AnnouncementReadDoc>[];
    notifications?: SeedDoc<NotificationDoc>[];
};

type EqBuilder = {
    eq: (field: string, value: unknown) => EqBuilder;
};

class FakeQuery<T extends Record<string, unknown>> {
    private filters: Array<[string, unknown]> = [];
    private direction: "asc" | "desc" | null = null;

    constructor(private readonly getRows: () => T[]) { }

    withIndex(_indexName: string, range?: (q: EqBuilder) => unknown): this {
        if (!range) {
            return this;
        }

        const nextFilters: Array<[string, unknown]> = [];
        const builder: EqBuilder = {
            eq: (field: string, value: unknown) => {
                nextFilters.push([field, value]);
                return builder;
            },
        };

        range(builder);
        this.filters = nextFilters;
        return this;
    }

    order(direction: "asc" | "desc"): this {
        this.direction = direction;
        return this;
    }

    async collect(): Promise<T[]> {
        let rows = this.getRows().filter((row) =>
            this.filters.every(([field, value]) =>
                Object.is((row as Record<string, unknown>)[field], value),
            ),
        );

        if (this.direction) {
            const multiplier = this.direction === "asc" ? 1 : -1;
            rows = [...rows].sort((a, b) => {
                const aUpdatedAt = typeof a.updatedAt === "number" ? a.updatedAt : 0;
                const bUpdatedAt = typeof b.updatedAt === "number" ? b.updatedAt : 0;
                return (aUpdatedAt - bUpdatedAt) * multiplier;
            });
        }

        return rows.map((row) => ({ ...row }));
    }

    async unique(): Promise<T | null> {
        const rows = await this.collect();
        if (rows.length > 1) {
            throw new Error("unique() returned multiple documents");
        }
        return rows[0] ?? null;
    }
}

function cloneSeed<T extends { _id: string }>(
    tableName: TableName,
    rows: SeedDoc<T>[] | undefined,
    nextId: () => number,
): T[] {
    if (!rows) {
        return [];
    }

    return rows.map((row) => {
        const { _id, ...rest } = row;
        return {
            _id: _id ?? `${tableName}:${nextId()}`,
            ...(rest as Omit<T, "_id">),
        } as T;
    });
}

export function createFakeConvexCtx(options: CreateFakeCtxOptions = {}) {
    let idCounter = 0;
    const nextId = () => {
        idCounter += 1;
        return idCounter;
    };

    let identitySubject = options.identitySubject ?? null;

    const state: TableMap = {
        users: cloneSeed<UserDoc>("users", options.users, nextId),
        announcements: cloneSeed<AnnouncementDoc>("announcements", options.announcements, nextId),
        announcementReads: cloneSeed<AnnouncementReadDoc>("announcementReads", options.announcementReads, nextId),
        notifications: cloneSeed<NotificationDoc>("notifications", options.notifications, nextId),
    };

    const db = {
        query: <T extends TableName>(tableName: T) =>
            new FakeQuery<TableMap[T][number]>(
                () => state[tableName] as unknown as TableMap[T][number][],
            ),
        insert: async <T extends TableName>(tableName: T, doc: Omit<TableMap[T][number], "_id">) => {
            const inserted = {
                _id: `${tableName}:${nextId()}`,
                ...doc,
            } as TableMap[T][number];
            (state[tableName] as unknown as TableMap[T][number][]).push(
                inserted as TableMap[T][number],
            );
            return inserted._id;
        },
        get: async (id: string) => {
            for (const tableName of Object.keys(state) as TableName[]) {
                const match = state[tableName].find((row) => row._id === id);
                if (match) {
                    return { ...match };
                }
            }
            return null;
        },
        delete: async (id: string) => {
            for (const tableName of Object.keys(state) as TableName[]) {
                const idx = state[tableName].findIndex((row) => row._id === id);
                if (idx >= 0) {
                    state[tableName].splice(idx, 1);
                    return;
                }
            }
        },
    };

    const ctx = {
        auth: {
            getUserIdentity: async () =>
                identitySubject
                    ? ({ subject: identitySubject } as { subject: string })
                    : null,
        },
        db,
    };

    return {
        ctx,
        state,
        setIdentitySubject(nextSubject: string | null) {
            identitySubject = nextSubject;
        },
    };
}

export type { Role, UserDoc, AnnouncementDoc, AnnouncementReadDoc, NotificationDoc };
