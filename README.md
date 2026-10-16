# Run Bangalore Run

Understand the game.“Escape from M&S” is a portrait, mobile-first endless runner built as a farewell gift for Fathu. He escapes the office balcony, leaps into a tree, and keeps running down a Bangalore road while Murali and Sumeet chase him with “What PAA?!”. It’s React + TypeScript on TanStack Start (Vite) with Tailwind. The whole game is drawn on one HTML5 canvas, with no backend and no audio files.

Gameplay details I confirmed in the code:

You have 3 lives (lives = 3 - hits). The bosses move closer with each hit.

The best score is stored in localStorage.

Debug URL flags work: ?stage=2, ?stage=3, ?god=1, ?debug=1, ?speed=1.5 and ?pose=run|jump|duck|land. These are useful for testing.

We'll talk more, help you understand the app in detail, then move to building and upgrading.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5c41575d-4c69-4bc3-94a0-2bfe92e48be7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
