const BARMY360_LAUNCH_AT = new Date('2026-06-05T20:00:00-03:00').getTime();

function pad2(n) { return String(n).padStart(2, '0'); }

function updateLaunchCountdown() {
  const now = Date.now();
  const diff = BARMY360_LAUNCH_AT - now;

  if (diff <= 0) {
    window.location.replace('home.html');
    return;
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  set('launchDays', pad2(days));
  set('launchHours', pad2(hours));
  set('launchMinutes', pad2(minutes));
  set('launchSeconds', pad2(seconds));
}

document.addEventListener('DOMContentLoaded', () => {
  updateLaunchCountdown();
  setInterval(updateLaunchCountdown, 1000);
});
