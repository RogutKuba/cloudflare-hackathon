import { pagesTable } from './schema/page.db';
import { eq } from 'drizzle-orm';
import { getDbClientFromEnv } from './db';
import { AppContext } from '.';
import puppeteer, { Browser } from '@cloudflare/puppeteer';

export async function scrapePages(params: {
  id: string;
  url: string;
  callId: string;
  env: AppContext['Bindings'];
}): Promise<{
  page: {
    url: string;
    title: string;
    content: string;
  };
  nextUrls: string[];
}> {
  const { id, url, callId, env } = params;
  const db = getDbClientFromEnv(env);
  let browser = null;

  try {
    // Launch browser using Puppeteer
    browser = await puppeteer.launch(env.CRAWLER_BROWSER);

    // Create a new page
    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (compatible; WebScraper/1.0)');

    // Navigate to the URL and wait for the page to load
    await page.goto(url, {
      waitUntil: 'load',
    });

    // Extract title and content
    const title = await page.title();
    const content = await page.evaluate(() => {
      return document.body.innerText.trim();
    });

    // Find links to add to the queue
    const nextUrls = await page.evaluate((baseUrl) => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const uniqueUrls = new Set<string>();

      links.forEach((link) => {
        try {
          const href = link.getAttribute('href');
          if (!href) return;

          // Resolve relative URLs
          const resolvedUrl = new URL(href, baseUrl).toString();

          // Only include links to the same domain
          const urlObj = new URL(baseUrl);
          const resolvedUrlObj = new URL(resolvedUrl);

          if (resolvedUrlObj.hostname === urlObj.hostname) {
            uniqueUrls.add(resolvedUrl);
          }
        } catch (error) {
          // Skip invalid URLs
          console.error('Error processing link:', error);
        }
      });

      return Array.from(uniqueUrls);
    }, url);

    return {
      page: {
        url,
        title,
        content,
      },
      nextUrls,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);

    await db
      .update(pagesTable)
      .set({
        status: 'failed',
      })
      .where(eq(pagesTable.id, id));

    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
