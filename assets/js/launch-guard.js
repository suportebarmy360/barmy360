const BARMY360_LAUNCH_AT = new Date('2026-06-05T20:00:00-03:00').getTime();

async function barmy360CanPreviewBeforeLaunch() {
  if (Date.now() >= BARMY360_LAUNCH_AT) return true;
  try {
    if (!window.BARMY360_SUPABASE) return false;
    const { data } = await window.BARMY360_SUPABASE.auth.getSession();
    return !!data?.session;
  } catch (e) {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (Date.now() >= BARMY360_LAUNCH_AT) return;
  const path = location.pathname.split('/').pop() || 'index.html';
  const allowed = ['index.html', 'admin.html'];
  if (allowed.includes(path)) return;
  const ok = await barmy360CanPreviewBeforeLaunch();
  if (!ok) location.href = 'index.html';
});
