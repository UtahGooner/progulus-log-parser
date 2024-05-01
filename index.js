import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import numeral from 'numeral';

const parseRegex = /^(\S*).*\[(.*)\]\s"(\S*)\s(\S*)\s([^"]*)"\s(\S*)\s(\S*)\s"([^"]*)"\s"([^"]*)"$/;
const botRegex = /bot|spider|facebookexternalhit|crawl/i;
const logFile = "access.log";

const knownBots = [
    'AdsBot-Google',
    'AhrefsBot/',
    'Amazonbot/',
    'AntBot',
    'Applebot/',
    'Ask Jeeves',
    'BLEXBot/',
    'Baiduspider',
    'Barkrowler/',
    'Bytespider',
    'CCBot/',
    'CheckMarkNetwork/',
    'ClaudeBot',
    'DataForSeoBot/',
    'DotBot/',
    'DuckDuckBot',
    'DuckDuckGo-Favicons-Bot/',
    'Exabot',
    'FAST Enterprise Crawler',
    'FAST-WebCrawler/',
    'Feedfetcher-Google',
    'FriendlyCrawler/',
    'GPTBot/',
    'Gigabot/',
    'Google Desktop',
    'Google-Adwords-Instant',
    'Googlebot',
    'ICCrawler - ICjobs',
    'MJ12bot/',
    'Mediapartners-Google',
    'MetagerBot/',
    'MojeekBot/',
    'PetalBot',
    'SEO search Crawler/',
    'SEOkicks',
    'SEOsearch/',
    'Scooter/',
    'SeekportBot',
    'SemrushBot/',
    'Sensis Web Crawler',
    'Seoma [SEO Crawler]',
    'SeznamBot/',
    'Snappy/1.1 ( http://www.urltrends.com/ )',
    'Sogou web spider/',
    'TurnitinBot/',
    'W3 SiteSearch Crawler',
    'W3C-checklink/',
    'W3C_Validator',
    'Yahoo! DE Slurp',
    'Yahoo! Slurp',
    'Yahoo-MMCrawler/',
    'YahooSeeker/',
    'YandexBot/',
    'YandexImageResizer/',
    'YandexImages/',
    'Yeti/',
    'ZoominfoBot',
    'bingbot/',
    'coccocbot-image/',
    'crawleradmin.t-info@telekom.de',
    'fidget-spinner-bot',
    'heise-IT-Markt-Crawler',
    'heritrix/1.',
    'http://lucene.apache.org/nutch/',
    'http://www.neomo.de/',
    'http://www.tkl.iis.u-tokyo.ac.jp/~crawler/',
    'ia_archiver',
    'ibm.com/cs/crawler',
    'ichiro/2',
    'msnbot-NewsBlogs/',
    'msnbot-media/',
    'msnbot/',
    'online link validator',
    'psbot/0',
    'serpstatbot/',
    'thesis-research-bot',
    'voyager/',
    'yacybot',
    'facebookexternalhit/',
    'YandexRenderResourcesBot/'
].map(bot => bot.toLowerCase()).sort();

async function checkFileExists() {
    try {
        const stats = await fsPromises.stat(logFile);
        return stats.isFile();
    } catch (err) {
        if (err instanceof Error) {
            console.debug("checkFileExists()", err.message);
            return Promise.reject(err);
        }
        console.debug("checkFileExists()", err);
        return Promise.reject(new Error('Error in checkFileExists()'));
    }
}

const bots = {};
const userAgents = {};

async function parseLogFile() {
    try {
        let lines = 0;
        const stream = fs.createReadStream(logFile);
        stream.on('end', () => {
            console.log('end of log file');
            stream.close();
        })
        stream.on('error', (err) => {
            if (err instanceof Error) {
                console.error('parseLogFile', err.message);
                stream.close();
            }
        })
        stream.on('data', (chunk) => {
            const data = Buffer.from(chunk, 'utf8').toString('utf8');
            data.split('\n').forEach(row => {
                lines += 1;
                if (parseRegex.test(row)) {
                    const parts = parseRegex.exec(row);
                    const userAgent = parts[9] ?? null;
                    if (userAgent) {
                        if (botRegex.test(userAgent)) {
                            const date = parts[2];
                            if (!bots[userAgent]) {
                                const known = knownBots.filter(bot => userAgent.toLowerCase().includes(bot)).length > 0;
                                bots[userAgent] = {count: 0, known, first: date, last: null};
                            }
                            bots[userAgent].count += 1;
                            bots[userAgent].last = date;
                        } else {
                            if (!userAgents[userAgent]) {
                                userAgents[userAgent] = 0;
                            }
                            userAgents[userAgent] += 1;
                        }
                    }
                }
                if (lines % 100000 === 0) {
                    console.log(
                        'lines parsed:', numeral(lines).format('0,0'),
                        '; bots:', numeral(Object.keys(bots).length).format('0,0'),
                    );
                }
            })
        })

        stream.on('close', async () => {
            console.log('lines parsed:', numeral(lines).format('0,0'));
            console.log('Bots found: ', Object.keys(bots).length);
            console.log('UserAgents found: ', Object.keys(userAgents).length);
            const _bots = Object.keys(bots)
                .map(key => ({userAgent: key, ...bots[key]}))
                .sort((a, b) => b.count - a.count);
            await fsPromises.writeFile('bots.txt', JSON.stringify(_bots, undefined, 2));
            await fsPromises.writeFile('user-agents.txt', JSON.stringify(Object.keys(userAgents).filter(key => userAgents[key] > 10).sort(), undefined, 2));
        })
    } catch (err) {
        if (err instanceof Error) {
            console.debug("parseLogFile()", err.message);
            return Promise.reject(err);
        }
        console.debug("parseLogFile()", err);
        return Promise.reject(new Error('Error in parseLogFile()'));
    }
}

checkFileExists().catch(err => {
    console.log(err.message);
})

parseLogFile()
    .catch(err => {
        console.log(err.message);
    })


