# CLAUDE.md

Documentation for working with Yoel Cabo's personal website.

## Overview

This is a bilingual (Catalan/English) personal website built with Jekyll. It features blog posts and projects, with a clean, minimalist design.

**Live site**: https://yoel.cat

## Tech Stack

- **Static Site Generator**: Jekyll
- **Template Base**: Built on [jekyll-theme-serial-programmer](https://github.com/sharadcodes/jekyll-theme-serial-programmer) by Sharad Raj
- **Plugins**:
  - `jemoji` - GitHub-flavored emoji support
  - `jekyll-seo-tag` - SEO optimization
  - `jekyll-sitemap` - Automatic sitemap generation
  - `jekyll-feed` - Atom feed generation
- **Markdown Parser**: kramdown

## Project Structure

```
my-website/
├── _config.yml              # Main Jekyll configuration
├── _data/                   # Data files
│   ├── author.yml          # Author profile & social links
│   └── bio.yml             # Biography in CA/EN
├── _includes/              # Reusable components
│   ├── bio.html
│   ├── head.html
│   ├── header.html
│   ├── footer.html
│   └── category-modal.html
├── _layouts/               # Page templates
│   ├── main.html          # Default layout
│   ├── post.html          # Blog post layout
│   └── empty.html         # Minimal layout for projects
├── all_collections/        # Content collections
│   ├── _posts/            # Blog posts (Markdown)
│   └── _projects/         # Project pages (HTML)
├── assets/
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript
│   └── icons/             # Social media icons
├── index.html             # Catalan homepage
├── en.html                # English homepage
└── 404.md                 # 404 page
```

## Language Support

The site supports two languages with manual routing:
- **Catalan (CA)**: Default, served at `/`
- **English (EN)**: Served at `/en/`

Content is filtered by `lang` frontmatter:
- Posts must have `lang: ca` or `lang: en` in frontmatter
- Bio content is stored in `_data/bio.yml` with separate CA/EN keys
- Language switcher in header toggles between index pages

## Content Types

### Blog Posts

Location: `all_collections/_posts/`

Naming convention: `YYYY-MM-DD-slug.md`

Frontmatter example:
```yaml
---
layout: post
title: El paràmetre si= de Youtube
categories: [privacitat, youtube]
lang: ca
---
```

Posts are displayed on the homepage filtered by language. Permalink format: `/:title/`

### Projects

Location: `all_collections/_projects/`

Projects use HTML files with `layout: empty` and custom permalink structure. Multiple numbered versions of projects (e.g., `2cotxes.html`, `3cotxes.html`) suggest iterative project development.

## Development

### Local Setup

```bash
# Install dependencies
bundle install

# Serve locally
bundle exec jekyll serve

# Build for production
bundle exec jekyll build
```

The built site is output to `_site/` directory.

### Creating a New Post

1. Create file: `all_collections/_posts/YYYY-MM-DD-slug.md`
2. Add frontmatter with `layout: post`, `title`, `categories`, and `lang`
3. Write content in Markdown
4. Jekyll will automatically generate the page

### Customization

- **Bio/About**: Edit `_data/bio.yml`
- **Social links**: Edit `_data/author.yml`
- **Site metadata**: Edit `_config.yml`
- **Styling**: Edit files in `assets/css/`
- **Scripts**: Edit files in `assets/js/`

## Deployment

The site uses GitHub Pages (indicated by `CNAME` file). Commits to the main branch trigger automatic deployment.

## Git Status

Current untracked posts (as of last check):
- `2023-11-24-com-funciona-el-chatgpt.md`
- `2023-12-29-tax-efficient-donations-spain.md`
- `2024-02-24-bullshit-jobs-programadors-i-agricultors..md`
- `2024-10-16-gestio-organitzativa.md`
- `all_collections/_projects/notes/` (directory)

These may be drafts or pending publication.

## Key Files Reference

- **Config**: `_config.yml:1`
- **CA Homepage**: `index.html:1`
- **EN Homepage**: `en.html:1`
- **Bio Component**: `_includes/bio.html:1`
- **Post Layout**: `_layouts/post.html:1`

## Notes

- The site excludes `sitemap.xml`, `feed.xml`, `LICENSE`, and `README.md` from builds
- Jekyll cache is stored in `.jekyll-cache/`
- Screenshots are kept in `screenshots/` directory for reference
