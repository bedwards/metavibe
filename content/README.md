# Content Architecture

This directory contains how-to books and essays on vibe coding various types of software systems.

## Structure

```
content/
├── books/                          # Multi-chapter how-to books
│   └── {slug}/
│       ├── book.yaml               # Book metadata and outline
│       ├── 00-introduction.md
│       ├── 01-{chapter-slug}.md
│       ├── 02-{chapter-slug}.md
│       └── assets/                 # Images, diagrams for this book
│
├── essays/                         # Standalone how-to essays
│   └── {slug}.md
│
├── generated/                      # Auto-generated drafts from session logs
│   └── {slug}.md                   # Move to essays/ or books/ after editing
│
└── templates/                      # Templates for new content
    ├── book.yaml
    ├── chapter.md
    └── essay.md
```

## Book Metadata (book.yaml)

```yaml
title: "How to Vibe Code a Healthcare Enterprise System"
slug: healthcare-enterprise
subtitle: "From requirements to production with AI-assisted development"
status: draft | review | published
version: "1.0.0"

author:
  name: "metavibe"
  url: "https://github.com/bedwards/metavibe"

description: |
  A comprehensive guide to building healthcare software systems
  using vibe coding techniques. Covers HIPAA compliance, EHR integration,
  and patient data management.

tags:
  - healthcare
  - enterprise
  - hipaa
  - ehr

audience:
  - Developers building healthcare applications
  - Technical leads evaluating AI-assisted development
  - Healthcare IT professionals

outline:
  - id: introduction
    title: "Introduction"
    file: "00-introduction.md"
    status: draft

  - id: requirements
    title: "Gathering Requirements with AI"
    file: "01-requirements.md"
    status: draft
    sections:
      - "Understanding stakeholder needs"
      - "Translating clinical workflows to technical specs"
      - "Compliance requirements mapping"

  - id: architecture
    title: "System Architecture"
    file: "02-architecture.md"
    status: draft
    sections:
      - "HIPAA-compliant infrastructure"
      - "Data flow design"
      - "Integration patterns"

publishing:
  github_pages: true
  gumroad:
    enabled: false
    price: 0
    product_id: null
  kobo:
    enabled: false
    isbn: null

sources:
  - session_id: "abc123"
    project: "/Users/dev/healthcare-app"
    topics: ["hipaa", "ehr", "authentication"]
```

## Essay Frontmatter

```yaml
---
title: "How to Vibe Code Stripe Integration"
slug: stripe-integration
status: draft | review | published
date: 2025-12-17
updated: 2025-12-17

description: |
  A practical guide to integrating Stripe payments using
  vibe coding techniques.

tags:
  - payments
  - stripe
  - typescript

audience:
  - Developers adding payments to web apps

outline:
  - Introduction
  - Prerequisites
  - Setting up Stripe
  - Creating checkout sessions
  - Handling webhooks
  - Testing
  - Going live

sources:
  - session_id: "xyz789"
    topics: ["payments", "api-development"]

publishing:
  github_pages: true
  gumroad: false
  kobo: false
---
```

## Content Categories

Books and essays are organized by the type of system being built:

### Enterprise Systems
- Healthcare (EHR, HIPAA, patient portals)
- Finance (trading, banking, compliance)
- E-commerce (inventory, fulfillment, payments)

### Consumer Applications
- Social platforms
- Gaming (Roblox, Unity, mobile)
- Productivity tools

### Developer Tools
- CLI applications
- API services
- DevOps automation

### Meta (about vibe coding itself)
- How to write how-to books with AI
- Workflow optimization
- Prompt engineering

## Workflow

1. **Generate**: Session logs → `content/generated/` (automatic)
2. **Curate**: Review generated drafts, identify promising topics
3. **Promote**: Move to `essays/` for standalone pieces or create `books/{slug}/` for larger topics
4. **Outline**: Fill in book.yaml with full outline before writing
5. **Write**: Flesh out chapters, iterate with AI assistance
6. **Review**: Edit, fact-check, polish
7. **Publish**: Deploy to GitHub Pages, Gumroad, Kobo
