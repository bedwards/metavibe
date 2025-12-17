# Typography That Disappears

Good reading typography is invisible. You notice it only when it fails—when your eyes strain after twenty minutes, when you lose your place at the end of each line, when the spacing feels cramped or wasteful. The best reader interfaces create the sensation that you're reading a well-printed book, not staring at a glowing rectangle.

Typography for screens has matured dramatically since the early web. We've moved from the Times New Roman versus Arial debates of the nineties through the web font revolution of the 2010s to today, where system font stacks provide beautiful, fast-loading typography without external dependencies. The techniques that seemed like professional secrets a decade ago are now best practices anyone can apply.

The foundation is the font stack. A well-constructed font stack specifies your preferred fonts in order, falling back gracefully when fonts aren't available. For reading, serif fonts generally outperform sans-serif—the serifs guide the eye along the baseline, reducing cognitive load over extended reading sessions. But the specific fonts matter less than consistency. Pick a stack and apply it everywhere.

The vibe coding approach to typography worked surprisingly well. Describe the reading experience you want: a clean, book-like presentation with generous line height, optimal line length, and subtle color that's easy on the eyes. Claude generates CSS that implements these principles. The first iteration is usually close; refinement through use produces excellent results.

Line length deserves particular attention because it affects reading comprehension more than most people realize. Research consistently shows optimal reading at fifty to seventy-five characters per line. Too short and the eye makes excessive movements. Too long and readers lose their place moving to the next line. The magic number that emerged from my testing was sixty-five characters, achieved by constraining the content width using the ch unit that represents the width of the zero character.

Line height complements line length. Dense text with minimal spacing creates the cramped feeling of a technical manual. Text with too much spacing feels airy and disconnected. The sweet spot for body text falls around 1.6 to 1.8 times the font size. I settled on 1.7 after comparing against actual books I enjoy reading.

Font size on screens requires thinking differently than font size in print. A sixteen-pixel font that's perfectly readable in a code editor feels cramped when reading long-form prose. Eighteen pixels became my baseline, with user settings allowing adjustment up or down. The human eye varies, and letting readers customize prevents the font size from becoming a barrier to using the library.

Color choices affect both aesthetics and eye strain. Pure black text on pure white backgrounds creates harsh contrast that fatigues eyes over extended reading. The trick is softening both: off-white backgrounds with very dark gray text. The difference is subtle—most people don't consciously notice—but the cumulative effect over an hour of reading is significant.

Dark mode is no longer optional. Many readers prefer dark backgrounds, whether for aesthetic preference or genuine light sensitivity. Supporting both light and dark modes means defining colors as CSS custom properties that change based on a theme attribute or media query. The system preference detection uses the prefers-color-scheme media query, which respects the user's operating system settings automatically.

The approach that worked best was providing three options: light, dark, and system. System mode follows the OS setting, automatically switching when the user's device switches. Explicit light and dark modes let users override the system when they have a specific preference. This three-way toggle handles every reasonable user expectation.

The reader view itself combines the typography choices into a focused reading environment. The article title displays prominently at the top. Metadata—author, publication date, estimated reading time—appears below in secondary styling. The article content fills the central column. Footer elements provide actions like favoriting, archiving, or viewing the original.

Progress tracking transformed how I used the library. Knowing where you stopped reading, and being able to resume from that point, turns occasional reading into a continuous experience. The implementation tracks scroll position as a percentage of document height, saves it periodically while reading, and restores it when reopening the article.

The scroll tracking technique required careful design to avoid performance problems. Scroll events fire frequently—potentially hundreds of times during normal reading. Saving to the server on every scroll event would overwhelm both the browser and the API. Instead, debouncing the save operation ensures it only fires after scrolling stops for a moment. The position updates in memory immediately but only persists after a pause.

Marking articles as read happens automatically when the reader scrolls past a threshold—I use ninety percent of the article. This eliminates the tedious step of manually marking things read while still preserving accuracy. If you opened an article and closed it immediately, it stays unread. If you read through to the end, it marks itself read.

The article list view serves as the library's front door. It shows available articles with enough information to make reading decisions: title, excerpt, author, publication date, estimated reading time. Unread articles appear more prominent than read ones. Filters let users focus on unread items, favorites, or specific feeds.

Infinite scrolling proved more appropriate than pagination for article lists. Unlike pagination, which forces users to make navigation decisions, infinite scrolling lets users simply continue browsing. As they approach the bottom, more articles load automatically. This feels more natural for a reading queue than explicit page navigation.

The list-detail navigation pattern that emerged matches how people actually read. Browse the list, tap an article, read it, go back to the list. The browser's history API supports this without full page reloads—navigation feels instant because only the content changes, not the entire page.

Reader settings let users customize their experience beyond the defaults. Font size adjustment helps users with different vision needs. Font family choice between serif and sans-serif respects personal preference. Line height adjustment accommodates different reading styles. Theme selection provides explicit control over light and dark modes.

Settings persistence uses local storage, the simplest approach that actually works. Values save immediately when changed. They load when the application starts and apply before the page renders, preventing the flash of unstyled content that occurs when settings apply after the page is already visible.

The vibe coding technique for building the reader interface was describing the user experience rather than the implementation details. What should happen when someone opens an article? What should they see? How should navigation work? Claude generates the component structure and state management to make that experience happen. The iteration process involves using the reader, noticing friction, describing what should be different, and regenerating.

Testing the reader interface is mostly visual verification. Does the typography look good at different screen sizes? Does dark mode contrast appropriately? Does the progress bar update smoothly while scrolling? These questions don't have automated test answers—they require human judgment informed by actually using the interface.

The mobile experience required specific attention. Touch targets need minimum sizes for reliable tapping. Text needs to remain readable without zooming. Progress indicators need to account for virtual keyboards that change available viewport height. These concerns don't affect desktop usage but determine whether mobile reading is pleasant or frustrating.

Accessibility considerations shaped several design decisions. Semantic HTML ensures screen readers can navigate the content. Sufficient color contrast helps users with visual impairments. Keyboard navigation allows readers who don't use mice. Focus indicators show where keyboard focus currently sits. These features benefit everyone while being essential for some users.

The reader interface is where users spend most of their time with the library. Getting it right—not just functional but genuinely pleasant to use—determines whether the library becomes a daily tool or an abandoned project. The investment in typography, smooth interactions, and customization options pays dividends every time you read an article.
