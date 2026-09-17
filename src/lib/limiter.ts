import type { Pool, PoolClient } from "pg";
import { HttpError } from "./http-error";
import {
  IMAGE_REQUESTS_PER_MINUTE,
  IP_REQUESTS_PER_MINUTE,
  JEV_PER_DAY,
  VISION_PER_DAY,
} from "./limits";

type Reservation = {
  bucket: string;
  limit: number;
  code: "rate_limited" | "budget_exhausted";
  retryAfter: number;
};

export type Limiter = {
  admit: (input: { ip: string; image: boolean }) => Promise<void>;
};

function pacificParts(date: Date): { day: string; minute: string; second: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minute: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`,
    second: Number(parts.second),
  };
}

function secondsUntilPacificMidnight(date: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, Number(part.value)]),
  );
  const elapsed = parts.hour * 3600 + parts.minute * 60 + parts.second;
  return Math.max(1, 86400 - elapsed);
}

async function increment(client: PoolClient, bucket: string): Promise<number> {
  const result = await client.query<{ count: number }>(
    `INSERT INTO safer_limiter (bucket, count) VALUES ($1, 1)
     ON CONFLICT (bucket) DO UPDATE SET count = safer_limiter.count + 1
     RETURNING count`,
    [bucket],
  );
  const count = result.rows[0]?.count;
  if (count === undefined) {
    throw new Error("limiter increment returned no row");
  }
  return count;
}

export function createLimiter(pool: Pool | null): Limiter {
  let ready: Promise<void> | null = null;

  async function ensureSchema(): Promise<void> {
    if (!pool) {
      throw new HttpError(503, "limiter_unavailable", "Rate limiter storage is unavailable.", "admission");
    }
    if (!ready) {
      ready = pool
        .query(
          `CREATE TABLE IF NOT EXISTS safer_limiter (
             bucket text PRIMARY KEY,
             count integer NOT NULL
           )`,
        )
        .then(() => undefined)
        .catch((error: unknown) => {
          ready = null;
          throw error;
        });
    }
    await ready;
  }

  return {
    async admit(input) {
      try {
        await ensureSchema();
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }
        throw new HttpError(503, "limiter_unavailable", "Rate limiter storage is unavailable.", "admission");
      }
      if (!pool) {
        throw new HttpError(503, "limiter_unavailable", "Rate limiter storage is unavailable.", "admission");
      }

      const now = new Date();
      const parts = pacificParts(now);
      const minuteRetry = Math.max(1, 60 - parts.second);
      const dayRetry = secondsUntilPacificMidnight(now);
      const reservations: Reservation[] = [
        {
          bucket: `ip:${input.ip}:${parts.minute}`,
          limit: IP_REQUESTS_PER_MINUTE,
          code: "rate_limited",
          retryAfter: minuteRetry,
        },
        {
          bucket: `jev:${parts.day}`,
          limit: JEV_PER_DAY,
          code: "budget_exhausted",
          retryAfter: dayRetry,
        },
      ];
      if (input.image) {
        reservations.push(
          {
            bucket: `image:${input.ip}:${parts.minute}`,
            limit: IMAGE_REQUESTS_PER_MINUTE,
            code: "rate_limited",
            retryAfter: minuteRetry,
          },
          {
            bucket: `vision:${parts.day}`,
            limit: VISION_PER_DAY,
            code: "budget_exhausted",
            retryAfter: dayRetry,
          },
        );
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const reservation of reservations) {
          const count = await increment(client, reservation.bucket);
          if (count > reservation.limit) {
            await client.query("ROLLBACK");
            throw new HttpError(
              429,
              reservation.code,
              reservation.code === "budget_exhausted"
                ? "Daily inference budget is exhausted."
                : "Too many requests from this client.",
              "admission",
            );
          }
        }
        await client.query("COMMIT");
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          // The transaction is already closed or the connection is dead.
        }
        if (error instanceof HttpError) {
          throw error;
        }
        throw new HttpError(503, "limiter_unavailable", "Rate limiter storage is unavailable.", "admission");
      } finally {
        client.release();
      }
    },
  };
}

export function retryAfterSeconds(error: HttpError): number | undefined {
  if (error.status !== 429) {
    return undefined;
  }
  if (error.code === "budget_exhausted") {
    return secondsUntilPacificMidnight(new Date());
  }
  if (error.code === "rate_limited") {
    return Math.max(1, 60 - pacificParts(new Date()).second);
  }
  return undefined;
}
