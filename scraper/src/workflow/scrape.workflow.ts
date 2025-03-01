import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from 'cloudflare:workers';
// import { scrapePages } from '../scraper';
import { AppContext } from '..';
import { getDbClientFromEnv } from '../db';
import { and, eq } from 'drizzle-orm';
import { PageEntity, pagesTable } from '../schema/page.db';
import { callTable } from '../schema/call.db';
import { scrapePages } from '../scraper';

// Define the input parameters for the workflow
export interface ScrapeWorkflowParams {
  callId: string;
}

// Define the workflow class
export class ScrapeWorkflow extends WorkflowEntrypoint<
  AppContext['Bindings'],
  ScrapeWorkflowParams
> {
  async run(event: WorkflowEvent<ScrapeWorkflowParams>, step: WorkflowStep) {
    // Extract parameters from the event payload
    const { callId } = event.payload;
    console.log(`[${callId}] Starting ScrapeWorkflow`);

    // Initialize scraping process
    const getPagesToScrape = await step.do('get-pages-to-scrape', async () => {
      const db = getDbClientFromEnv(this.env);
      console.log(`[${callId}] Querying database for pages to scrape`);

      const pages = await db
        .select()
        .from(pagesTable)
        .where(
          and(eq(pagesTable.callId, callId), eq(pagesTable.status, 'queued'))
        )
        .limit(50);

      console.log(`[${callId}] Found ${pages.length} pages to scrape`);
      return pages;
    });

    if (getPagesToScrape.length === 0) {
      console.log(
        `[${callId}] No pages to scrape, updating call status to 'started'`
      );
      await step.do('update-call-status', async () => {
        const db = getDbClientFromEnv(this.env);
        // update call status to started
        await db
          .update(callTable)
          .set({ status: 'started' })
          .where(eq(callTable.id, callId));
        console.log(`[${callId}] Call status updated to 'started'`);
      });

      return { status: 'completed', callId };
    } else {
      console.log(
        `[${callId}] Beginning to process ${getPagesToScrape.length} pages`
      );
      for (const page of getPagesToScrape) {
        await step.do(`scrape-page-${page.id}`, async () => {
          console.log(`[${callId}] Processing page ${page.id}: ${page.url}`);
          const db = getDbClientFromEnv(this.env);

          // scrape the page
          try {
            console.log(`[${callId}] Scraping page ${page.id}`);

            const data = await scrapePages({
              id: page.id,
              url: page.url,
              callId,
              env: this.env,
            });

            // update page status to completed
            console.log(
              `[${callId}] Updating page ${page.id} status to 'completed'`
            );
            await db
              .update(pagesTable)
              .set({
                status: 'completed',
                content: data.page.content,
                title: data.page.title,
              })
              .where(eq(pagesTable.id, page.id));

            // add next urls only if they dont currently exist
            console.log(`[${callId}] Checking for existing URLs in database`);
            const allExistingUrls = await db
              .select({ url: pagesTable.url })
              .from(pagesTable)
              .where(eq(pagesTable.callId, callId));

            const existingUrls = new Set(allExistingUrls.map((e) => e.url));

            // filter out existing urls
            const nextUrls = data.nextUrls.filter(
              (url) => !existingUrls.has(url)
            );
            console.log(
              `[${callId}] Found ${nextUrls.length} new URLs to queue`
            );

            const newPagesToScrape: PageEntity[] = nextUrls.map((url) => ({
              id: crypto.randomUUID(),
              url,
              callId,
              status: 'queued',
              createdAt: new Date(),
              title: null,
              content: null,
            }));

            // insert new pages to scrape
            if (newPagesToScrape.length > 0) {
              console.log(
                `[${callId}] Inserting ${newPagesToScrape.length} new pages to scrape`
              );
              await db.insert(pagesTable).values(newPagesToScrape);
            }
          } catch (error) {
            // update page status to failed
            console.error(`[${callId}] Error scraping page ${page.id}:`, error);
            await db
              .update(pagesTable)
              .set({ status: 'failed' })
              .where(eq(pagesTable.id, page.id));
            console.log(
              `[${callId}] Updated page ${page.id} status to 'failed'`
            );
          }
        });
      }
      console.log(
        `[${callId}] Completed processing batch of ${getPagesToScrape.length} pages`
      );

      // launch same workflow again and keep running until all pages are scraped
      await this.env.SCRAPE_WORKFLOW.create({
        params: {
          callId,
        },
      });
    }
  }
}

// Export the workflow
export default ScrapeWorkflow;
