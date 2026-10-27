const fs = require('fs');

// 1. KitchenTabNavigator.js
const kitchenPath = 'smartdine-mobile/src/navigation/KitchenTabNavigator.js';
let kitchenContent = fs.readFileSync(kitchenPath, 'utf8').replace(/\r\n/g, '\n');

if (!kitchenContent.includes('useSafeAreaInsets')) {
  kitchenContent = kitchenContent.replace(
    "import { Platform } from 'react-native';",
    "import { Platform } from 'react-native';\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';"
  );
}

const kitchenFnOld = 'export default function KitchenTabNavigator({ route }) {\n  const profile = route?.params?.profile ?? {};';
const kitchenFnNew = 'export default function KitchenTabNavigator({ route }) {\n  const profile = route?.params?.profile ?? {};\n  const insets = useSafeAreaInsets();\n  const bottomInset = Math.max(insets.bottom, Platform.OS === \'android\' ? 14 : 0);';

kitchenContent = kitchenContent.replace(kitchenFnOld, kitchenFnNew);

const kitchenStyleOld = `        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
        },`;

const kitchenStyleNew = `        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: (Platform.OS === 'ios' ? 60 : 64) + bottomInset,
          paddingBottom: bottomInset + (Platform.OS === 'ios' ? 0 : 6),
          paddingTop: 6,
          elevation: 16,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },`;

kitchenContent = kitchenContent.replace(kitchenStyleOld, kitchenStyleNew);
fs.writeFileSync(kitchenPath, kitchenContent.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully updated KitchenTabNavigator.js');

// 2. WaiterTabNavigator.js
const waiterPath = 'smartdine-mobile/src/navigation/WaiterTabNavigator.js';
let waiterContent = fs.readFileSync(waiterPath, 'utf8').replace(/\r\n/g, '\n');

if (!waiterContent.includes('useSafeAreaInsets')) {
  waiterContent = waiterContent.replace(
    "import { Platform } from 'react-native';",
    "import { Platform } from 'react-native';\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';"
  );
}

const waiterFnOld = 'export default function WaiterTabNavigator({ route }) {\n  const profile = route?.params?.profile ?? {};';
const waiterFnNew = 'export default function WaiterTabNavigator({ route }) {\n  const profile = route?.params?.profile ?? {};\n  const insets = useSafeAreaInsets();\n  const bottomInset = Math.max(insets.bottom, Platform.OS === \'android\' ? 14 : 0);';

waiterContent = waiterContent.replace(waiterFnOld, waiterFnNew);

const waiterStyleOld = `        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f1f5f9',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.04,
          shadowRadius: 8,
        },`;

const waiterStyleNew = `        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          borderTopWidth: 1,
          height: (Platform.OS === 'ios' ? 60 : 64) + bottomInset,
          paddingBottom: bottomInset + (Platform.OS === 'ios' ? 0 : 6),
          paddingTop: 6,
          elevation: 16,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },`;

waiterContent = waiterContent.replace(waiterStyleOld, waiterStyleNew);
fs.writeFileSync(waiterPath, waiterContent.replace(/\n/g, '\r\n'), 'utf8');
console.log('Successfully updated WaiterTabNavigator.js');
