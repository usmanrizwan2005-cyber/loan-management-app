import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';
import { FaArrowRight, FaShieldAlt } from 'react-icons/fa';

export default function Login() {
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Signed in successfully!');
    } catch (error) {
      toast.error(`Failed to sign in: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-page-gradient)] px-4 py-12">
      <div className="max-w-5xl w-full grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6 text-center lg:text-left">
          <span className="tag-pill inline-flex justify-center lg:justify-start">Loan Manager</span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--color-heading)]">
            Keep every lending promise organised
          </h1>
          <p className="text-base sm:text-lg text-[var(--color-muted)] max-w-xl mx-auto lg:mx-0">
            Securely track amounts, deadlines, and partial payments. Your data stays private and synced across devices via Firebase.
          </p>
          <div className="flex flex-col gap-3 text-sm text-[var(--color-muted)]">
            <div className="inline-flex items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm lg:justify-start">
              <FaShieldAlt className="text-[var(--color-primary)]" />
              Google handles authentication - we never see your password.
            </div>
            <div className="inline-flex items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 shadow-sm lg:justify-start">
              <FaArrowRight className="text-[var(--color-primary)]" />
              Start tracking in seconds. No setup required.
            </div>
          </div>
        </div>

        <div className="surface space-y-6 rounded-3xl p-8 text-center lg:text-left">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-[var(--color-heading)]">Sign in</h2>
            <p className="text-sm text-[var(--color-muted)]">Connect with Google to continue.</p>
          </div>
          <button
            onClick={handleGoogleSignIn}
            className="btn btn-primary w-full justify-center gap-3"
          >
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden>
              <defs>
                <path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
              </defs>
              <clipPath id="b">
                <use xlinkHref="#a" overflow="visible" />
              </clipPath>
              <path clipPath="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z" />
              <path clipPath="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z" />
              <path clipPath="url(#b)" fill="#34A853" d="M0 37l30-23 7.9 1L48 0v48H0z" />
              <path clipPath="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3 35-10z" />
            </svg>
            Sign in with Google
          </button>
          <p className="text-xs text-[var(--color-muted)]">
            By continuing you agree to the privacy policy and understand that your loans sync to your Google account.
          </p>
        </div>
      </div>
    </div>
  );
}
