// TODO: Improve cleaning of extraction so we extract only from relevant text
// e.g. handle better iframes and nested stuff
module.exports.findKeywords = (pages, keywords) => {
    const isCaseInsensitive = true 

    const result = {};

    // Have to put this in for page.evaluate
    const createRegexes = (keywords, isCaseInsensitive) => {
        const regexArray = keywords.map((keyword) => {
            return {
                keyword,
                regex: new RegExp(`\\b${keyword}\\b`, isCaseInsensitive ? 'gi' : 'g'),
            };
        });
        return regexArray;
    };

    const regexes = createRegexes(keywords, isCaseInsensitive);

    pages.forEach( page => {
        regexes.forEach(({ keyword, regex }) => {
            const match = page.match(regex);
            if (match && match.length > 0) {
                // console.log(`Found count: ${match.length}, keyword: ${keyword} in text --> ${text}`);
                if (!result[keyword]) {
                    result[keyword] = 0;
                }
                result[keyword] += match.length;
            }
        })
    })
    return result;
}
