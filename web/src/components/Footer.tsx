import { ArrowRight, Star, GitFork } from "lucide-react";

interface CtaLink {
  label: string;
  href: string;
}

interface FooterLink {
  label: string;
  href: string;
}

interface FooterProps {
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
  links?: FooterLink[];
}

const defaultLinks: FooterLink[] = [
  { label: "GitHub", href: "https://github.com/0xfig-labs/KeyDock" },
  { label: "Documentation", href: "https://github.com/0xfig-labs/KeyDock#readme" },
  { label: "CLI Reference", href: "https://github.com/0xfig-labs/KeyDock#cli-reference" },
  { label: "Security", href: "https://github.com/0xfig-labs/KeyDock/security" },
  { label: "Privacy", href: "https://github.com/0xfig-labs/KeyDock/blob/main/PRIVACY.md" },
  { label: "AGPLv3 License", href: "https://github.com/0xfig-labs/KeyDock/blob/main/LICENSE" },
  { label: "Commercial License", href: "https://github.com/0xfig-labs/KeyDock/blob/main/COMMERCIAL-LICENSE.md" },
];

export function Footer({
  primaryCta = { label: "Download on GitHub", href: "https://github.com/0xfig-labs/KeyDock/releases" },
  secondaryCta = { label: "Star on GitHub", href: "https://github.com/0xfig-labs/KeyDock" },
  links = defaultLinks,
}: FooterProps) {

  return (
    <footer>
      {/* Top CTA */}
      <div className="border-t border-border bg-card/50 py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="mb-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Start from a safer shell in 5 minutes.
          </h2>

          <p className="mb-8 text-sm text-muted-foreground">
            Download the universal macOS app and CLI, create your vault, and replace scattered
            .env files with reusable presets. The app stores vault data locally and checks GitHub for updates.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <a
              href={primaryCta.href}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 hover:shadow-lg"
            >
              {primaryCta.label}
              <ArrowRight className="h-4 w-4" />
            </a>

            <a
              href={secondaryCta.href}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <Star className="h-4 w-4 text-primary" />
              {secondaryCta.label}
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <nav className="mb-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer navigation">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <GitFork className="h-4 w-4" />
              KeyDock &mdash; Local API Key Vault & Env Presets
            </p>
            <p className="text-xs text-muted-foreground/60">
              Local-first. AGPLv3 or commercial license.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
