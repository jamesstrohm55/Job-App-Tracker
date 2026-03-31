export function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground md:px-6">
      <div className="surface-panel mx-auto max-w-4xl rounded-[2rem] p-6 md:p-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: March 31, 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Use of the Service</h2>
            <p className="mt-2">
              HireTrackr is provided to help users organize job search activity. Users are responsible for how they use
              the application and for the accuracy of the information they enter.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Accounts</h2>
            <p className="mt-2">
              Users are responsible for maintaining the confidentiality of their account access and any connected Google
              account permissions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Acceptable Use</h2>
            <p className="mt-2">
              Users may not use the service for unlawful activity, abuse the platform, or attempt to access data that
              does not belong to them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Third-Party Services</h2>
            <p className="mt-2">
              The app may rely on third-party services such as Google OAuth and Gmail APIs. Use of those services is
              also subject to the applicable third-party terms and policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Disclaimer</h2>
            <p className="mt-2">
              The service is provided on an as-is and as-available basis, without warranties of any kind to the maximum
              extent permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Limitation of Liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by law, the service owner is not liable for indirect, incidental, special,
              or consequential damages arising from use of the application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Termination</h2>
            <p className="mt-2">
              Access to the service may be suspended or terminated if misuse, abuse, or security concerns are detected.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              For questions about these terms, contact: <a className="text-primary underline-offset-4 hover:underline" href="mailto:jamesstrohm98@gmail.com">jamesstrohm98@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
