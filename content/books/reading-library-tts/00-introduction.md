# The Library That Reads to You

There's a particular kind of guilt that accumulates in browser tabs. Each one represents an article someone recommended, a newsletter that looked interesting, a long-form piece that demands more attention than a quick scroll can provide. The tabs multiply. Some stay open for weeks. Most eventually close, unread, when the browser crashes or the shame becomes unbearable.

This pattern has repeated itself for as long as the web has existed. The solutions that emerged—bookmarks, read-it-later apps, RSS readers—all promised to solve the problem. Some did, for a while. But they all shared a fundamental assumption: that reading happens when you're sitting in front of a screen with time and attention to spare. That assumption has become increasingly divorced from how most people actually live.

The secret that changed everything for me was simple: most of my potential reading time isn't reading time at all. It's commuting time, cooking time, walking the dog time, doing laundry time. My eyes are occupied, but my ears are free. The twenty-minute newsletter becomes a companion during the morning run. The backlog of Substack posts becomes a podcast feed during the evening commute.

Text-to-speech has crossed a threshold that makes this possible. The robotic voices of a decade ago have given way to neural networks trained on thousands of hours of human speech. ElevenLabs, founded in 2022, reached a billion-dollar valuation by 2024 because they cracked the problem of making synthesized speech sound genuinely human. Speechify built an empire on the same insight applied to accessibility and education. Even browser-native speech synthesis has improved dramatically, especially on Apple devices with premium voices that sound startlingly natural.

But getting content into a TTS-friendly format remains harder than it should be. Web pages are polluted with navigation menus, newsletter signup forms, related article links, and the endless detritus of engagement optimization. Feed that to a text-to-speech engine and you get garbage audio—your relaxing article interrupted by someone reading aloud a cookie consent banner.

A personal reading library solves this problem by extracting just the content you care about, cleaning it thoroughly, and presenting it in formats optimized for both reading and listening. The same article that exists as a cluttered web page becomes clean text flowing through your earbuds.

The death of Google Reader in 2013 marked a turning point for how we think about personal content management. Google's shutdown wasn't driven by declining usage—internal sources suggest the product was successful and growing. It was sacrificed to push users toward Google Plus, and when it died, it took much of the RSS ecosystem with it. Mozilla removed RSS support from Firefox in 2018. Apple stopped providing RSS for Apple News in 2019. The open web gave way to algorithmic feeds owned by platforms.

But RSS never actually died. It persisted in the background, stubbornly refusing to disappear despite every obituary written for it. Substack, the platform that revitalized long-form newsletters, exposes RSS feeds for every publication. WordPress sites have had RSS for decades. The feeds still work, even if they're no longer advertised. And a new generation of tools—Feedly, NewsBlur, Readwise Reader—has emerged to serve people who want to control their information diet rather than surrender it to algorithms.

Pocket, one of the original read-it-later services, announced it would shut down in July 2025. Another reminder that building on platforms means accepting their timeline. When you build your own reading library, you own it. No subscription fees. No service shutdown announcements. No pivot to AI that deprecates the features you actually use.

Vibe coding makes building such a tool feasible for anyone with a clear vision of what they want. The components are well-documented: RSS parsing libraries, content extraction algorithms, database patterns for content storage, web APIs for text-to-speech integration. What previously required weeks of development compresses into sessions measured in hours. You describe the feature you want, see it materialize, refine it until it works.

The techniques that emerged from building a personal reading library with AI assistance reveal patterns that apply far beyond this specific project. There's something clarifying about building tools for yourself—you know exactly what success looks like because you're the user. The feedback loop tightens to nothing. You save an article, read it, notice something that annoys you, fix it immediately, and move on.

This book documents that process. Not as a tutorial to copy step by step, but as a map of the territory. The specific technologies matter less than the patterns: how to approach content extraction, what makes typography readable, how offline synchronization actually works, why certain TTS approaches succeed where others fail. The implementation details belong to your sessions with Claude. The concepts belong here.

By the end, you'll understand how to build a complete personal reading library: content discovery through RSS feeds, article extraction and cleaning, a reader interface with proper typography, text-to-speech integration that actually sounds good, organization through tags and reading lists, and deployment patterns that let you access your library from anywhere. More importantly, you'll understand the vibe coding techniques that make building such systems practical—the prompts that work, the patterns that emerge, the approach to iteration that turns vague ideas into working software.

The browser tabs will still accumulate. But now they'll have somewhere to go.
