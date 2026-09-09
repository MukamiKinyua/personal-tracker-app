import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { mongoReadiness } from "./mongo";
import {
  createSessionToken,
  googleConfigured,
  SESSION_MAX_AGE_MS,
  signInWithGoogle,
} from "./googleAuth";
import { deleteUser } from "./mongoUsers";
import {
  isDeviceActive,
  listDevices,
  purgeDevices,
  renameDevice,
  revokeDevice,
  touchDevice,
} from "./mongoDevices";
import {
  countRecords,
  currentCursor,
  pullRecords,
  purgeOwner,
  pushRecords,
} from "./mongoRecords";
import {
  getMongoJournalState,
  listMongoJournalEvents,
  recordMongoJournalEvent,
  upsertMongoJournalState,
} from "./mongoJournal";

const journalScopeSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9_-]*$/i);
const journalPayloadSchema = z.record(z.string(), z.unknown());

const recordPeriodSchema = z.object({
  start: z.string(),
  end: z.string().optional(),
});

const pushWriteSchema = z.object({
  recordId: z.string().min(1).max(200),
  scope: journalScopeSchema,
  body: journalPayloadSchema,
  period: recordPeriodSchema,
  source: z.string().min(1).max(32),
  baseRevision: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
  provider: z.string().max(64).optional(),
  externalId: z.string().max(200).optional(),
});

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    /** Lets the sign-in screen offer only what this server can actually do. */
    methods: publicProcedure.query(() => ({
      google: googleConfigured(),
    })),
    /**
     * Exchanges a Google ID token for a session on this server.
     *
     * The token is verified against Google's published keys before anything is
     * created — the client is never trusted to say who it is.
     */
    google: publicProcedure
      .input(z.object({ idToken: z.string().min(1).max(4096) }))
      .mutation(async ({ ctx, input }) => {
        const user = await signInWithGoogle(input.idToken);
        const token = await createSessionToken(user);

        ctx.res.cookie(COOKIE_NAME, token, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: SESSION_MAX_AGE_MS,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          picture: user.picture,
        };
      }),
    /**
     * Deletes the account and everything in it.
     *
     * Ordered deliberately: records first, then devices, then the account. If
     * it fails part-way the account still exists, so the user can ask again —
     * whereas deleting the account first would orphan the records with no
     * owner left to reach them.
     */
    deleteAccount: protectedProcedure
      .input(z.object({ confirm: z.literal("delete everything") }))
      .mutation(async ({ ctx }) => {
        const deleted = await purgeOwner(ctx.user.id);
        await purgeDevices(ctx.user.id);
        await deleteUser(ctx.user.id);

        ctx.res.clearCookie(COOKIE_NAME, {
          ...getSessionCookieOptions(ctx.req),
          maxAge: -1,
        });
        return { deleted };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  /**
   * The durable copy. Records are stored individually with a per-owner
   * sequence number so a client can pull only what it has not seen, and every
   * write states the revision it was made against so a replayed offline queue
   * cannot overwrite another device's edit.
   */
  records: router({
    pull: protectedProcedure
      .input(
        z.object({
          since: z.number().int().min(0).default(0),
          limit: z.number().int().min(1).max(1000).default(500),
        })
      )
      .query(({ ctx, input }) =>
        pullRecords(ctx.user.id, input.since, input.limit)
      ),
    push: protectedProcedure
      .input(z.object({ writes: z.array(pushWriteSchema).max(200) }))
      .mutation(({ ctx, input }) => pushRecords(ctx.user.id, input.writes)),
    status: protectedProcedure.query(async ({ ctx }) => ({
      cursor: await currentCursor(ctx.user.id),
      records: await countRecords(ctx.user.id),
    })),
  }),
  /**
   * One row per device, each with its own cursor — the laptop being up to
   * date says nothing about what the tablet has seen.
   */
  devices: router({
    register: protectedProcedure
      .input(
        z.object({
          deviceId: z.string().min(1).max(100),
          label: z.string().trim().min(1).max(60),
          kind: z.string().min(1).max(20),
          cursor: z.number().int().min(0).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        touchDevice({ ownerId: ctx.user.id, ...input })
      ),
    list: protectedProcedure.query(({ ctx }) => listDevices(ctx.user.id)),
    check: protectedProcedure
      .input(z.object({ deviceId: z.string().min(1).max(100) }))
      .query(({ ctx, input }) => isDeviceActive(ctx.user.id, input.deviceId)),
    rename: protectedProcedure
      .input(
        z.object({
          deviceId: z.string().min(1).max(100),
          label: z.string().trim().min(1).max(60),
        })
      )
      .mutation(({ ctx, input }) =>
        renameDevice(ctx.user.id, input.deviceId, input.label)
      ),
    revoke: protectedProcedure
      .input(z.object({ deviceId: z.string().min(1).max(100) }))
      .mutation(({ ctx, input }) => revokeDevice(ctx.user.id, input.deviceId)),
    // The account-deletion path the privacy requirements ask for.
    purge: protectedProcedure
      .input(z.object({ confirm: z.literal("delete everything") }))
      .mutation(async ({ ctx }) => {
        const deleted = await purgeOwner(ctx.user.id);
        await purgeDevices(ctx.user.id);
        return { deleted };
      }),
  }),
  journal: router({
    connection: publicProcedure.query(async () => {
      const status = await mongoReadiness();
      return {
        ready: status.reachable,
        configured: status.configured,
        supported: status.supported,
      };
    }),
    state: router({
      get: protectedProcedure
        .input(z.object({ scope: journalScopeSchema }))
        .query(({ ctx, input }) =>
          getMongoJournalState(ctx.user.id, input.scope)
        ),
      upsert: protectedProcedure
        .input(
          z.object({ scope: journalScopeSchema, payload: journalPayloadSchema })
        )
        .mutation(({ ctx, input }) =>
          upsertMongoJournalState(ctx.user.id, input.scope, input.payload)
        ),
    }),
    events: router({
      list: protectedProcedure
        .input(
          z.object({
            scope: journalScopeSchema.optional(),
            limit: z.number().int().min(1).max(100).default(25),
          })
        )
        .query(({ ctx, input }) =>
          listMongoJournalEvents(ctx.user.id, input.limit, input.scope)
        ),
      record: protectedProcedure
        .input(
          z.object({
            scope: journalScopeSchema,
            kind: z.string().trim().min(1).max(64),
            summary: z.string().trim().min(1).max(240),
            metadata: journalPayloadSchema.optional(),
            occurredAt: z.date().optional(),
          })
        )
        .mutation(({ ctx, input }) =>
          recordMongoJournalEvent(ctx.user.id, input)
        ),
    }),
  }),
});

export type AppRouter = typeof appRouter;
