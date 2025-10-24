import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';

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
    <div className="screen auth-screen">
      <div className="auth-layout">
        <section className="auth-hero">
          <span className="auth-hero__badge">Loan Manager</span>
          <h1>Keep every lending promise organised</h1>
          <p>
            Securely track amounts, deadlines, and partial payments. Your data stays private and synced across devices via Firebase.
          </p>
          <ul className="auth-hero__features">
            <li>Instant Google sign-in</li>
            <li>Multi-currency support</li>
            <li>Mobile-first dashboard</li>
          </ul>
        </section>

        <article className="auth-card">
          <header className="auth-card__header">
            <h2>Sign in</h2>
            <p>Connect with Google to continue.</p>
          </header>
          <button type="button" onClick={handleGoogleSignIn} className="button button--primary button--stretch">
            <span className="auth-card__google-icon" aria-hidden>
              <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" focusable="false">
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.2 30.3 0 24 0 14.6 0 6.6 5.3 2.6 13l7.9 6.1C12.4 13 17.7 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.5 24c0-1.6-.2-3.1-.5-4.5H24v9h12.7c-.5 2.6-2 4.8-4.2 6.3l6.7 5.2c3.9-3.6 6.3-8.9 6.3-16z" />
                <path fill="#FBBC04" d="M10.5 28.9c-.5-1.6-.8-3.3-.8-4.9s.3-3.3.8-4.9l-7.9-6.1C1 16.7 0 20.2 0 24s1 7.3 2.6 10.2l7.9-5.3z" />
                <path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.5-5.7l-6.7-5.2c-2 1.3-4.6 2.1-8.8 2.1-6.3 0-11.7-4.2-13.6-9.8l-7.9 6.1C6.6 42.7 14.6 48 24 48z" />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
            </span>
            <span>Sign in with Google</span>
          </button>
          <p className="auth-card__note">
            By continuing you agree to our privacy policy and understand your loans sync securely to your Google account.
          </p>
        </article>
      </div>
    </div>
  );
}
