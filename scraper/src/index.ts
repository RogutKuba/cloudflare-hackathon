import { Hono } from 'hono';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { pagesTable } from './schema';

export type AppConext = {
  Bindings: {
    DATABASE_URL: string;
  };
  Variables: {
    db: PostgresJsDatabase;
  };
};

const app = new Hono<AppConext>();

app.get('/health', (c) => {
  return c.text('OK');
});

// Add a new route that accepts a URL parameter and starts the scraping process
app.post('/:callId/scrape', async (c) => {
  const callId = c.req.param('callId');
  const { url, maxPages } = await c.req.json();

  // Initialize database connection
  const client = postgres(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    // Create a scraping job entry
    await db.insert(pagesTable).values({
      callId,
      url,
      status: 'queued',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Start the scraping process in the background
    c.executionCtx.waitUntil(
      scrapePages(url, maxPages, callId, c.env.DATABASE_URL)
    );

    return c.json({
      status: 'success',
      message: 'Scraping job started',
      callId,
      url,
    });
  } catch (error) {
    console.error('Error starting scrape job:', error);
    return c.json({ error: 'Failed to start scraping job' }, 500);
  } finally {
    await client.end();
  }
});

// Get the status of a scraping job
app.get('/:callId/scrape/status', async (c) => {
  const callId = c.req.param('callId');

  // Initialize database connection
  const client = postgres(c.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    // Get all pages for this call
    const pages = await db
      .select()
      .from(pagesTable)
      .where(eq(pagesTable.callId, callId));

    // Calculate overall status
    const totalPages = pages.length;
    const completedPages = pages.filter(
      (page) => page.status === 'completed'
    ).length;
    const failedPages = pages.filter((page) => page.status === 'failed').length;
    const inProgressPages = pages.filter(
      (page) => page.status === 'in_progress'
    ).length;
    const queuedPages = pages.filter((page) => page.status === 'queued').length;

    const overallStatus =
      totalPages === 0
        ? 'not_found'
        : failedPages === totalPages
        ? 'failed'
        : completedPages + failedPages === totalPages
        ? 'completed'
        : 'in_progress';

    return c.json({
      status: overallStatus,
      stats: {
        total: totalPages,
        completed: completedPages,
        failed: failedPages,
        inProgress: inProgressPages,
        queued: queuedPages,
      },
      pages,
    });
  } catch (error) {
    console.error('Error fetching scrape status:', error);
    return c.json({ error: 'Failed to fetch scraping status' }, 500);
  } finally {
    await client.end();
  }
});

export default app;
