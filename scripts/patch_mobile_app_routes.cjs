const fs = require('fs');

// 1. Patch App.js
const appPath = 'smartdine-mobile/App.js';
let appContent = fs.readFileSync(appPath, 'utf8');

if (!appContent.includes("import OwnerWebScreen from './src/screens/OwnerWebScreen';")) {
  appContent = appContent.replace(
    "import AttendanceMobileScreen from './src/screens/AttendanceMobileScreen';",
    "import AttendanceMobileScreen from './src/screens/AttendanceMobileScreen';\nimport OwnerWebScreen from './src/screens/OwnerWebScreen';"
  );
}

// Notification tap listener
appContent = appContent.replace(
  "navigationRef.navigate('MainApp');",
  "navigationRef.navigate('OwnerWebApp');"
);

// Stack screen registration
if (!appContent.includes('<Stack.Screen name="OwnerWebApp" component={OwnerWebScreen} />')) {
  appContent = appContent.replace(
    '{/* Owner Portal */}\n          <Stack.Screen name="MainApp" component={MainTabNavigator} />',
    '{/* Owner Portal (Responsive Web Dashboard) */}\n          <Stack.Screen name="OwnerWebApp" component={OwnerWebScreen} />\n          <Stack.Screen name="MainApp" component={MainTabNavigator} />'
  );
  // CRLF fallback
  appContent = appContent.replace(
    '{/* Owner Portal */}\r\n          <Stack.Screen name="MainApp" component={MainTabNavigator} />',
    '{/* Owner Portal (Responsive Web Dashboard) */}\r\n          <Stack.Screen name="OwnerWebApp" component={OwnerWebScreen} />\r\n          <Stack.Screen name="MainApp" component={MainTabNavigator} />'
  );
}

fs.writeFileSync(appPath, appContent, 'utf8');
console.log('App.js patched successfully');

// 2. Patch LoginScreen.js
const loginPath = 'smartdine-mobile/src/screens/LoginScreen.js';
let loginContent = fs.readFileSync(loginPath, 'utf8');

loginContent = loginContent.replace(
  "case 'manager':\n        navigation.replace('ManagerApp', { profile });\n        break;\n      case 'super_admin':\n        navigation.replace('SuperAdmin', { profile });\n        break;\n      case 'owner':\n        navigation.replace('MainApp', { profile });",
  "case 'manager':\n        navigation.replace('OwnerWebApp', { profile });\n        break;\n      case 'super_admin':\n        navigation.replace('SuperAdmin', { profile });\n        break;\n      case 'owner':\n        navigation.replace('OwnerWebApp', { profile });"
);

loginContent = loginContent.replace(
  "case 'manager':\r\n        navigation.replace('ManagerApp', { profile });\r\n        break;\r\n      case 'super_admin':\r\n        navigation.replace('SuperAdmin', { profile });\r\n        break;\r\n      case 'owner':\r\n        navigation.replace('MainApp', { profile });",
  "case 'manager':\r\n        navigation.replace('OwnerWebApp', { profile });\r\n        break;\r\n      case 'super_admin':\r\n        navigation.replace('SuperAdmin', { profile });\r\n        break;\r\n      case 'owner':\r\n        navigation.replace('OwnerWebApp', { profile });"
);

fs.writeFileSync(loginPath, loginContent, 'utf8');
console.log('LoginScreen.js patched successfully');
