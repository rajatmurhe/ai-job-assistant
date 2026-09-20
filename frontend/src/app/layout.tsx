import './globals.css';
import { TopNav } from '@/components/layout/TopNav';
import { ClientProviders } from '@/components/layout/ClientProviders';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata = {
  title: 'AI Job Assistant — Autonomous Application Copilot',
  description: 'Parse resumes, match job postings deterministically, and generate truthful ATS-optimized documents.',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
    shortcut: '/logo.jpg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if ((e.filename && e.filename.indexOf('chrome-extension://') !== -1) ||
                    (e.error && e.error.stack && e.error.stack.indexOf('chrome-extension://') !== -1)) {
                  e.preventDefault();
                  e.stopImmediatePropagation();
                }
              }, true);
            `,
          }}
        />
      </head>
      <body className="bg-background text-ink min-h-screen flex flex-col antialiased">
        <ClientProviders>
          <TopNav />
          <div className="flex flex-1 min-h-screen">
            <Sidebar />
            <main className="flex-1 px-4 py-6 md:px-10 md:py-8 max-w-6xl mx-auto w-full overflow-x-hidden">
              {children}
            </main>
          </div>
        </ClientProviders>
      </body>
    </html>
  );
}
