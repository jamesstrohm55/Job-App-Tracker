export function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground md:px-6">
      <div className="surface-panel mx-auto max-w-4xl rounded-[2rem] p-6 md:p-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: March 31, 2026</p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground">Overview</h2>
            <p className="mt-2">
              HireTrackr helps users manage job applications, contacts, and related email activity. This policy
              explains what data is collected, how it is used, and how users can request deletion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Information Collected</h2>
            <p className="mt-2">
              The app may collect profile information from Google sign-in, job application records entered by users,
              contact information entered by users, and Gmail message metadata or content when a user explicitly connects
              their Gmail account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">How Information Is Used</h2>
            <p className="mt-2">
              Data is used only to provide the job tracking features of the app, including authentication, application
              organization, contact management, analytics, and email workflow features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Google User Data</h2>
            <p className="mt-2">
              If a user connects Gmail, Google user data is used solely to display, categorize, and manage job-related
              email inside the application. Google user data is not sold and is not used for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Data Sharing</h2>
            <p className="mt-2">
              User data is not sold. Data is only shared with service providers or infrastructure necessary to operate
              the application, if applicable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Data Retention</h2>
            <p className="mt-2">
              Data is retained only as long as needed to provide the service or until the user requests deletion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">User Rights</h2>
            <p className="mt-2">
              Users may request access to or deletion of their stored data. Users may also revoke Google account access
              at any time through their Google account permissions settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">Contact</h2>
            <p className="mt-2">
              For privacy questions or deletion requests, contact: <a className="text-primary underline-offset-4 hover:underline" href="mailto:jamesstrohm98@gmail.com">jamesstrohm98@gmail.com</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
