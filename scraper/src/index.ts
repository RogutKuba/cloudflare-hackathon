import { Hono } from 'hono';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { PageEntity, pagesTable } from './schema/page.db';
import { callTable } from './schema/call.db';
import {
  ScrapeWorkflow,
  ScrapeWorkflowParams,
} from './workflow/scrape.workflow';
import { getDbClient } from './db';
import { BrowserWorker } from '@cloudflare/puppeteer';
import { Db } from '@datastax/astra-db-ts';

export type AppContext = {
  Bindings: {
    DATABASE_URL: string;
    SCRAPE_WORKFLOW: Workflow<ScrapeWorkflowParams>;
    CRAWLER_BROWSER: BrowserWorker;

    // astra db
    ASTRA_DB_API_ENDPOINT: string;
    ASTRA_DB_APPLICATION_TOKEN: string;
  };
  Variables: {
    db: PostgresJsDatabase;
    astraDb: Db;
  };
};

const app = new Hono<AppContext>();

app.get('/health', (c) => {
  return c.text('OK');
});

// Add a new route that accepts a URL parameter and starts the scraping process
app.post('/:callId/scrape', async (c) => {
  const callId = c.req.param('callId');
  const { url } = await c.req.json();

  const db = getDbClient(c);

  try {
    // update call id status to scraping
    await db
      .update(callTable)
      .set({ status: 'scraping' })
      .where(eq(callTable.id, callId));

    const newPage: PageEntity = {
      id: crypto.randomUUID(),
      callId,
      url,
      status: 'queued',
      createdAt: new Date(),
      title: null,
      content: null,
    };

    // Create a scraping job entry
    await db.insert(pagesTable).values(newPage);

    // start the workflow
    const workflow = await c.env.SCRAPE_WORKFLOW.create({
      params: {
        callId,
      },
    });

    return c.json({
      status: 'success',
      message: 'Scraping job started',
      callId,
      workflowId: workflow.id,
    });
  } catch (error) {
    console.error('Error starting scrape job:', error);
    return c.json({ error: 'Failed to start scraping job' }, 500);
  }
});

export default app;

// WORKFLOW EXPORTS
export { ScrapeWorkflow };
