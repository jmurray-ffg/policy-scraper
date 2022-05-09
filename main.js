const Apify = require('apify');
const jsdom = require('jsdom');
const cheerio = require('cheerio');

const { JSDOM } = jsdom;

const { findKeywords } = require('./src/keyword-extraction');
const { readPdf } = require('./readPdf')
let total_processing = 0
let total_sleep = 0

const keyPrefix = 'result_'
const get_correlation_score = (result, keywords) => {
    var score = 0;
    keywords.forEach(keyword => {
        // may add weight in the future
        var weight = keyword.weight
        var count = (keyword.keyword in result) ? result[keyword.keyword] : 0 
        score += count * weight
    })
    return score
}


async function update_dataset(item, maxDiff) {
    console.log('update dataset')
    console.log(item)
    const key =  keyPrefix + item.startUrl.replace(/[^\w\s]/gi, '')
    const current = await Apify.getValue(key)

    // list all the records that are within 5 points of the highest score
    if(current == null){
        console.log(item)
        Apify.setValue(key, [item])
    }
    else {
        const newValue = []
        var max = item.result.score
        current.forEach(record => {
            if (max - record.result.score <= maxDiff){
                newValue.push(record)
            }
            if(record.result.score > max){
                max = record.result.score
            }
        }) 
        // the list will only have updated if this item is the new max score               
        if (max - item.result.score <= maxDiff){
            newValue.push(item)
            console.log(newValue)
            Apify.setValue(key, newValue)
        }

    }
}

Apify.main(async () => {
    const input = await Apify.getInput();
    console.log('Input:');
    console.dir(input);

    const {
        linkSelector,
        caseSensitive = false,
        scanScripts = false,
        maxConcurrency,
        minScore = 4,
        maxDepth = 5,
        maxPagesPerCrawl,
        useBrowser = false,
        proxyConfiguration = { useApifyProxy: true },
        retireInstanceAfterRequestCount = 10,
        useChrome = false,
        waitFor,
    } = input;

    const keywordObjects = input.keywords
    const requestsFromUrls = input.startUrls
    const keywords = keywordObjects.map((keyword) => {
        return keyword.keyword
    })
    const requestList = await Apify.openRequestList('my-request-list', requestsFromUrls);
    let startUrls = []
    while(!await requestList.isEmpty()){
        let url = await requestList.fetchNextRequest()
        console.log(url)
        startUrls.push({'url': url.url})
    }

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
        let startTime = Date.now()
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
        let timeTook = Date.now() - startTime
        total_sleep += timeTook
        console.log('sleep took ' + String(timeTook / 1000) + ' seconds')
        startTime = Date.now()

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

        result['score'] = get_correlation_score(result, keywordObjects)

        // if there is no correleation, push the data but note it isnt finalized
        await Apify.pushData({
                url: request.url,
                startUrl,
                result,
                final: 0
            })
        if (result['score'] >= minScore) {
            await update_dataset({
                url: request.url,
                startUrl,
                result,
            }, minScore);
        }

        if (depth >= maxDepth) {
            console.log('Reached max depth, not enqueing more ---', request.url);
        }

        if (!request.url.match(/\.pdf/)){
            if (!$) {
                const html = await page.content();
                $ = cheerio.load(html);
            }
            if (linkSelector) {
                console.log('enqueuing links')
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
        timeTook = Date.now() - startTime
        total_processing += timeTook
        console.log('processing took ' + String(timeTook / 1000) + ' seconds')

        // if requests are taking too long, url might be overloaded so give it a longer break
        if (timeTook > 5000){
            await Apify.sleep(5000)
        }
    };

    const additionalMimeTypes = ['application/pdf']
    

    const launchContext = {
        stealth: true,
        useChrome
    };

    // creates a separate crawler for each LEA to run concurrently
    const pool = new Apify.AutoscaledPool({
        runTaskFunction: async () => {
            
            // get a URL from the LEA url list
            const source = startUrls.pop()

            // create a request queue for the current LEA
            requestQueues[source.url] = await Apify.openRequestQueue((Math.random() + 1).toString(36).substring(7));
            const req = {
                    ...source,
                    userData: { depth: 0, startUrl: source.url},
                };
            await requestQueues[source.url].addRequest(req)

            // create the crawler for this LEA
            const basicOptions = {
                maxRequestRetries: 1,
                maxRequestsPerCrawl: maxPagesPerCrawl,
                requestQueue: requestQueues[source.url],
                maxConcurrency: 1,
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

        // if there are any more LEAs left to crawl, spin up another crawler
        isTaskReadyFunction: async () => {
            return startUrls.length > 0
        },
        isFinishedFunction: async () => {
        return startUrls.length < 1
        },
    });

    await pool.run();

    
    // convert the key store into a dataset
    const keyValueStore = await Apify.openKeyValueStore();
    await keyValueStore.forEachKey(async (key, index, info) => {
        // input and output are in the key valure store, ignore them
        console.log(key)
        if(key.includes(keyPrefix)){
            const records = await keyValueStore.getValue(key)
            console.log(records)
            await Promise.all(records.map(async (record) => {
                console.log("record --------------- ")
                console.log(record)
                await Apify.pushData({...record, final: 1})
                console.log('done')
            }))
        }
    });
    console.log('total processing: ' + String(total_processing / 1000))
    console.log('total sleep: ' + String(total_sleep / 1000))



});