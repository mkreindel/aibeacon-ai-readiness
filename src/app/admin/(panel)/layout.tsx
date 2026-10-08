import { logout } from "@/app/admin/(panel)/actions";

// Static shell with no data. Each page checks the session itself (requirePanelClient),
// inside the loading boundary, so request-time work can stream with Cache Components.
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <p className="font-semibold">AI Beacon · Diagnostics</p>
        <form action={logout}>
          <button type="submit" className="text-sm underline">
            Sign out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
