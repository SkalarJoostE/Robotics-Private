# What Robotics-AI is

## A workspace an AI can use

Robotics-AI is a folder (a git repository) full of instructions, scripts and knowledge about our robots. On its own it does nothing. An **AI assistant** is opened inside it, reads the instructions first, and then uses the scripts and knowledge to answer the question in front of it.

Think of the assistant as a new colleague, and the workspace as their desk: the manuals, the tools, and every case file from the past, arranged so they can find the right one quickly.

The assistant is Claude Code. GitHub Copilot and Codex load the same instructions, so the workspace behaves the same whichever of them is used.

## Why it exists

What we know about a robot's software is spread over many places:

- multi-megabyte XML tables per order (sequences, settings, hardware, positions);
- C# action code stored inside those XML files;
- Software Setup and "in Details" guides on Confluence;
- service tickets in Jira;
- years of SVN history across more than a thousand delivered orders;
- solved problems that were only ever explained in a chat or a meeting.

An AI can read all of that, but reading it raw is slow, expensive and easy to get wrong. The workspace does the preparation once, so every question starts from a good position:

- **Scripts turn raw files into short summaries.** For every order, a one-page profile of its hardware and settings and a readable list of its sequences replace megabytes of XML.
- **Procedures say how each kind of question is handled**, step by step, so the assistant checks the same things in the same order every time.
- **Solved cases are written down**, each opening with a four-line summary, so a problem that was solved once does not have to be solved again.

## What it is used for

- Diagnosing problems on robots in the lab or at customers, from the order's software and its log.
- Reading robot logs and explaining what went wrong.
- Investigating service tickets (RB and ES) and drafting a reply.
- Finding earlier orders that already have a requested feature.
- Making changes to an order's software, building and testing them in emulation, and committing them once a person approves.
- Assessing B-system orders for R&D approval.
- Explaining how a template, an application or a table works.

## Getting started

A one-click installer sets the workspace up on a Windows PC: it installs what is needed, downloads the workspace and checks out the software templates. SVN and Jira need the company network or the VPN.
