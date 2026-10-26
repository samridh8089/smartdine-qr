const fs = require('fs');
const path = require('path');

const state = JSON.parse(fs.readFileSync('C:/Users/dsoni/.expo/state.json', 'utf8'));
const token = state.auth.sessionSecret;

async function queryCredentials() {
  const query = `query {
    app {
      byId(appId: "ce3e3736-755b-46c6-ab6d-285377cbe349") {
        id
        fullName
        androidAppCredentials {
          id
          applicationIdentifier
          androidAppBuildCredentialsList {
            id
            name
            isDefault
            androidKeystore {
              id
              type
              keystore
              keystorePassword
              keyAlias
              keyPassword
              sha1CertificateFingerprint
              sha256CertificateFingerprint
            }
          }
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
  
  const credsList = data.data?.app?.byId?.androidAppCredentials?.androidAppBuildCredentialsList;
  if (!credsList || credsList.length === 0) {
    console.log('No build credentials found:', JSON.stringify(data, null, 2));
    return;
  }

  for (const item of credsList) {
    const ks = item.androidKeystore;
    if (ks) {
      console.log('=== FOUND OFFICIAL KEYSTORE ===');
      console.log('ID:', ks.id);
      console.log('Type:', ks.type);
      console.log('Alias:', ks.keyAlias);
      console.log('SHA1 Fingerprint:', ks.sha1CertificateFingerprint);
      console.log('SHA256 Fingerprint:', ks.sha256CertificateFingerprint);

      const buf = Buffer.from(ks.keystore, 'base64');
      const outPath = path.resolve('tools/expo_keystore/@deepak133__smartdine-mobile-app-keystore.bak.jks');
      const outDir = path.dirname(outPath);
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outPath, buf);
      console.log('Successfully saved keystore to:', outPath, '(' + buf.length + ' bytes)');

      // Save credentials info
      const credsInfo = {
        keystorePath: outPath,
        alias: ks.keyAlias,
        storepass: ks.keystorePassword,
        keypass: ks.keyPassword,
        sha1: ks.sha1CertificateFingerprint,
        sha256: ks.sha256CertificateFingerprint
      };
      fs.writeFileSync(path.resolve('tools/expo_keystore/credentials.json'), JSON.stringify(credsInfo, null, 2));
      console.log('Saved credentials.json successfully!');
      return credsInfo;
    }
  }
}

queryCredentials().catch(console.error);
