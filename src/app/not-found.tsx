import Link from "next/link";
import { RepoSearch } from "@/components/RepoSearch";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-24 text-center">
        <p className="font-mono text-sm text-amber">404</p>
        <h1 className="mt-2 font-display text-4xl">This trail doesn&apos;t lead anywhere</h1>
        <p className="mt-4 text-muted">The page or repository name isn&apos;t valid. Try pasting a GitHub URL instead.</p>
        <div className="mt-8 text-left"><RepoSearch /></div>
        <p className="mt-6 text-sm"><Link href="/" className="text-amber hover:underline">Back to home</Link></p>
      </main>
      <SiteFooter />
    </>
  );
}
