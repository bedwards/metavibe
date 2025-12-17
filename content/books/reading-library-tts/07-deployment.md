# Your Library, Anywhere

A reading library that only works on one computer isn't much of a library. The value multiplies when you can access your content from anywhere—starting an article on the desktop, continuing on the phone during commute, finishing on a tablet before bed. Deployment choices determine whether this fluidity is possible.

Personal tools have unique deployment considerations that differ from typical web applications. There's exactly one user. There's no need for multi-tenancy, complex authentication, or horizontal scaling. The privacy of your reading habits matters—what you read is genuinely personal information. Offline access isn't optional; you read in subways, on airplanes, in areas with poor connectivity.

The simplest deployment is local only: the application runs on your computer, the database lives on your computer, everything stays private and under your control. This works perfectly for reading at home. It fails the moment you want to read somewhere else.

Self-hosted deployment on a personal server—a VPS from DigitalOcean, Linode, or Hetzner—extends access beyond your local machine. The application runs on the server, accessible from any device with an internet connection. Your reading library becomes available from your phone, your work computer, anywhere with a browser.

Docker simplifies server deployment dramatically. Package the application and its dependencies into a container, define the database in a Docker Compose file, and the entire system deploys with a single command. The same container that runs locally runs identically on the server. No hunting down dependency mismatches or configuration differences.

The vibe coding approach to containerization worked well. Describe wanting to package the application for deployment, specify that you want Docker Compose to include both the application and Postgres, mention that you need SSL and a reverse proxy. Claude generates the Dockerfile, the Compose configuration, the Nginx setup. The details of layer caching and multi-stage builds—optimizations that experienced developers know—appear automatically.

Authentication protects a publicly accessible library from unauthorized access. For a single-user application, complex authentication systems are overkill. API key authentication—a long random string that must be included in requests—provides adequate security with minimal complexity. Generate a key, store it as an environment variable, check it on every request.

HTTPS is not optional for a server-hosted library. Let's Encrypt provides free SSL certificates with automated renewal. Certbot integrates with Nginx to handle the certificate management. The setup is a one-time investment that pays ongoing dividends in security and browser compatibility.

Offline support transforms the library from a web application into something closer to a native app. Service workers intercept network requests and serve cached content when the network is unavailable. IndexedDB stores article content locally, enabling offline reading even without server access. The offline experience should feel identical to the online experience except for the inability to sync new content.

The service worker caching strategy matters. For static assets—JavaScript, CSS, images—cache-first makes sense: serve from cache if available, only fetching from network when the cache is empty. For article content, network-first with cache fallback ensures you see the latest content when online while still functioning offline.

IndexedDB provides substantial local storage for offline articles. Unlike localStorage, which is limited to a few megabytes, IndexedDB can store hundreds of megabytes of article content. The offline storage service saves articles explicitly marked for offline reading, keeping them available regardless of connectivity.

Synchronization handles the gap between offline changes and server state. Mark an article as read while offline, and that change should sync when connectivity returns. The sync queue stores pending changes and processes them when the network becomes available. Conflict resolution—what happens when the same article was modified both offline and on another device—follows a simple rule: most recent change wins.

The sync service monitors online status and processes the queue when connectivity resumes. A background listener triggers synchronization automatically when the browser detects a network connection. The user doesn't need to think about syncing; it happens transparently.

Backup strategy protects against data loss. A reading library accumulates years of curated content, reading history, and organizational structure. Losing that data would be devastating. Regular backups to a separate location provide insurance against server failure, accidental deletion, or database corruption.

The backup service exports all data—feeds, articles, tags, reading lists, progress—to a JSON file that can be stored anywhere. The format is human-readable and simple enough to import into a replacement system if needed. Scheduled backups run automatically, pruning old backups to avoid unbounded storage growth.

The restore process reverses the backup: load the JSON file, clear existing data, insert the backed-up records. Testing restore is as important as testing backup—a backup you can't restore isn't really a backup.

Progressive Web App capabilities make the library feel more like a native application. Adding a web manifest enables installation to the home screen on mobile devices. The manifest specifies the app name, icon, and display mode. Once installed, the library opens without browser chrome, looking and feeling like a native app.

Cross-device state synchronization extends beyond just syncing changes. Position within an article, current reading list, TTS playback state—these should all follow the user across devices. The synchronization becomes invisible; you just pick up where you left off, regardless of which device you left off on.

The deployment architecture that emerged from my vibe coding sessions prioritizes simplicity and reliability over optimization. A single server running Docker Compose with the application and database. Nginx as a reverse proxy handling SSL. Service worker caching for static assets and offline article storage. Background sync for pending changes. Daily backups to off-site storage. This setup handles one user's reading library without complexity that serves no purpose.

Testing deployment requires testing the entire stack, not just individual components. Does the Docker container build correctly? Does the application start after a fresh deployment? Do SSL certificates renew automatically? Does the backup actually contain all the data? Does restore actually work? These integration tests catch problems that unit tests miss.

The result is a reading library that exists as infrastructure, always available and rarely thought about. You read articles. They sync. Backups happen. The technical complexity disappears behind the simple experience of reading.
