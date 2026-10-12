import { createFileRoute } from "@tanstack/react-router";
import Game from "@/components/Game";
import { TAGLINE, TITLE } from "@/config/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${TITLE} — a farewell runner` },
      { name: "description", content: TAGLINE },
      { property: "og:title", content: `${TITLE} — a farewell runner` },
      { property: "og:description", content: TAGLINE },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
