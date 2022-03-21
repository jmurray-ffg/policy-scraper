const Apify = require('apify');
const jsdom = require('jsdom');
const cheerio = require('cheerio');

const { JSDOM } = jsdom;

const { findKeywords } = require('./src/keyword-extraction');
const { readPdf } = require('./readPdf')

Apify.main(async () => {
    const input = await Apify.getInput();
    console.log('Input:');
    console.dir(input);

    const {
        startUrls,
        linkSelector,
        keywords = [],
        caseSensitive = false,
        scanScripts = false,
        maxConcurrency,
        maxDepth = 5,
        maxPagesPerCrawl,
        useBrowser = false,
        proxyConfiguration = { useApifyProxy: true },
        retireInstanceAfterRequestCount = 10,
        useChrome = false,
        waitFor,
    } = input;

    // pseudoUrls are regexes used to make sure the crawler doesnt leave the site
    const pseudoUrls = startUrls.map((url) => {
        // some sites will redirect to https, make sure that these links are accepted
        let purl = url.url.replace('http://www.', '[http|https]://[.*]')
        purl = purl.replace('https://www.', '[http|https]://[.*]')
        purl = purl.replace('https://', '[http|https]://[.*]')
        purl = purl.replace('https://', '[http|https]://[.*]')
        purl = purl + ['[.*]']
        return {purl}})
    
    // some pdfs are hosted on aws or other sites, make sure to still check these pdfs
    pseudoUrls.push({purl:'[.*]\.pdf'})
    const options = {
        inCaseInsensitive: !caseSensitive,
        scanScripts,
    };

    const requestQueues = {}

    if (keywords.length === 0) {
        throw new Error('WRONG INPUT: No keywords to extract provided!');
    }

    const handlePageFunction = async ({ request, $, body, page }) => {
        const { depth, startUrl } = request.userData;

        console.log('---------------------------------------')
        console.log(request.url)
        console.log('---------------------------------------')

        if (page && waitFor) {
            // We wait for number in ms or a selector
            const maybeNumber = Number(waitFor);
            await page.waitFor(maybeNumber || maybeNumber === 0 ? maybeNumber : waitFor);
        }

        await Apify.utils.sleep(5000)

        // We use native dom in browser and library parser for Cheerio
        let result;
        if (request.url.match(/\.pdf/)){
            result = await readPdf(request.url, keywords, {'url': request.url })
        }
        else if (page) {
            result = await page.evaluate(findKeywords, null, keywords, options);
        } else {
            const dom = new JSDOM(body);
            const { document } = dom.window;
            result = findKeywords(document, keywords, options);
        }

        await Apify.pushData({
            url: request.url,
            startUrl,
            result,
        });

        if (depth >= maxDepth) {
            console.log('Reached max depth, not enqueing more ---', request.url);
        }

        if (!request.url.match(/\.pdf/)){
            if (!$) {
                const html = await page.content();
                $ = cheerio.load(html);
            }
            if (linkSelector) {
                await Apify.utils.enqueueLinks({
                    $,
                    selector: linkSelector,
                    pseudoUrls: pseudoUrls.map((req) => new Apify.PseudoUrl(req.purl)),
                    requestQueue: requestQueues[startUrl],
                    baseUrl: request.loadedUrl,
                    transformRequestFunction: (request) => {
                        // sleep between each link being enqueued. 
                        // This will hopefully prevent the Same site from being hit too many times in a short period 
                        request.userData = { depth: depth + 1, startUrl };
                        return request;
                    },
                });
            }
        }
    };

    const additionalMimeTypes = ['application/pdf']
    

    const launchContext = {
        stealth: true,
        useChrome
    };

    const pool = new Apify.AutoscaledPool({
        maxConcurrency: 50,
        runTaskFunction: async () => {
            const source = startUrls.pop()
            requestQueues[source.url] = await Apify.openRequestQueue((Math.random() + 1).toString(36).substring(7));
            const req = {
                    ...source,
                    userData: { depth: 0, startUrl: source.url},
                };
            await requestQueues[source.url].addRequest(req)
            const basicOptions = {
                maxRequestRetries: 1,
                maxRequestsPerCrawl: maxPagesPerCrawl,
                maxConcurrency,
                requestQueue: requestQueues[source.url],
                handlePageFunction,
                additionalMimeTypes
            };
            const crawler = useBrowser
                ? new Apify.PuppeteerCrawler({ ...basicOptions, launchContext})
                : new Apify.CheerioCrawler({ ...basicOptions });

            console.log('Starting crawler...');
            await crawler.run();
            console.log('Crawler.finished!');
        },
        isTaskReadyFunction: async () => {
            return startUrls.length > 0
        },
        isFinishedFunction: async () => {
        return startUrls.length < 1
        },
    });

    await pool.run();



});