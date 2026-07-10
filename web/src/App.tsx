import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { SecurityModel } from "@/components/SecurityModel";
import { UseCases } from "@/components/UseCases";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { Footer } from "@/components/Footer";
import { useGitHubStats } from "@/hooks/useGitHubStats";

const RELEASES_URL = "https://github.com/0xfig-labs/KeyDock/releases";
const GITHUB_URL = "https://github.com/0xfig-labs/KeyDock";

function App() {
  const { stars, loading } = useGitHubStats("0xfig-labs", "KeyDock");

  return (
    <>
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "KeyDock",
            url: "https://keydock.0xfig.xyz/",
            image: "https://keydock.0xfig.xyz/og-image.png",
            applicationCategory: "DeveloperApplication",
            applicationSubCategory: "Secret management and environment variable presets",
            operatingSystem: "macOS",
            description:
              "Local encrypted API key vault with reusable env presets. Store developer secrets locally, compose presets, activate shell environments, or inject scoped variables into one command.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            softwareHelp: "https://github.com/0xfig-labs/KeyDock#readme",
            downloadUrl: "https://github.com/0xfig-labs/KeyDock/releases",
          }),
        }}
      />

      <Navigation starCount={loading ? undefined : stars} />
      <Hero
        primaryCta={{ label: "Download for free", href: RELEASES_URL }}
        secondaryCta={{ label: "View on GitHub", href: GITHUB_URL }}
        screenshotSrc="/hero-screenshot.png"
      />
      <Features />
      <HowItWorks />
      <SecurityModel />
      <UseCases />
      <Pricing
        features={[
          "Unlimited secrets",
          "Unlimited presets",
          "Preset composition",
          "All CLI commands",
          "Audit log",
          "Shell integration",
        ]}
        primaryCta={{ label: "Download on GitHub", href: RELEASES_URL }}
        secondaryCta={{ label: "Star on GitHub", href: GITHUB_URL }}
      />
      <FAQ />
      <Footer />
    </>
  );
}

export { App };
