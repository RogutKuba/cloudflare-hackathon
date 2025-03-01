import {
  WorkflowEntrypoint,
  WorkflowEvent,
  WorkflowStep,
} from 'cloudflare:workers';
// import { scrapePages } from '../scraper';
import { AppContext } from '..';
import { getAstraDbClient, getDbClientFromEnv } from '../db';
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

    // Check how many pages have already been scraped for this call
    const checkScrapedPages = await step.do('check-scraped-pages', async () => {
      const db = getDbClientFromEnv(this.env);
      const scrapedPages = await db
        .select()
        .from(pagesTable)
        .where(
          and(eq(pagesTable.callId, callId), eq(pagesTable.status, 'completed'))
        );
      return scrapedPages.length;
    });

    // Initialize scraping process
    const getPagesToScrape = await step.do('get-pages-to-scrape', async () => {
      const db = getDbClientFromEnv(this.env);
      console.log(
        `[${callId}] Querying database for pages to scrape for call ${callId}`
      );

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

    // Check if we've reached the 10-page limit
    const pagesRemaining = 10 - checkScrapedPages;

    if (pagesRemaining <= 0) {
      console.log(
        `[${callId}] Reached maximum of 10 pages, completing workflow`
      );
      await step.do('update-call-status', async () => {
        const db = getDbClientFromEnv(this.env);
        // update call status to completed
        await db
          .update(callTable)
          .set({ status: 'completed' })
          .where(eq(callTable.id, callId));
        console.log(`[${callId}] Call status updated to 'completed'`);
      });
      return { status: 'completed', callId, reason: 'max-pages-reached' };
    }

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
        `[${callId}] Beginning to process ${Math.min(
          getPagesToScrape.length,
          pagesRemaining
        )} pages`
      );
      // Only process up to the remaining page limit
      const pagesToProcess = getPagesToScrape.slice(0, pagesRemaining);

      for (const page of pagesToProcess) {
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

            // add embedded document to vector database
            const astraDb = getAstraDbClient(this.env);

            // chunk content into max 500 character segments
            const content = data.page.content;
            const chunkSize = 500;
            const chunks = [];

            for (let i = 0; i < content.length; i += chunkSize) {
              chunks.push(content.substring(i, i + chunkSize));
            }

            // insert each chunk as a separate document
            for (let i = 0; i < chunks.length; i++) {
              await astraDb.collection('pages').insertOne({
                _id: `${page.id}-chunk-${i}`,
                content: chunks[i],
                title: data.page.title,
                callId: callId,
                originalPageId: page.id,
                chunkIndex: i,
                totalChunks: chunks.length,
                $vectorize: chunks[i],
              });
            }

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

            const newPagesToScrape: PageEntity[] = nextUrls
              .map((url) => ({
                id: crypto.randomUUID(),
                url,
                callId,
                status: 'queued',
                createdAt: new Date(),
                title: null,
                content: null,
              }))
              .slice(0, 5);

            // insert new pages to scrape only if theres less than 20 pages total
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
        `[${callId}] Completed processing batch of ${pagesToProcess.length} pages`
      );

      // Only continue if we haven't reached the limit
      if (
        checkScrapedPages + pagesToProcess.length < 10 &&
        getPagesToScrape.length > 0
      ) {
        // launch same workflow again and keep running until all pages are scraped
        await this.env.SCRAPE_WORKFLOW.create({
          params: {
            callId,
          },
        });
      } else {
        console.log(
          `[${callId}] Reached or approaching 10-page limit, completing workflow`
        );
        await step.do('update-call-status', async () => {
          const db = getDbClientFromEnv(this.env);
          // update call status to completed
          await db
            .update(callTable)
            .set({ status: 'completed' })
            .where(eq(callTable.id, callId));
          console.log(`[${callId}] Call status updated to 'completed'`);
        });
        return { status: 'completed', callId, reason: 'max-pages-reached' };
      }
    }
  }
}

// Export the workflow
export default ScrapeWorkflow;
