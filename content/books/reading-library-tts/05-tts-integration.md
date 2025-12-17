# When Words Become Sound

The breakthrough that transformed my reading library from useful to indispensable was adding text-to-speech. Not as a secondary feature or accessibility accommodation, but as a primary mode of consuming content. The articles I never had time to read became the articles I listened to during commutes, workouts, and household chores.

Text-to-speech technology has undergone a revolution that most people haven't fully registered. The robotic voices of a decade ago—the ones that mispronounced common words and paused in strange places—have given way to neural network-generated speech that sounds remarkably human. ElevenLabs, founded in 2022, demonstrated what was possible and reached a billion-dollar valuation by 2024. Speechify built a successful business on making TTS accessible for education and accessibility use cases. The technology crossed a threshold from curiosity to utility.

Even browser-native speech synthesis has improved dramatically. The Web Speech API, supported in all modern browsers, provides access to high-quality voices without external services. Apple devices include premium voices that sound nearly indistinguishable from human speech. The quality varies by operating system and browser, but the worst modern TTS is better than the best TTS was five years ago.

Integrating TTS into a reading library involves solving several distinct problems. First, getting the text into a format suitable for speech. Second, actually generating the audio. Third, building player controls that work naturally. Fourth, tracking position so listeners can pause and resume. Each problem has subtleties that become apparent only through use.

The text preparation problem turned out to be harder than expected. Content that reads well doesn't necessarily listen well. URLs are unpronounceable garbage when spoken aloud—hearing someone say h-t-t-p-s colon slash slash destroys any listening flow. Code blocks that make sense visually become incomprehensible when read sequentially. Embedded tweets and pull quotes that duplicate article content cause the same passage to be read twice.

The solution was maintaining separate text versions optimized for different purposes. The display version keeps all the visual elements that aid comprehension when reading. The TTS version strips aggressively: remove URLs, remove code blocks, remove redundant pull quotes, collapse excessive whitespace. The cleaning function became one of the most-revised pieces of code as edge cases emerged through actual listening.

The Web Speech API provides the simplest path to TTS integration. A few lines of JavaScript create an utterance, assign it a voice, and speak it. The API handles the conversion from text to audio. The browser manages the speech synthesis. For basic functionality, this approach works immediately.

Complications emerge with longer content. The Web Speech API in most browsers has quirks with extended text—some browsers stop speaking after fifteen seconds of continuous output. The workaround is chunking: break the text into segments, speak each segment sequentially, and manage the transitions between segments so they sound continuous.

The chunking strategy matters more than it might seem. Breaking mid-sentence creates awkward pauses that disrupt comprehension. Breaking at sentence boundaries sounds natural but can create very long chunks if sentences are complex. The approach that worked best was preferring sentence boundaries while enforcing a maximum chunk size, splitting mid-sentence only when necessary.

Voice selection significantly affects the listening experience. Each browser exposes different voices depending on the operating system. macOS includes high-quality voices developed by Apple. Windows has its own voice collection. Linux varies by distribution. Mobile browsers have different voice selections than desktop browsers. The library should discover available voices, filter to those with acceptable quality, and let users choose their preference.

Finding high-quality voices programmatically requires heuristics. Voice names that include words like "enhanced" or "premium" often indicate better quality. Voices marked as "local" rather than "network" avoid latency issues. The recommended voice selection function tries these heuristics, falling back to the first available English voice if nothing better is found.

Playback controls mirror what users expect from audio applications. Play and pause are obvious. Speed adjustment lets listeners compress or expand listening time—many people prefer 1.5x or 2x speed once they're accustomed to a voice. Skip forward and back by fixed intervals helps when attention wanders or something needs repeating. A progress indicator shows position through the content.

Position tracking for TTS differs from position tracking for reading. Scroll position measures visual progress through the document. Audio position measures progress through the text, which doesn't map directly to scroll position because text density varies. The library tracks both separately, restoring whichever is relevant when the user returns.

The hybrid approach that proved most valuable lets users switch between reading and listening within the same article. Start reading at your desk. Reach a good stopping point, switch to audio, and continue from where you were during the commute home. Return to reading that evening, picking up where the audio left off. This fluid transition between modalities is where the library stops feeling like software and starts feeling like a reading companion.

Premium TTS services offer substantially better voice quality than browser-native options. ElevenLabs provides voices that are nearly indistinguishable from human narration. Speechify's voices are optimized for extended listening. These services aren't free—they charge per character or per minute of generated audio—but for content you'll actually listen to, the quality improvement is worth considering.

Integrating premium services follows a different pattern than browser-native TTS. Instead of generating speech on the client, you send text to an API and receive audio back. This audio can be streamed for immediate playback or cached for offline listening. The network round-trip adds latency that browser-native TTS avoids, but the quality makes it worthwhile for content you care about.

The architecture that emerged supports both approaches. Browser-native TTS is the default, free, and works offline. Premium TTS is available when configured, used for content where quality matters. The user can choose per-article or set a default preference. This flexibility lets users optimize their own cost-quality tradeoff.

Server-side audio generation enables features that client-side TTS cannot. Generate the audio once, cache it, and serve the same audio to multiple playback sessions without regenerating. Convert articles to MP3 files that can be downloaded and played in any audio app. Pre-generate audio during off-peak hours so it's ready when users want to listen. These capabilities require more infrastructure but unlock workflows that pure client-side TTS cannot support.

The vibe coding technique for TTS integration involved describing the listening experience rather than the technical implementation. What happens when someone presses play? How does seeking work? What should the controls look like? Claude generates the speech synthesis code, the chunking logic, the player component. The iteration process involves actually listening to articles, noticing where the experience breaks, and describing what should be different.

Testing TTS is inherently subjective. Does the voice sound good? Are the pauses in the right places? Does the chunking cause noticeable breaks? These questions require human judgment. Automated tests can verify that chunking produces the expected number of segments or that the player component renders correctly, but they can't assess whether the listening experience is pleasant.

Edge cases in TTS reveal themselves through use. Abbreviations that should be expanded. Acronyms that should be spelled out. Numbers that should be spoken as words versus digits. Punctuation that affects pronunciation in unexpected ways. Each edge case requires adjustment to the text cleaning pipeline, accumulating handling for the specific patterns that appear in the content you actually consume.

The result is a reading library that reads to you. Not as a gimmick or accessibility feature, but as a genuine alternative to visual reading. The articles you saved but never read become the content you consume while doing other things. The reading backlog transforms from guilt to opportunity.
