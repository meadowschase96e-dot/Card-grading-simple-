import type { ListingChannel } from "@/lib/grade-types";

const HOME: Record<ListingChannel, string> = {
  ebay: "https://www.ebay.com/",
  mercari: "https://www.mercari.com/",
  marketplace: "https://www.facebook.com/marketplace/",
  posh: "https://poshmark.com/",
};

export function channelHome(channel: ListingChannel): string {
  return HOME[channel];
}

export function channelSearch(channel: ListingChannel, query: string): string {
  const q = encodeURIComponent(query);
  switch (channel) {
    case "ebay":
      return `https://www.ebay.com/sch/i.html?_nkw=${q}`;
    case "mercari":
      return `https://www.mercari.com/search/?keyword=${q}`;
    case "posh":
      return `https://poshmark.com/search?query=${q}&type=listings`;
    case "marketplace":
      return `https://www.facebook.com/marketplace/search/?query=${q}`;
  }
}

export function openChannel(channel: ListingChannel, query?: string) {
  const url = query?.trim() ? channelSearch(channel, query.trim()) : channelHome(channel);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) return;
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.click();
}
