async function verifyAll() {
  const staffRes = await fetch('https://www.cleverops.in/api/staff/list?restaurantId=81fa8201-51d7-4da5-98f5-a52dbff4e6ae');
  const { staff } = await staffRes.json();

  const toVerify = [
    { email: 'newlifeofdeepsssa@gmail.com', otp: '31977024', label: '1. KDS Kitchen' },
    { email: 'samridhtomar8@gmail.com', otp: '19650349', label: '2. Waiter 1' },
    { email: 'poojagarg0885@gmail.com', otp: '76579637', label: '3. Waiter 2' },
    { email: 'deepak.soni19492@gmail.com', otp: '54428962', label: '4. Cashier' }
  ];

  for (const item of toVerify) {
    const s = staff.find(x => x.email === item.email);
    console.log(`Verifying ${item.label} (${item.email}) - StaffId: ${s?.id}...`);
    const res = await fetch('https://www.cleverops.in/api/staff/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: item.email,
        otp: item.otp,
        staffId: s?.id,
        restaurantId: '81fa8201-51d7-4da5-98f5-a52dbff4e6ae'
      })
    });
    const data = await res.json();
    console.log(` -> Status: ${res.status}, Result:`, JSON.stringify(data));
  }
}

verifyAll();
