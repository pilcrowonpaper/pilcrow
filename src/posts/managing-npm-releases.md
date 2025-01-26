---
title: "Managing NPM releases"
date: "2025-01-26"
---

As someone who manages quite a few NPM packages, one aspect I struggled with was managing NPM releases. How do you streamline the process of developing and releasing packages? It's something I think a lot of people have figured out but yet it's rarely discussed or documented.

The most basic approach would be to just run `npm publish` manually but there are obvious downsides to it:

- It's not cool.
- It's prone to mistakes: I've forgotten to build the package or released beta versions as latest in the past.
- You can't generate NPM provenance statements.
- You have to manually generate GitHub Releases.

There are existing solutions for it like [Changesets](https://github.com/changesets/changesets), which are used to by a lot of major JavaScript packages. However, documentation is a bit lacking and I didn't feel like using it. So I decided to build my own solution like I often do. Reinventing the wheel and whatnot but I enjoy the process.

I had a few requirements in mind.

First, most of my projects have their package source code and documentation in the same repository. If the documentation site is deployed with every commit but the package is only released every other day, it can cause unreleased features to be documented prematurely. At the same time, if I held off all updates to the documentation until a new version was released, it can cause pull requests to back up and prevent even small changes (like typo and grammar fixes) from being merged. I wanted something that would neatly keep the package and documentation in-sync.

Second, I wanted to manage multiple major versions in a single repository. For example, the `main` branch would hold the latest version and `v2` branch would hold the legacy v2 source code. I should be able to release both latest and legacy versions anytime.

On the other hand, there were a few limitations I was willing to accept to keep the tool simple. Mainly, it didn't need to support monorepos with multiple packages. I don't like monorepos and avoid it unless it's absolutely necessary. Most of my packages are small in scale and I just need something simple.

I was also fine with, even preferred, manually writing the changelogs. Changesets (and likely other tools) organize changes by having a big directory with changeset files each documenting a single change since the previous release. This allows contributors to add to the changelog by simply committing a markdown file or two alongside their pull requests. However, since the changelog is usually just a list with all these individual changeset files combined, the format and style of the changelog can become inconsistent. I was also worried this approach would make customizing the changelog format and managing changelogs for pre-releases cumbersome.

So here's my current process.

I now maintain 2 branches - `main` and `next`. `main` holds the source code of the latest published version, while `next` holds the source code for the upcoming release. For some projects I have similar branches for previous versions (e.g. `v1` and `v1-next`). All commits to `main` triggers an action that publish the documentation, while the package itself is published when an action detects that the `package.json` version is not yet published. Importantly, all pull requests that update the package source code is made against `next` while pull requests for small documentation fixes is made against `main`. This ensures that typo and grammar fixes are deployed instantly while documentation for new features can be held off until the next release.

The changelog is just a `.RELEASE.md` file in the `next` branch. Whenever I want to trigger a release, I update `version` field in `package.json`, write the changelog, and create a PR that merges the `next` branch into `main`. While I've only used this workflow for latest and legacy releases for now, it's a simple workflow that can also be adapted for prereleases.

I created [Auri](https://github.com/pilcrowonpaper/auri) to support this workflow. It's open source like most of my projects but it's not really intended for public use. The package is still very bare-bones but I plan to make it more opinionated once I find the exact workflow I like. I've been using it in [Arctic](https://github.com/pilcrowonpaper/arctic) for a month now and I'm really enjoying it. Everything is published with a provenance statement and changelogs are nicely organized on GitHub Releases. I've also found that it's pretty friendly to new contributors since Auri is hidden for most contributions.
