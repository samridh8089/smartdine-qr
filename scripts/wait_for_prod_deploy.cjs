async function poll() {
  const targetCommit = '50a223c';
  console.log(`Polling https://cleverops.in/api/version for commit ${targetCommit}...`);
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch('https://cleverops.in/api/version', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        console.log(`[Attempt ${i + 1}] Current prod commit: ${data.commit}, buildTime: ${data.buildTime}`);
        if (data.commit && data.commit.startsWith(targetCommit.slice(0, 7))) {
          console.log(`\n🎉 PROD DEPLOYMENT DETECTED: Commit ${data.commit} is live on cleverops.in!`);
          return;
        }
      }
    } catch (e) {
      console.log(`[Attempt ${i + 1}] Fetch error: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 10000));
  }
  console.error('Timed out waiting for production deployment.');
  process.exit(1);
}

poll().catch(console.error);
