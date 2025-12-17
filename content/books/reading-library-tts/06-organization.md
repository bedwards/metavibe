# Taming the Infinite Inbox

A reading library grows quickly. Subscribe to ten feeds and you'll have hundreds of articles within weeks. Without organization, finding that article you half-remember becomes impossible. The reading list transforms from opportunity into overwhelming obligation.

Organization is the difference between a tool you use and a tool you abandon. The best organizational systems share a quality: they impose just enough structure to enable finding things without demanding so much effort that the organization itself becomes a burden. Too simple and you can't find anything. Too complex and you stop organizing.

Tags emerged as the primary organizational mechanism. A tag is just a name attached to articles that share something in common. Technology articles. Articles about writing. Articles to reference later. The specific tags don't matter—what matters is that they make sense to you and that applying them takes minimal effort.

The tagging interface needed to prioritize speed over comprehensiveness. When you save an article, a small tag selector lets you add existing tags or create new ones. The selector should autocomplete based on your existing tags, making common categorization a single keystroke. New tags create instantly without navigating away from the article.

Colors for tags seem trivial but significantly improve scanning. A colored dot next to each tag provides visual grouping that plain text cannot. The colors can be chosen explicitly or generated automatically from the tag name—a hash function that maps strings to hues produces consistent, distinguishable colors without requiring selection.

AI-assisted tagging proved more useful than expected. Claude can read article content and suggest appropriate tags from your existing collection. The suggestions aren't always right, but they're right often enough to speed up organization. A button to request suggestions, a list of recommended tags, checkboxes to accept or reject—the interface makes human judgment fast while letting AI do the initial categorization.

The vibe coding approach to building the tag service was describing the operations needed: create a tag, list all tags with usage counts, add tags to articles, remove tags from articles. Claude generates the database queries and API endpoints. The frontend components for tag management follow from describing how users interact with tags—selecting them, creating them, seeing which articles have which tags.

Reading lists provide a different organizational model than tags. Where tags categorize articles by content, reading lists curate articles for a purpose. The distinction matters. An article might be tagged "technology" and "business" based on what it contains. The same article might be added to a "Present to the team" reading list based on how you plan to use it.

Reading lists can be ordered. Tags typically appear alphabetically or by usage frequency, but reading lists let you sequence articles deliberately. The first article in the list is the one to read first. Drag-and-drop reordering makes sequencing intuitive. The position persists across sessions.

Combining tags and reading lists provides powerful filtering. Show articles with this tag that are also in this reading list. Show unread articles tagged for research. Show everything saved this week that matches a search query. The combinations emerge from the relational database structure—joins and filters compose naturally.

Full-text search transforms a growing library from burden to asset. PostgreSQL includes sophisticated full-text search capabilities that handle the vast majority of search needs without external search services. Articles become searchable by title and content. Searches return ranked results with matching excerpts highlighted.

The vibe coding technique for search involved describing the user experience: type a query, see matching articles ranked by relevance, show which part of each article matched. Claude generates the SQL that creates text search indexes, ranks results, and generates highlighted excerpts. The complexity hides behind a simple interface.

Search suggestions make finding specific articles faster. As users type, potential completions appear based on article titles. Selecting a suggestion navigates directly to that article. This typeahead functionality requires querying the database with partial strings, which PostgreSQL handles efficiently with the right indexes.

Related articles emerged as an unexpected discovery feature. Given an article you're reading, which other articles discuss similar topics? Full-text search can answer this by extracting keywords from the current article and searching for matches. The feature surfaces connections you might not have remembered making.

Archive functionality keeps the library clean without losing content. Archiving an article removes it from the default view—you won't see it in the unread list or when browsing feeds. But the article remains searchable and accessible. This differs from deletion, which removes the article permanently. Archive for things you're done with but might want to find later. Delete for things that should never have been saved.

Favorites mark articles for easy access. Unlike tags, which require naming a category, favoriting is a single action with no decision beyond "I want to find this easily." The favorites list becomes a personal best-of collection, curated through the simple act of pressing a button.

Filtering controls let users slice the library by multiple dimensions simultaneously. Show only unread articles. Show only favorites. Show only articles from a specific feed. Combine these with tag filters and search queries to find exactly what you're looking for. The filter interface needs to be discoverable without being overwhelming—sensible defaults with the ability to customize.

The organization features compound in value as the library grows. A library with fifty articles doesn't need sophisticated organization. A library with five thousand articles is unusable without it. Building organization features early means they're available when needed, rather than scrambling to add them after the library becomes unmanageable.

Testing organization features requires realistic data. A single article shows whether the tag selector renders correctly. A thousand articles reveal whether the full-text search returns results quickly enough. Testing at scale caught performance problems that didn't appear with small datasets—queries that executed instantly with a hundred articles took seconds with ten thousand.

The organization layer sits between raw content and human attention. It transforms an undifferentiated stream of articles into a structured collection that respects how you want to engage with content. Getting organization right means the library grows without becoming overwhelming. The oldest articles remain as findable as the newest ones.
