const fs = require('fs');
const state = JSON.parse(fs.readFileSync('C:/Users/dsoni/.expo/state.json', 'utf8'));
const token = state.auth.sessionSecret;

async function queryBuilds() {
  const query = `query {
    app {
      byId(appId: "ce3e3736-755b-46c6-ab6d-285377cbe349") {
        builds(limit: 15) {
          edges {
            node {
              id
              platform
              status
              appVersion
              appBuildVersion
              createdAt
            }
          }
        }
      }
    }
  }`;

  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: { 'expo-session': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  const edges = data.data?.app?.byId?.builds?.edges || [];
  console.log('Recent builds:');
  for (const e of edges) {
    console.log(e.node.platform, 'Status:', e.node.status, 'appVersion:', e.node.appVersion, 'buildVersion (versionCode):', e.node.appBuildVersion, 'Created:', e.node.createdAt);
  }
}
queryBuilds();
