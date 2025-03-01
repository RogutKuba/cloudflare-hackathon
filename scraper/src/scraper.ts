import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pagesTable, PageEntity } from './schema';
import { eq } from 'drizzle-orm';
import { JSDOM } from 'jsdom';

export async function scrapePages(
  startUrl: string,
  maxPages: number,
  callId: string,
  databaseUrl: string
): Promise<void> {
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    const visited = new Set<string>();
    const queue: { url: string; parentUrl?: string }[] = [{ url: startUrl }];

    while (queue.length > 0 && visited.size < maxPages) {
      const { url, parentUrl } = queue.shift()!;

      // Skip if already visited
      if (visited.has(url)) continue;
      visited.add(url);

      // Update status to in_progress
      await db
        .insert(pagesTable)
        .values({
          callId,
          url,
          parentUrl,
          status: 'in_progress',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [pagesTable.callId, pagesTable.url],
          set: {
            status: 'in_progress',
            updatedAt: new Date(),
          },
        });

      try {
        // Fetch the page
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WebScraper/1.0)',
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${url}: ${response.status} ${response.statusText}`
          );
        }

        const html = await response.text();
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Extract title and content
        const title = document.querySelector('title')?.textContent || '';
        const content =
          document.querySelector('body')?.textContent?.trim() || '';

        // Extract metadata
        const metadata = {
          description:
            document
              .querySelector('meta[name="description"]')
              ?.getAttribute('content') || '',
          keywords:
            document
              .querySelector('meta[name="keywords"]')
              ?.getAttribute('content') || '',
          ogTitle:
            document
              .querySelector('meta[property="og:title"]')
              ?.getAttribute('content') || '',
          ogDescription:
            document
              .querySelector('meta[property="og:description"]')
              ?.getAttribute('content') || '',
        };

        // Update the database with the scraped content
        await db
          .update(pagesTable)
          .set({
            status: 'completed',
            title,
            content,
            metadata,
            updatedAt: new Date(),
          })
          .where(eq(pagesTable.url, url));

        // Find links to add to the queue
        if (visited.size < maxPages) {
          const links = document.querySelectorAll('a[href]');
          for (const link of links) {
            try {
              const href = link.getAttribute('href');
              if (!href) continue;

              // Resolve relative URLs
              const resolvedUrl = new URL(href, url).toString();

              // Only follow links to the same domain
              const urlObj = new URL(url);
              const resolvedUrlObj = new URL(resolvedUrl);

              if (
                resolvedUrlObj.hostname === urlObj.hostname &&
                !visited.has(resolvedUrl) &&
                !queue.some((item) => item.url === resolvedUrl)
              ) {
                queue.push({ url: resolvedUrl, parentUrl: url });

                // Add to database as queued
                await db
                  .insert(scrapedPages)
                  .values({
                    callId,
                    url: resolvedUrl,
                    parentUrl: url,
                    status: 'queued',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  })
                  .onConflictDoNothing();
              }
            } catch (error) {
              // Skip invalid URLs
              console.error('Error processing link:', error);
            }
          }
        }
      } catch (error) {
        console.error(`Error scraping ${url}:`, error);

        // Update the database with the error
        await db
          .update(pagesTable)
          .set({
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
            updatedAt: new Date(),
          })
          .where(eq(pagesTable.url, url));
      }
    }
  } finally {
    await client.end();
  }
}
