import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { LoginScreen } from '@/app/login/LoginScreen';

const replace = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }) }));

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  window.scrollTo = vi.fn(); // jsdom: not implemented (silences Framer/focus noise)
  replace.mockClear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const email = () => screen.getByLabelText('Email') as HTMLInputElement;
const password = () => screen.getByLabelText('Password') as HTMLInputElement;
const submit = () => screen.getByRole('button', { name: /^(log in|logging in|create account|creating account)/i });

describe('LoginScreen', () => {
  it('renders the editorial hero, a labelled form and the mode radio group', () => {
    render(<LoginScreen />);
    expect(screen.getByText('Your world,')).toBeInTheDocument();
    expect(screen.getByText('curated.')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Account mode' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Log in' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Sign up' })).not.toBeChecked();
    expect(email()).toHaveAttribute('type', 'email');
    expect(email()).toHaveAttribute('autocomplete', 'username');
    expect(password()).toHaveAttribute('type', 'password');
    expect(password()).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByRole('button', { name: 'Use demo account' })).toBeInTheDocument();
  });

  it('empty submit: no request, per-field role=alert errors, aria-invalid + aria-describedby, focus on first invalid field', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(submit());

    expect(fetchMock).not.toHaveBeenCalled();
    const emailAlert = screen.getByText('Enter your email address.');
    const passwordAlert = screen.getByText('Enter your password.');
    expect(emailAlert).toHaveAttribute('role', 'alert');
    expect(passwordAlert).toHaveAttribute('role', 'alert');
    expect(email()).toHaveAttribute('aria-invalid', 'true');
    expect(email().getAttribute('aria-describedby')).toBe(emailAlert.id);
    expect(password()).toHaveAttribute('aria-invalid', 'true');
    expect(password().getAttribute('aria-describedby')).toContain(passwordAlert.id);
    expect(email()).toHaveFocus();
  });

  it('validates on blur, then clears the error as the user fixes the value', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.type(email(), 'nope');
    expect(screen.queryByText(/does not look like an email/i)).not.toBeInTheDocument(); // not while typing the first time
    await user.tab();
    expect(screen.getByText('That does not look like an email address.')).toBeInTheDocument();
    expect(email()).toHaveAttribute('aria-invalid', 'true');

    await user.click(email());
    await user.type(email(), '@pulse.dev');
    await waitFor(() => expect(screen.queryByText(/does not look like an email/i)).not.toBeInTheDocument());
    expect(email()).not.toHaveAttribute('aria-invalid');
    expect(email()).not.toHaveAttribute('aria-describedby');
  });

  it('"Use demo account" fills the exact demo credentials and focuses the submit button', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: 'Use demo account' }));
    expect(email().value).toBe('demo@pulse.dev');
    expect(password().value).toBe('pulse123');
    expect(submit()).toHaveFocus();
    expect(screen.getByRole('status')).toHaveTextContent(/demo credentials filled/i);
  });

  it('successful login posts the credentials, keeps the pending state and replaces the route with /', async () => {
    fetchMock.mockResolvedValue(json({ email: 'demo@pulse.dev' }, 200));
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: 'Use demo account' }));
    await user.click(submit());

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ mode: 'login', email: 'demo@pulse.dev', password: 'pulse123' });
    expect(submit()).toHaveAttribute('aria-disabled', 'true');
  });

  it('wrong credentials: role=alert banner, password flagged invalid + described by the banner, form usable again', async () => {
    fetchMock.mockResolvedValue(json({ error: 'invalid' }, 401));
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.type(email(), 'demo@pulse.dev');
    await user.type(password(), 'wrong-password');
    await user.click(submit());

    const banner = await screen.findByText(/email and password do not match/i);
    const alert = banner.closest('[role="alert"]') as HTMLElement;
    expect(alert).toBeInTheDocument();
    expect(password()).toHaveAttribute('aria-invalid', 'true');
    expect(password().getAttribute('aria-describedby')).toContain(alert.id);
    expect(password()).toHaveFocus();
    expect(replace).not.toHaveBeenCalled();
    await waitFor(() => expect(submit()).not.toHaveAttribute('aria-disabled', 'true'));

    await user.type(password(), '!');
    await waitFor(() => expect(screen.queryByText(/email and password do not match/i)).not.toBeInTheDocument());
  });

  it('network failure shows a retryable error (no crash, no redirect)', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: 'Use demo account' }));
    await user.click(submit());
    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    await waitFor(() => expect(submit()).not.toHaveAttribute('aria-disabled', 'true'));
  });

  it('a 500 with a non-JSON body shows the generic server error', async () => {
    fetchMock.mockResolvedValue(new Response('<html>boom</html>', { status: 500 }));
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: 'Use demo account' }));
    await user.click(submit());
    expect(await screen.findByText(/something went wrong on our side/i)).toBeInTheDocument();
  });

  it('cannot be double-submitted while a request is in flight', async () => {
    let resolve: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => { resolve = r; }));
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('button', { name: 'Use demo account' }));
    await user.click(submit());
    expect(submit()).toHaveAttribute('aria-disabled', 'true');
    expect(submit()).toHaveTextContent(/logging in/i);
    await user.click(submit());
    await user.type(password(), '{Enter}');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve(json({ error: 'invalid' }, 401));
    await screen.findByText(/email and password do not match/i);
  });

  it('sign up mode: shows the password hint, swaps heading + autocomplete, enforces the 6-char minimum', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('radio', { name: 'Sign up' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Create your account' })).toBeInTheDocument();
    expect(password()).toHaveAttribute('autocomplete', 'new-password');
    const hint = screen.getByText('At least 6 characters.');
    expect(password().getAttribute('aria-describedby')).toBe(hint.id);

    await user.type(email(), 'new@pulse.dev');
    await user.type(password(), '123');
    await user.click(submit());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText('Use at least 6 characters.')).toHaveAttribute('role', 'alert');
    expect(password()).toHaveFocus();
  });

  it('server-side field errors (400) are mapped back onto the field', async () => {
    fetchMock.mockResolvedValue(json({ error: 'email' }, 400));
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.click(screen.getByRole('radio', { name: 'Sign up' }));
    await user.type(email(), 'new@pulse.dev');
    await user.type(password(), 'longenough');
    await user.click(submit());
    expect(await screen.findByText('That does not look like an email address.')).toBeInTheDocument();
    expect(email()).toHaveAttribute('aria-invalid', 'true');
    expect(email()).toHaveFocus();
  });

  it('can reveal and re-hide the password with an accessible toggle', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);
    await user.type(password(), 'secret1');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password()).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password()).toHaveAttribute('type', 'password');
  });
});
