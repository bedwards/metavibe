# Introduction

## Why Build a Personal Reading Library?

The modern internet drowns us in content. RSS feeds, newsletters, Substack posts, blog articles—the firehose never stops. Yet the tools we have for reading this content are designed for skimming, not understanding.

Browser tabs accumulate. Bookmarks rot. Read-it-later apps become guilt-inducing graveyards of good intentions. The content we actually want to consume—thoughtful long-form writing—gets lost in the noise.

A personal reading library solves this differently. Instead of yet another inbox to manage, you build a curated collection. Content you've actively chosen to save, cleaned of ads and distractions, available offline, readable or listenable whenever you want.

## Why Text-to-Speech?

Here's a secret: most "reading" time isn't reading time. It's commuting, exercising, cooking, cleaning. Time when your eyes are occupied but your ears are free.

Text-to-speech transforms your reading library into an audio library. That 20-minute article becomes a podcast-length listen during your morning run. That newsletter backlog becomes your driving companion.

Modern TTS has crossed the uncanny valley. Services like Speechify, ElevenLabs, and even browser-native speech synthesis produce natural-sounding audio. The bottleneck isn't the technology—it's getting your content into a TTS-friendly format.

This is harder than it sounds. Web content is polluted with:

- Navigation menus and footers
- Subscription prompts and paywalls
- Social sharing widgets
- Related article links
- Inline ads and sponsored content

Feed all that to a TTS engine and you get garbage audio. Your personal reading library needs to extract the actual article content, clean it, and present it in a format that sounds good when spoken.

## Why RSS for Discovery?

RSS is the cockroach of the internet—it refuses to die. Despite Google Reader's shutdown, despite the social media pivot, despite everyone declaring it dead—RSS persists.

And it persists for good reason:

1. **No algorithm** - You see everything you subscribe to, in chronological order
2. **No account required** - Most feeds are public URLs
3. **Universal format** - Works with any content source that supports it
4. **Decentralized** - No single company controls the ecosystem

Substack, the newsletter platform that's revitalized long-form writing, exposes RSS feeds for every publication. WordPress sites have had RSS for decades. Many blogs still syndicate via RSS even if they don't advertise it.

Building on RSS means you're building on a stable foundation. The feeds will still work in five years. You can't say that about platform APIs.

## Why Vibe Code It?

You could use existing tools. Pocket, Instapaper, Feedly, Readwise—they all exist. Some even have TTS features. So why build your own?

**Control**. You control the reading experience. Typography, colors, spacing—tuned exactly to your preferences. No corporate design committee decided what's "best" for millions of users.

**Ownership**. Your library lives on your hardware. No subscription fees. No service shutdown. No "we're pivoting to AI" announcement that deprecates your workflow.

**Integration**. Connect to any TTS service. Export to any format. Build exactly the workflow you want, not the workflow someone's product team prioritized.

**Learning**. Building a reading library touches full-stack development: RSS parsing, web scraping, database design, clean typography, audio integration, API design. It's a complete education in practical software development.

And with vibe coding, you can build it in days, not months. Describe what you want. See it materialize. Iterate until it's right.

## What We're Building

By the end of this book, you'll have a complete personal reading library with:

**Content Discovery**
- RSS feed management
- Automatic feed fetching on schedule
- Support for Substack, blogs, and any RSS source

**Content Ingestion**
- Full article extraction from URLs
- HTML cleaning and sanitization
- Metadata extraction (author, date, reading time)
- Deduplication to avoid storing the same article twice

**Reader Interface**
- Clean, distraction-free reading view
- Customizable typography and themes
- Dark mode for night reading
- Reading progress tracking

**Text-to-Speech**
- Browser-native speech synthesis
- Integration with premium TTS services
- Audio playback controls
- Progress tracking for audio

**Organization**
- Tagging and categorization
- Full-text search
- Reading lists and queues
- Archive for completed articles

**Deployment**
- Self-hosting on your own hardware
- Cross-device sync
- Offline support
- Backup strategies

## The Technology Stack

We'll build with:

- **TypeScript** - Type safety for a robust application
- **Node.js + Express** - Simple, proven backend
- **PostgreSQL** - Reliable database for content storage
- **Vite** - Fast frontend tooling
- **RSS Parser** - Library for parsing RSS/Atom feeds
- **Readability** - Mozilla's algorithm for extracting article content
- **Web Speech API** - Browser-native TTS

This stack prioritizes simplicity and reliability over trendiness. Every component is battle-tested and well-documented.

## Prerequisites

To follow along, you should have:

- **TypeScript proficiency** - We won't explain basic syntax
- **Node.js experience** - Comfortable with npm and async/await
- **Basic database knowledge** - SQL fundamentals
- **An AI coding assistant** - Claude Code, Cursor, or similar

You don't need prior experience with:

- RSS parsing (we'll cover it)
- Web scraping (we'll cover it)
- TTS APIs (we'll cover it)
- Typography (we'll cover it)

## Let's Build

The best software solves your own problems first. A personal reading library scratches an itch we all have: too much content, too little time, and tools that don't respect how we actually consume information.

Let's build something better.
