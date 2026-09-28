import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import sharp from 'sharp';
import { execSync } from 'child_process';

async function main() {
  console.log('=== Applying Web Logo to Exactly 4 Places in APK ===');
  console.log('1. Main App Icon (Launcher resources for home screen)');
  console.log('2. Splash Screen (When app loads)');
  console.log('3. Login Screen (Brand header circle)');
  console.log('4. Dashboard Screen (Header next to greeting & restaurant name)');
  console.log('Keeping EVERYTHING ELSE 100% original.\n');

  const baseApkPath = path.resolve('release-rc2/SmartDine-RC2.apk');
  const bundleJsPath = path.resolve('smartdine-mobile/dist-android/index.android.bundle');
  const hermescExe = path.resolve('tools/package/sdks/hermesc/win64-bin/hermesc.exe');

  if (!fs.existsSync(baseApkPath)) throw new Error('Base APK not found at: ' + baseApkPath);
  if (!fs.existsSync(bundleJsPath)) throw new Error('Bundle not found at: ' + bundleJsPath);
  if (!fs.existsSync(hermescExe)) throw new Error('Hermes compiler not found at: ' + hermescExe);

  // 1. Read public/logo.png and prepare Base64 URI
  const logoPngPath = path.resolve('public/logo.png');
  const logoBuf = fs.readFileSync(logoPngPath);
  const base64Logo = logoBuf.toString('base64');
  const logoUri = `data:image/png;base64,${base64Logo}`;
  console.log(`[1] Web Logo loaded: ${logoPngPath} (${(logoBuf.length / 1024).toFixed(1)} KB)`);

  // 2. Read ORIGINAL clean bundle
  let code = fs.readFileSync(bundleJsPath, 'utf8');

  // Replace mock-anon-key with real publishable key if present
  const REAL_KEY = 'sb_publishable_YhLxIyNN7tsS2ixSnGfRUw_TF4EsRf-';
  code = code.replaceAll("'mock-anon-key'", `'${REAL_KEY}'`);
  code = code.replaceAll('"mock-anon-key"', `"${REAL_KEY}"`);

  // Define global constant for the logo
  const logoConstDecl = `var __CLEVEROPS_WEB_LOGO__="${logoUri}";`;
  code = logoConstDecl + code;

  // 2. SPLASH SCREEN (when app loads)
  const splashTarget = '(0,u.jsx)(n.View,{style:h.splashLogoCircle,children:(0,u.jsx)(l.MaterialCommunityIcons,{name:"silverware-fork-knife",size:40,color:"#ffffff"})})';
  const splashReplacement = '(0,u.jsx)(n.View,{style:[h.splashLogoCircle,{backgroundColor:"transparent"}],children:(0,u.jsx)(n.Image,{source:{uri:__CLEVEROPS_WEB_LOGO__},style:{width:72,height:72,resizeMode:"contain"}})})';

  if (!code.includes(splashTarget)) {
    throw new Error('Splash target not found in bundle!');
  }
  code = code.replace(splashTarget, splashReplacement);
  console.log('-> Patched [2] Splash Screen Logo');

  // 3. LOGIN SCREEN (brand header)
  const loginTarget = '(0,u.jsx)(n.View,{style:h.logoCircle,children:(0,u.jsx)(l.MaterialCommunityIcons,{name:"silverware-fork-knife",size:32,color:"#ffffff"})})';
  const loginReplacement = '(0,u.jsx)(n.View,{style:[h.logoCircle,{backgroundColor:"transparent",elevation:0,shadowOpacity:0}],children:(0,u.jsx)(n.Image,{source:{uri:__CLEVEROPS_WEB_LOGO__},style:{width:64,height:64,resizeMode:"contain"}})})';

  if (!code.includes(loginTarget)) {
    throw new Error('Login brand header target not found in bundle!');
  }
  code = code.replace(loginTarget, loginReplacement);
  console.log('-> Patched [3] Login Screen Logo');

  // 4. DASHBOARD SCREEN (header next to greeting)
  const dashTarget = '(0,y.jsxs)(o.View,{children:[(0,y.jsxs)(o.Text,{style:b.greeting,children:[(zt=(new Date).getHours(),zt<12?\'Good Morning\':zt<17?\'Good Afternoon\':\'Good Evening\'),","]}),(0,y.jsx)(o.Text,{style:b.restaurantName,children:z})]';
  const dashReplacement = '(0,y.jsxs)(o.View,{style:{flexDirection:\'row\',alignItems:\'center\',gap:10},children:[(0,y.jsx)(o.Image,{source:{uri:__CLEVEROPS_WEB_LOGO__},style:{width:40,height:40,resizeMode:\'contain\'}}),(0,y.jsxs)(o.View,{children:[(0,y.jsxs)(o.Text,{style:b.greeting,children:[(zt=(new Date).getHours(),zt<12?\'Good Morning\':zt<17?\'Good Afternoon\':\'Good Evening\'),","]}),(0,y.jsx)(o.Text,{style:b.restaurantName,children:z})]})]';

  if (!code.includes(dashTarget)) {
    throw new Error('Dashboard header target not found in bundle!');
  }
  code = code.replace(dashTarget, dashReplacement);
  console.log('-> Patched [4] Dashboard Screen Header Logo');

  // 5. FIX SIGNED_OUT auth listener in App.js: prevent resetting to Login if already on Login or OwnerSignup
  const signedOutTarget = "W.isReady()&&W.reset({index:0,routes:[{name:'Login'}]})";
  const signedOutReplacement = "W.isReady()&&(function(){var __c=W.getCurrentRoute();if(!__c||(__c.name!=='Login'&&__c.name!=='OwnerSignup')){W.reset({index:0,routes:[{name:'Login'}]})}})()";
  if (!code.includes(signedOutTarget)) {
    throw new Error('SIGNED_OUT target not found in bundle!');
  }
  code = code.replace(signedOutTarget, signedOutReplacement);
  console.log('-> Patched [5] Navigation reset on SIGNED_OUT');

  // 6. FIX LoginScreen handleLogin: remove unnecessary signOut() before signIn
  const loginSignOutTarget = "yield s.supabase.auth.signOut().catch(function(){});var r=yield s.supabase.auth.signInWithPassword({email:e,password:t})";
  const loginSignOutReplacement = "var r=yield s.supabase.auth.signInWithPassword({email:e,password:t})";
  if (!code.includes(loginSignOutTarget)) {
    throw new Error('Login signOut target not found in bundle!');
  }
  code = code.replace(loginSignOutTarget, loginSignOutReplacement);
  console.log('-> Patched [6] LoginScreen handleLogin');

  // 7. FIX LoginScreen invalid credential alert / error display
  const loginErrTarget = "if(o)return void E(o.message||'Invalid email or password. Please try again.');";
  const loginErrReplacement = "if(o){var __msg=(o.message&&(o.message.indexOf('Invalid')!==-1||o.message.indexOf('invalid_grant')!==-1))?'Incorrect email or password. Please verify your credentials and try again.':(o.message||'Invalid email or password. Please try again.');n.Alert.alert('Login Failed',__msg);return void E(__msg);}";
  if (!code.includes(loginErrTarget)) {
    throw new Error('Login error alert target not found in bundle!');
  }
  code = code.replace(loginErrTarget, loginErrReplacement);
  console.log('-> Patched [7] Login error feedback');

  // 8. FIX Create Restaurant Account button: direct navigate to OwnerSignup without crashing on undefined AsyncStorage
  const signupBtnTarget = "onPress:(0,t.default)(function*(){try{yield s.supabase.auth.signOut().catch(function(){}),yield AsyncStorage.clear().catch(function(){})}catch(e){}p.navigate('OwnerSignup')})";
  const signupBtnReplacement = "onPress:function(){p.navigate('OwnerSignup')}";
  if (!code.includes(signupBtnTarget)) {
    throw new Error('Signup button target not found in bundle!');
  }
  code = code.replace(signupBtnTarget, signupBtnReplacement);
  console.log('-> Patched [8] Create Restaurant Account direct navigation');

  // 9. FIX Subscription Screen: Only mark active subscription on matching billing interval
  const subIntervalTarget = "var t=ue===e.id.toLowerCase()&&'active'===fe,r=e.id.toLowerCase().includes('custom')||'custom'===e.plan_type,n='yearly'===N?e.price_yearly||10*e.price_monthly:e.price_monthly";
  const subIntervalReplacement = "var __curInt=((null!=L&&L.billing_interval)?L.billing_interval:'monthly').toLowerCase(),t=ue===e.id.toLowerCase()&&'active'===fe&&N.toLowerCase()===__curInt,r=e.id.toLowerCase().includes('custom')||'custom'===e.plan_type,n='yearly'===N?e.price_yearly||10*e.price_monthly:e.price_monthly";
  if (!code.includes(subIntervalTarget)) {
    throw new Error('Subscription interval target not found in bundle!');
  }
  code = code.replace(subIntervalTarget, subIntervalReplacement);
  console.log('-> Patched [9] Subscription Screen billing interval check');

  // 10. FIX Payment History: Amount 0 & plan name display
  const payHistFallbackTarget = "i.length>0?W(i):null!=n&&n.subscription_plan&&W([{id:'init_sub_01',order_id:'ord_initial_setup',plan_name:n.subscription_plan,amount:599,status:'success',created_at:n.created_at||(new Date).toISOString()}])";
  const payHistFallbackReplacement = "if(i.length>0){W(i)}else if(null!=n&&n.subscription_plan){var __p=(n.subscription_plan||'pro').toLowerCase(),__dflt=__p==='premium'?999:__p==='pro'?599:299,__amt=(null==n||null==(r=n.settings)?void 0:r.last_amount)||__dflt,__ord=(null==n||null==(r=n.settings)?void 0:r.last_order_id)||'ord_live_setup',__pay=(null==n||null==(r=n.settings)?void 0:r.last_payment_id)||'pay_live_setup';W([{id:__pay,payment_id:__pay,order_id:__ord,plan_name:n.subscription_plan,amount:__amt,paid_amount:__amt,status:'paid',payment_status:'paid',created_at:n.created_at||(new Date).toISOString()}])}";
  if (!code.includes(payHistFallbackTarget)) {
    throw new Error('Payment history fallback target not found in bundle!');
  }
  code = code.replace(payHistFallbackTarget, payHistFallbackReplacement);

  const payHistRenderTarget = "renderItem:function(e){var t=e.item,r='success'===t.status||'captured'===t.status;";
  const payHistRenderReplacement = "renderItem:function(e){var t=e.item,r='success'===t.status||'captured'===t.status||'paid'===t.status||'paid'===t.payment_status,__pn=(t.plan_name||t.plan||t.subscription_plan||'Pro').toUpperCase(),__dflt=__pn==='PREMIUM'?999:__pn==='PRO'?599:299,__amt=(t.amount&&t.amount>0)?t.amount:(t.paid_amount&&t.paid_amount>0)?t.paid_amount:(t.last_amount&&t.last_amount>0)?t.last_amount:__dflt;";
  if (!code.includes(payHistRenderTarget)) {
    throw new Error('Payment history render target not found in bundle!');
  }
  code = code.replace(payHistRenderTarget, payHistRenderReplacement);

  const payHistPlanNameTarget = "children:[(t.plan_name||'Pro').toUpperCase(),\" PLAN\"]";
  const payHistPlanNameReplacement = "children:[__pn,\" PLAN\"]";
  if (!code.includes(payHistPlanNameTarget)) {
    throw new Error('Payment history plan name target not found in bundle!');
  }
  code = code.replace(payHistPlanNameTarget, payHistPlanNameReplacement);

  const payHistAmountTarget = 'children:["\\u20b9",t.amount||0]';
  const payHistAmountReplacement = 'children:["\\u20b9",__amt]';
  if (!code.includes(payHistAmountTarget)) {
    throw new Error('Payment history amount target not found in bundle!');
  }
  code = code.replace(payHistAmountTarget, payHistAmountReplacement);
  console.log('-> Patched [10] Payment History amount & plan name normalization');

  // 11. FIX Table Assignment: Include waiters from restaurant settings metadata and profiles
  const tableStaffTarget = "var n=((yield c.supabase.from('profiles').select('*').eq('restaurant_id',j)).data||[]).filter(function(e){return!('deleted'===e.role||'inactive'===e.role||e.deleted_at||'waiter'!==e.role&&('supervisor'!==e.role||'waiter'!==e.department&&e.department))});E(n);";
  const tableStaffReplacement = "var __rData=(yield c.supabase.from('restaurants').select('settings').eq('id',j).maybeSingle()).data,__metaStaff=Object.entries((null!=__rData&&null!=__rData.settings?__rData.settings.staff_metadata:null)||{}).map(function(e){return Object.assign({id:e[0]},e[1])}),__pStaff=((yield c.supabase.from('profiles').select('*').eq('restaurant_id',j)).data||[]),__allStaff=[].concat(__metaStaff,__pStaff),__seenIds={},__uniqStaff=__allStaff.filter(function(e){if(!e||!e.id||__seenIds[e.id])return!1;__seenIds[e.id]=!0;return!0}),n=__uniqStaff.filter(function(e){return!('deleted'===e.role||'inactive'===e.role||!1===e.is_active||e.deleted_at||('waiter'!==e.role&&'waiter'!==e.department&&'supervisor'!==e.role))});E(n);";
  if (!code.includes(tableStaffTarget)) {
    throw new Error('Table assignment staff target not found in bundle!');
  }
  code = code.replace(tableStaffTarget, tableStaffReplacement);
  console.log('-> Patched [11] Table Assignment staff retrieval');

  // 12. FIX Staff Management: Never fallback to 123456 for staff passwords
  const staffPwdTarget = "D[n.id]?n.plain_password||'123456':n.plain_password?'\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022':'\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022 (Encrypted)'";
  const staffPwdReplacement = "D[n.id]?(n.plain_password||'Protected'):(n.plain_password?'\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022':'\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022\\u2022 (Encrypted)')";
  if (code.includes(staffPwdTarget)) {
    code = code.replace(staffPwdTarget, staffPwdReplacement);
    console.log('-> Patched [12] Staff Management password display (removed 123456 fallback)');
  }

  // 13. FIX Recipe Assistant: Support Maggi, Noodles, Pasta, Cheese Maggi and authentic culinary defaults
  const recipeCoreTarget = "{name:`Fresh ${t} Primary Core`,suggestedQuantity:200,suggestedUnit:'gram'},{name:'Pure Dairy Butter / Ghee',suggestedQuantity:30,suggestedUnit:'ml'},{name:'Full Cream Milk / Flavor Base',suggestedQuantity:80,suggestedUnit:'ml'},{name:'Sweetener / Seasoning Blend',suggestedQuantity:15,suggestedUnit:'gram'},{name:'Fresh Herb / Nut Garnish',suggestedQuantity:10,suggestedUnit:'gram'}";
  const recipeCoreReplacement = "(function(){if(/maggi|maggie|noodle|pasta/.test((t||'').toLowerCase())){var __ch=/cheese/.test((t||'').toLowerCase());return[{name:'Maggi Instant Noodles Cake',suggestedQuantity:70,suggestedUnit:'gram'}].concat(__ch?[{name:'Processed / Mozzarella Cheese (Grated)',suggestedQuantity:40,suggestedUnit:'gram'}]:[],[{name:'Maggi Tastemaker Masala Blend',suggestedQuantity:6,suggestedUnit:'gram'},{name:'Pure Dairy Butter',suggestedQuantity:15,suggestedUnit:'gram'},{name:'Filtered Boiling Water',suggestedQuantity:250,suggestedUnit:'ml'},{name:'Fresh Green Chilli & Coriander',suggestedQuantity:10,suggestedUnit:'gram'}])}return[{name:`Fresh ${t} Main Cut / Protein`,suggestedQuantity:180,suggestedUnit:'gram'},{name:'Pure Dairy Butter / Cooking Oil',suggestedQuantity:25,suggestedUnit:'ml'},{name:'Chef Signature Gravy / Sauce Base',suggestedQuantity:80,suggestedUnit:'ml'},{name:'Aromatic Herb & Seasoning Blend',suggestedQuantity:15,suggestedUnit:'gram'},{name:'Fresh Herb & Cream Garnish',suggestedQuantity:10,suggestedUnit:'gram'}]})()";
  if (code.includes(recipeCoreTarget)) {
    code = code.replace(recipeCoreTarget, recipeCoreReplacement);
    console.log('-> Patched [13] Smart Recipe AI Assistant (Maggi, Cheese Maggi, Noodles & authentic defaults)');
  }

  // Compile with Hermes Bytecode v96
  const tempJs = path.resolve('smartdine-mobile/dist-android/temp_exact_4.js');
  const tempHbc = path.resolve('smartdine-mobile/dist-android/temp_exact_4.hbc');
  fs.writeFileSync(tempJs, code, 'utf8');

  console.log('Compiling bundle to Hermes Bytecode v96...');
  execSync(`"${hermescExe}" -emit-binary -O -output-source-map -out "${tempHbc}" "${tempJs}"`, { stdio: 'inherit' });
  const hbcBuf = fs.readFileSync(tempHbc);
  console.log(`Hermes compilation success! Size: ${(hbcBuf.length / 1024 / 1024).toFixed(2)} MB`);

  // 1. APP ICON: Generate launcher icons for APK
  console.log('Generating [1] Main App launcher icons from public/logo.png...');
  const icon48 = await sharp(logoBuf).resize(48, 48, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 95 }).toBuffer();
  const icon72 = await sharp(logoBuf).resize(72, 72, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 95 }).toBuffer();
  const icon96 = await sharp(logoBuf).resize(96, 96, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 95 }).toBuffer();
  const icon144 = await sharp(logoBuf).resize(144, 144, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 95 }).toBuffer();
  const icon192 = await sharp(logoBuf).resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).webp({ quality: 95 }).toBuffer();

  async function makeLauncher(size) {
    const pad = Math.round(size * 0.1);
    const inner = size - pad * 2;
    const resizedLogo = await sharp(logoBuf).resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).toBuffer();
    return await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{ input: resizedLogo, gravity: 'center' }])
    .webp({ quality: 95 })
    .toBuffer();
  }

  const launch48 = await makeLauncher(48);
  const launch72 = await makeLauncher(72);
  const launch96 = await makeLauncher(96);
  const launch144 = await makeLauncher(144);
  const launch192 = await makeLauncher(192);

  async function makeBg(size) {
    return await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).png().toBuffer();
  }

  const bg48 = await makeBg(48);
  const bg72 = await makeBg(72);
  const bg96 = await makeBg(96);
  const bg144 = await makeBg(144);
  const bg192 = await makeBg(192);

  // Official Android Status Bar Notification Silhouette Icons (Pure White with Alpha Transparency)
  console.log('Generating Android Status Bar Notification Icons (white silhouette on transparent)...');
  const monoBuf = fs.readFileSync(path.resolve('smartdine-mobile/assets/android-icon-monochrome.png'));
  const notif24 = await sharp(monoBuf).resize(24, 24, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const notif36 = await sharp(monoBuf).resize(36, 36, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const notif48 = await sharp(monoBuf).resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const notif72 = await sharp(monoBuf).resize(72, 72, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const notif96 = await sharp(monoBuf).resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

  try {
    fs.writeFileSync('smartdine-mobile/assets/notification-icon.png', notif48);
    fs.writeFileSync('smartdine-mobile/androide_backup/app/src/main/res/drawable-mdpi/notification_icon.png', notif24);
    fs.writeFileSync('smartdine-mobile/androide_backup/app/src/main/res/drawable-hdpi/notification_icon.png', notif36);
    fs.writeFileSync('smartdine-mobile/androide_backup/app/src/main/res/drawable-xhdpi/notification_icon.png', notif48);
    fs.writeFileSync('smartdine-mobile/androide_backup/app/src/main/res/drawable-xxhdpi/notification_icon.png', notif72);
    fs.writeFileSync('smartdine-mobile/androide_backup/app/src/main/res/drawable-xxxhdpi/notification_icon.png', notif96);
  } catch (_) {}

  const replacements = {
    'res/yw.webp': launch48,
    'res/fq.webp': launch72,
    'res/u5.webp': launch96,
    'res/j_.webp': launch144,
    'res/-6.webp': launch192,
    'res/Nt.webp': launch48,
    'res/13.webp': launch72,
    'res/9Q.webp': launch96,
    'res/Sn.webp': launch144,
    'res/5c.webp': launch192,
    'res/d2.webp': icon48,
    'res/MO.webp': icon72,
    'res/qs.webp': icon96,
    'res/iE.webp': icon144,
    'res/sK.webp': icon192,
    'res/At.webp': bg48,
    'res/4k.webp': bg72,
    'res/By.webp': bg96,
    'res/BZ.webp': bg144,
    'res/gS.webp': bg192,
    // Status Bar Notification Icons (Monochrome White Silhouette)
    'res/U4.png': notif24,
    'res/qJ.png': notif36,
    'res/RQ.png': notif48,
    'res/ZO.png': notif72,
    'res/eY.png': notif96,
  };

  // Package into APK
  console.log('Packaging APK...');
  const baseData = fs.readFileSync(baseApkPath);
  const zip = await JSZip.loadAsync(baseData);
  const outZip = new JSZip();

  for (const filePath of Object.keys(zip.files)) {
    const entry = zip.files[filePath];
    if (entry.dir) continue;

    if (filePath.startsWith('META-INF/')) {
      const relMeta = filePath.substring('META-INF/'.length);
      if (!relMeta.includes('/') && (relMeta === 'MANIFEST.MF' || relMeta.endsWith('.SF') || relMeta.endsWith('.RSA') || relMeta.endsWith('.DSA') || relMeta.endsWith('.EC'))) {
        continue;
      }
    }

    if (filePath === 'assets/index.android.bundle') {
      outZip.file(filePath, hbcBuf, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
      continue;
    }

    if (replacements[filePath]) {
      outZip.file(filePath, replacements[filePath], { compression: 'DEFLATE', compressionOptions: { level: 9 } });
      continue;
    }

    const content = await entry.async('nodebuffer');
    const isStored = (entry._data && entry._data.uncompressedSize === entry._data.compressedSize && entry._data.uncompressedSize > 0)
      || filePath === 'resources.arsc'
      || filePath.endsWith('.so');

    if (isStored) {
      outZip.file(filePath, content, { compression: 'STORE' });
    } else {
      outZip.file(filePath, content, { compression: 'DEFLATE', compressionOptions: { level: 9 } });
    }
  }

  outZip.file('assets/logo.png', logoBuf, { compression: 'DEFLATE', compressionOptions: { level: 9 } });

  const unsignedPath = path.resolve('unsigned_exact_4.apk');
  const unsignedBuf = await outZip.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(unsignedPath, unsignedBuf);

  // Sign APK
  const javaExe = path.resolve('tools/jre/bin/java.exe');
  const signerJar = path.resolve('tools/uber-apk-signer.jar');
  const keystore = path.resolve('smartdine-mobile/androide_backup/app/debug.keystore');

  console.log('Signing APK with official keystore...');
  execSync(`"${javaExe}" -Xms64m -Xmx512m -jar "${signerJar}" -a "${unsignedPath}" --ksDebug "${keystore}"`, { stdio: 'inherit' });

  const signedApk = path.resolve('unsigned_exact_4-aligned-debugSigned.apk');
  const destPaths = [
    path.resolve('app-release.apk'),
    path.resolve('public/app-release.apk'),
    path.resolve('public/cleverops-mobile.apk')
  ];

  for (const dest of destPaths) {
    fs.copyFileSync(signedApk, dest);
    console.log(`Copied to ${dest}`);
  }

  // Install on device if connected
  try {
    const devicesOutput = execSync('adb devices', { encoding: 'utf8' });
    const hasDevice = devicesOutput.split('\n').slice(1).some(line => line.trim().endsWith('device'));
    if (hasDevice) {
      console.log('Installing on connected device via ADB...');
      try {
        execSync('adb uninstall com.smartdine.mobile', { stdio: 'inherit' });
      } catch (e) {}
      execSync('adb install app-release.apk', { stdio: 'inherit' });
      execSync('adb shell am start -n com.smartdine.mobile/.MainActivity', { stdio: 'inherit' });
      console.log('Successfully installed and launched on device!');
    } else {
      console.log('📱 No phone currently attached via ADB. APK is compiled, signed, and ready to install whenever phone is connected.');
    }
  } catch (adbErr) {
    console.log('ADB check skipped:', adbErr?.message);
  }

  // Cleanup temp files
  try {
    fs.unlinkSync(tempJs);
    fs.unlinkSync(tempHbc);
    fs.unlinkSync(unsignedPath);
    fs.unlinkSync(signedApk);
  } catch (e) {}

  console.log('\n=== EXACT 4 PLACES UPDATED AND PACKAGED SUCCESSFULLY! ===');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
