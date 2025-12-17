---
title: "Why We Don't Use MCP Servers"
slug: why-we-dont-use-mcp-servers
status: published
date: 2025-12-17
updated: 2025-12-17

description: |
  A principled case against MCP servers in AI-assisted development.
  Why native tools and CLI commands are safer, simpler, and sufficient.

tags:
  - mcp
  - security
  - cli
  - vibe-coding

audience:
  - Developers using Claude Code
  - AI-assisted development practitioners
  - Security-conscious engineers

publishing:
  github_pages: true
  gumroad: false
  kobo: false
---

# Why We Don't Use MCP Servers

The Model Context Protocol sounds useful on paper. External servers that extend Claude's capabilities, providing database access, API integrations, file system operations. When Anthropic announced MCP, the developer community rushed to build servers for everything from GitHub to PostgreSQL to Discord.

We don't use them. We've permanently disabled them across our projects. The reasoning isn't ideological opposition to extensions. It's practical security analysis combined with recognition that the supposed benefits don't exist.

MCP servers execute arbitrary code on your machine. This isn't a bug or an edge case—it's the fundamental architecture. When you connect an MCP server, you're granting that server the ability to run any command, access any file, modify any data that your user account can reach. The server might be well-intentioned. The server might be perfectly safe today. But you're trusting code you didn't write to run with your privileges.

Anthropic's own engineering team published guidance on MCP security that should give any developer pause. They recommend careful review of each server's code, isolation strategies, and principle of least privilege. These are exactly the mitigations you'd apply when running untrusted code—because that's what you're doing.

The Claude Code environment already includes native tools that cover every legitimate use case. File operations work through Read, Write, Edit, Glob, and Grep. Web operations work through WebFetch and WebSearch. The bash tool runs any CLI command. What exactly would an MCP server add that these tools don't already provide?

Consider the supposed value proposition of a PostgreSQL MCP server. It would let Claude query your database directly. But Claude can already run psql commands through bash. It can execute SQL files. It can interact with any database through your application's existing interfaces. The MCP server adds no capability that wasn't already present. What it adds is another layer of code that could contain vulnerabilities, another process consuming resources, another thing to maintain and update.

The GitHub MCP server provides another instructive example. It promises to give Claude access to issues, pull requests, and repository operations. But the gh CLI already does all of this. Every single operation the GitHub MCP server enables, the gh CLI enables. The difference is that gh is maintained by GitHub itself, receives constant security updates, and has been audited by thousands of developers. The MCP server is maintained by whoever wrote it and may or may not receive updates when vulnerabilities are discovered.

Discord integration follows the same pattern. We use webhooks with curl. One line in bash sends a message. The webhook URL is a secret we control. There's no bot token that could be compromised, no long-running process that could be exploited, no dependency on external MCP code.

The attack surface analysis favors CLI tools overwhelmingly. Each MCP server you add is a potential vulnerability. Each one runs in a process that has access to your system. Each one communicates over channels that could be intercepted or manipulated. Compare this to running gh through bash—the same cli you'd use manually, executing the same commands you'd type, with no additional attack surface beyond what you already accepted when you installed the tool.

Maintenance burden compounds the security concerns. MCP servers need updates. They can break when APIs change. They can develop incompatibilities with Claude Code versions. Each one is a dependency you're choosing to manage. CLI tools update independently through your package manager. When gh gets a new feature, you get it automatically. When the GitHub API changes, the gh maintainers update their tool. You don't have to track which MCP server version works with which API version.

The one-off exceptions don't justify the general case. Some MCP servers provide genuinely unique capabilities that CLI tools don't match. Visual file browsers, perhaps, or specialized integrations with proprietary systems. Even granting that these exceptions exist, the response should be careful evaluation of each specific server, not blanket enablement of the MCP ecosystem. We default to disabled with explicit exceptions, not enabled with occasional concerns.

Our projects now include explicit documentation that MCP servers are permanently disabled. The reasoning is spelled out. The policy is non-negotiable. New contributors see this immediately in CLAUDE.md. The instructions explain not just what we don't do, but why we don't do it.

This isn't about distrust of Anthropic or pessimism about the MCP ecosystem. It's about recognizing that Claude Code already has the tools we need. Adding MCP servers adds risk without adding capability. In security analysis, you question every addition that increases attack surface. MCP servers fail that test.

The broader principle applies beyond MCP. Every integration, every extension, every plugin should justify its existence against native capabilities. If you can accomplish the same goal with tools that already exist, prefer those tools. They're tested, maintained, and already present in your security model. New additions must clear a high bar.

Claude Code ships with powerful native tools for a reason. They cover the legitimate use cases without requiring external code execution. When Anthropic designed the tool architecture, they made deliberate choices about capability boundaries. MCP servers exist for use cases outside those boundaries—but we haven't found use cases in that category that we actually need.

The simplest architecture is the most secure architecture. Run Claude Code. Use its native tools. Execute CLI commands through bash when you need external capabilities. Don't add attack surface you don't need.
