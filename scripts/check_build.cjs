const fs = require('fs');
const state = JSON.parse(fs.readFileSync('C:/Users/hp/.expo/state.json', 'utf8'));
const token = state.auth.sessionSecret;

const buildId = process.argv[2] || "36becab9-a720-4c4d-80c8-01d272b6d28e";

async function check() {
  const query = `query {
    builds {
      byId(buildId: "${buildId}") {
        id
        status
        createdAt
        updatedAt
        enqueuedAt
        error {
          message
          errorCode
        }
        artifacts {
          buildUrl
        }
      }
    }
  }`;
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'expo-session': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

check().catch(console.error);
