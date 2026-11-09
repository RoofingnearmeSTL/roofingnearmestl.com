// "Meet Mike" link on the thank-you page. A plain link to the video, with no embedded player.
export default function IntroVideoLink({ url }: { url: string }) {
  return (
    <p className="mt-6">
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-light px-5 py-3 font-bold text-brand-ink hover:bg-white">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        Meet Mike, the owner: watch a short hello
      </a>
    </p>
  );
}
