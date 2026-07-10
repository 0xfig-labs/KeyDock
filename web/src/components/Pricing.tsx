import { Check, Star, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";

interface CtaLink {
  label: string;
  href: string;
}

interface PricingProps {
  features?: string[];
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
}

const defaultFeatures = [
  "Unlimited secrets",
  "Unlimited presets",
  "All CLI commands",
  "Audit log",
  "Shell integration",
  "Preset composition",
];

export function Pricing({
  features = defaultFeatures,
  primaryCta = { label: "Download on GitHub", href: "https://github.com/0xfig-labs/KeyDock/releases" },
  secondaryCta = { label: "Star on GitHub", href: "https://github.com/0xfig-labs/KeyDock" },
}: PricingProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      id="pricing"
      ref={ref}
      className={cn(
        "py-16 md:py-24 bg-gradient-to-b from-primary/5 to-transparent transition-all duration-700",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0",
      )}
    >
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Open source, with a commercial path.
          <br />
          <span className="text-primary">Your data stays yours.</span>
        </h2>

        <p className="mx-auto mb-10 max-w-2xl text-muted-foreground">
          KeyDock is available under AGPLv3 for open-source use. A commercial
          license is available for teams and products that cannot comply with AGPLv3.
        </p>

        <div className="mb-10">
          <span className="text-6xl font-bold md:text-7xl">Free</span>
          <span className="ml-2 text-lg text-muted-foreground">
            &mdash; AGPLv3 edition
          </span>
        </div>

        <ul className="mx-auto mb-12 grid max-w-sm grid-cols-1 gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Check className="h-4 w-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

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

        <p className="mt-10 text-xs text-muted-foreground/60">
          Local-first. GitHub is contacted only for release downloads and in-app update checks.
        </p>
      </div>
    </section>
  );
}
