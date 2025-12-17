# Extracting the Signal from the Noise

The modern web page is a hostile environment for reading. The article you want to read occupies perhaps forty percent of the screen, surrounded by navigation bars, newsletter signup forms, related article recommendations, social sharing widgets, comment sections, cookie consent banners, and advertisements that shift the layout as they load. This is not an accident. Every element exists because someone decided it served the business. The reader's experience is, at best, a secondary concern.

Content extraction is the art of finding the article within the page and discarding everything else. This turns out to be surprisingly difficult. There's no standard way to mark article content in HTML. Different websites use different element structures. Some wrap articles in article tags. Others use divs with class names like content or post-body. Some sites place the headline in an h1 element. Others use h2, or a div with a class that suggests heading-ness.

The algorithms that work best for content extraction use heuristics rather than rules. They look at the density of text versus HTML. They examine the structure of the page to find the largest continuous block of content. They identify patterns that suggest navigation or footer content and exclude those regions. Mozilla's Readability library, which powers Firefox's reader mode, has accumulated years of these heuristics and handles the majority of web pages correctly.

Using Readability from a vibe coding session is straightforward: describe wanting to extract article content from HTML, and Claude will generate code that imports the library and applies it. The result includes the cleaned HTML, the plain text, the title, the byline, and an estimated word count. Most of the time this just works.

Complications emerge with real-world feeds. Some sites load content dynamically with JavaScript, meaning the initial HTML contains none of the article text. Others embed content in iframes. Some use non-standard markup that confuses the extraction algorithms. These cases require individual attention—either fetching the page with a headless browser that executes JavaScript, or writing site-specific extraction rules.

The vibe coding technique for handling extraction failures was building a fallback chain. First try Readability. If that produces suspiciously short content, try an alternative extraction approach. If everything fails, store the raw HTML and flag the article for manual review. This defensive approach means the library continues to function even when individual articles fail to extract correctly.

Text cleaning goes beyond content extraction. The extracted HTML often contains elements that make sense visually but not when read aloud. Embedded tweets. Figure captions. Pull quotes that duplicate text from the article. Image descriptions that interrupt the flow. Cleaning this content for text-to-speech requires different rules than cleaning for display.

The approach that worked best was maintaining two versions of the cleaned content. The display version keeps visual elements that aid comprehension. The TTS version strips them aggressively. When you read an article, you see the version with images and pull quotes. When you listen to it, you hear just the prose. This dual-track approach emerged from using the library and noticing where the TTS experience suffered.

HTML sanitization addresses security concerns that casual developers often overlook. Extracted content might contain scripts, event handlers, or other potentially dangerous elements. Even without malicious intent, inline styles and data attributes clutter the content unnecessarily. A sanitization layer strips everything except the tags and attributes necessary for displaying text content: paragraphs, headings, links, images, lists, and basic formatting.

The allowed tags list started minimal and grew as needs emerged. Paragraph and heading elements obviously. Links to let readers follow references. Images to understand visual content. Lists for structured information. Block quotes for citations. Code elements for technical articles. Tables for structured data. Each addition came from encountering a real article that looked wrong without that element.

Links deserve special handling. In the browser, links open in new tabs to avoid navigating away from the reading experience. Links in TTS should probably not be spoken at all—hearing someone say h-t-t-p-s colon slash slash destroys the listening experience. The cleaning function for TTS strips URLs entirely, relying on the reader to check the display version if they want to follow references.

Reading time estimation uses a simple calculation: divide word count by typical reading speed, round to the nearest minute. This seems trivial until you consider that reading speed varies dramatically. Research suggests average adult reading speed around 250 words per minute, but actual speed depends on content complexity, reader familiarity with the subject, and the reading environment. Rather than optimizing for accuracy, the estimate provides a useful heuristic. A five-minute article versus a thirty-minute article helps you decide whether you have time to read it now.

Listening time differs from reading time. People comprehend spoken content at different rates than written content. The typical TTS playback speed of one-x matches roughly 150 words per minute, but many listeners prefer faster speeds—1.5x or 2x—which compress listening time proportionally. The library tracks listening time separately, adjusting based on the user's preferred playback speed.

Metadata extraction complements content extraction. Author names appear in bylines, meta tags, or JSON-LD structured data. Publication dates appear in various formats across different sites. Featured images appear in og:image meta tags or as the first image in the content. The extraction layer captures this metadata when available, falling back to sensible defaults when not.

The vibe coding approach to metadata extraction worked well because the patterns are documented but tedious to implement. Open Graph tags follow a standard format. JSON-LD uses a known schema. Time elements have predictable datetime attributes. Describing these patterns and asking Claude to generate extraction code produces comprehensive coverage without manually writing every case.

URL normalization prevents duplicate articles from accumulating. The same article might be shared with different tracking parameters—utm_source, utm_medium, and friends. The same article might appear at both www and non-www versions of a domain. The same article might use http and https protocols. Normalizing URLs before storing them ensures that different versions of the same link don't create duplicate entries.

The technique for URL normalization started simple and grew more sophisticated through use. Strip tracking parameters. Lowercase the hostname. Remove trailing slashes. Handle the edge cases as they appear—some sites include session identifiers in URLs, some use fragment identifiers for tracking. Each edge case gets handled when it causes a duplicate, not preemptively.

Content deduplication extends beyond URL matching. Sometimes the same article appears at multiple URLs—syndicated across sites, reposted under different URLs, or moved during site restructuring. Content fingerprinting catches these cases by hashing a sample of the article text. Two articles with the same fingerprint are probably the same article, regardless of their URLs.

The fingerprinting algorithm doesn't need to be cryptographically secure or perfectly accurate. It needs to catch obvious duplicates without generating false positives. Hashing the first thousand characters of normalized text—lowercase, whitespace collapsed, punctuation stripped—works well enough for practical use.

The article service ties all these pieces together into a coherent workflow. Receive a URL. Check if we already have it. Fetch the page. Extract content. Clean the HTML. Generate plain text. Calculate reading time. Store everything. The service provides a clean interface that hides the complexity: give it a URL, get back an article.

Manual article saving adds another path into the library. Beyond subscribed feeds, users want to save arbitrary URLs—articles shared on social media, links from email newsletters, pages discovered while browsing. This save functionality triggers the same extraction pipeline as feed processing, but initiated by user action rather than scheduled fetching.

The bookmarklet approach provides one-click saving without browser extension complexity. A bookmarklet is a small piece of JavaScript that lives in the browser's bookmarks bar. Click it, and it sends the current page URL to your library's API. The library handles extraction on the server side. This approach works in any browser without installation.

Vibe coding the bookmarklet involved describing the user experience: capture the current URL, send it to a specific endpoint, show a confirmation. Claude generated the minified JavaScript suitable for a bookmarklet. The result is ten lines of code that provides one-click article saving from any browser.

Error handling during extraction follows the same philosophy as error handling during feed fetching: don't fail completely, don't lose data, flag problems for investigation. If Readability throws an exception, catch it, store what information you have, mark the article as needing review. The library should continue functioning even when individual extractions fail.

Testing extraction is inherently fuzzy. Unlike unit tests with deterministic inputs and outputs, content extraction produces results that are correct in degree rather than absolutely. This article extracted perfectly. That article extracted mostly correctly but lost a sidebar quote. Another article failed completely. Testing focuses on the important cases: does extraction work for the sources you actually read? Capture real articles from your feeds, verify they extract correctly, and add regression tests for articles that revealed bugs.

The extraction pipeline transforms the chaos of the web into clean, structured content ready for reading and listening. Getting this right determines whether the library feels magical or frustrating. When extraction works, you forget it exists—you just read the articles. When extraction fails, every failure interrupts your reading flow and reminds you that you're using software rather than a library.
