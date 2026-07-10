import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { FAQItem } from "@/components/FAQItem";

interface FaqItem {
  question: string;
  answer: string;
}

interface FAQProps {
  title?: string;
  items?: FaqItem[];
}

const defaultItems: FaqItem[] = [
  {
    question: "How is this different from .env files?",
    answer:
      "A .env file is tied to one directory and is easy to scatter across projects, backups, and cloud storage. KeyDock keeps secrets in one local encrypted vault, then maps selected fields into reusable presets. You can activate a preset for new shells or inject it into one command without editing project files.",
  },
  {
    question: "Is it secure?",
    answer:
      "Your vault uses Argon2id key derivation and ChaCha20-Poly1305 authenticated encryption. Secret data is stored locally; while unlocked, its key is held in app memory. KeyDock can contact GitHub to check for app updates, but it does not upload vault contents as part of that check. Local encryption reduces accidental exposure; it does not replace device security or careful command review.",
  },
  {
    question: "Which platforms are available?",
    answer:
      "Current releases are universal macOS builds for Intel and Apple Silicon. Linux and Windows are not currently distributed as supported releases.",
  },
  {
    question: "How do I install the macOS preview?",
    answer:
      "Download the DMG, drag KeyDock to Applications, then open it. This preview is ad-hoc signed and not notarized: if macOS blocks it, Control-click the app and choose Open; if necessary, allow it in System Settings → Privacy & Security.",
  },
  {
    question: "Can I use it without the desktop app?",
    answer:
      "Yes. The CLI can inspect presets, activate and deactivate shell environments, print shell hooks, open the app, and run one-shot commands with preset variables injected. The desktop app adds visual secret editing, preset composition, audit browsing, and quick-copy workflows.",
  },
  {
    question: "Do you offer cloud sync or team sharing?",
    answer:
      "Not yet. KeyDock is designed as a local-first tool. Cloud sync and team sharing are under consideration but would need to be optional and end-to-end encrypted. If these matter to you, star the repo and follow along.",
  },
  {
    question: "How do I migrate my existing .env files?",
    answer:
      "For now, migration is manual: create secrets from templates, add your existing values, then map the fields into presets with the env names your tools expect. An importer for .env files is planned.",
  },
  {
    question: "Can I use KeyDock in CI/CD pipelines?",
    answer:
      "Not yet. KeyDock is focused on local development workstations. For automation on your machine, use `keydock run <preset> -- <command>` to inject a scoped set of variables into one process.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: defaultItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export function FAQ({ title = "Frequently asked questions", items = defaultItems }: FAQProps) {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section
      id="faq"
      ref={ref}
      className={cn(
        "py-16 md:py-24 transition-all duration-700",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0",
      )}
    >
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="mx-auto max-w-3xl px-4">
        <h2 className="mb-12 text-center text-3xl font-semibold tracking-tight md:text-4xl">
          {title}
        </h2>

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <FAQItem
              key={item.question}
              question={item.question}
              answer={item.answer}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
