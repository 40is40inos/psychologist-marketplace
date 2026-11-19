/** Centered, narrow column for sign-in and sign-up. */
export default function AuthLayout({ children }: LayoutProps<"/[lang]">) {
  return (
    <div className="bg-gradient-to-b from-primary-soft/50 to-bg">
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-16">{children}</div>
    </div>
  );
}
