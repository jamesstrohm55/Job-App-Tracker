import { BarChart3, Briefcase, KanbanSquare, Mail, ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"

const features = [
  {
    icon: KanbanSquare,
    title: "Track the pipeline",
    description: "Organize opportunities across saved, applied, screening, interview, and offer stages.",
  },
  {
    icon: Mail,
    title: "Work from Gmail",
    description: "Review job-related email, sync interview details, and manage follow-ups in one place.",
  },
  {
    icon: BarChart3,
    title: "See what is working",
    description: "Use analytics to understand response rates, stage movement, and overall search momentum.",
  },
]

export function HomePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="surface-panel overflow-hidden rounded-[2rem] p-6 md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20">
                <Briefcase className="h-7 w-7 text-white" />
              </div>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.24em] text-primary">HireTrackr</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
                A job search command center for applications, contacts, and email.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                HireTrackr helps users organize job applications, manage recruiter contacts, and handle job-related
                Gmail activity from a single workspace.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_10px_24px_rgba(2,132,199,0.18)] hover:bg-primary/92"
              >
                Sign In
              </Link>
              <Link
                to="/privacy"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-input/90 bg-background-elevated/88 px-5 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
              >
                Privacy Policy
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {features.map((feature) => (
            <article key={feature.title} className="surface-panel rounded-[1.75rem] p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="surface-panel rounded-[2rem] p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-4 w-4" />
                <p className="font-mono text-[11px] uppercase tracking-[0.2em]">Policy Links</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                This public page exists to describe the application for OAuth review and includes the required legal
                links below.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/privacy"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-input/90 bg-background-elevated/88 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-input/90 bg-background-elevated/88 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
