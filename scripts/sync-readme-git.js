const { execSync } = require('child_process');

try {
  execSync('git config user.name "ellecrydansmesdm"', { stdio: 'inherit' });
  execSync('git config user.email "ellecrydansmesdm@users.noreply.github.com"', { stdio: 'inherit' });

  console.log('Stashing local uncommitted changes...');
  execSync('git stash', { stdio: 'inherit' });

  console.log('Pulling with rebase...');
  execSync('git pull --rebase origin main', { stdio: 'inherit' });

  console.log('Popping stash...');
  execSync('git stash pop', { stdio: 'inherit' });

  console.log('Staging README.md...');
  execSync('git add README.md', { stdio: 'inherit' });

  console.log('Committing...');
  execSync('git commit -m "docs: update Discord community link to https://discord.gg/W2YgEStqJ4 and Lifetime store"', { stdio: 'inherit' });

  console.log('Pushing...');
  execSync('git push origin main', { stdio: 'inherit' });

  console.log('✅ Opsec PRO README pushed successfully!');
} catch (err) {
  console.error('Error during git push:', err.message);
  process.exit(1);
}
