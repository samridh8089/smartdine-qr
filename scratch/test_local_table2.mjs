async function testLocalTable2() {
  const table2Id = '9195b058-e4b2-4d76-b6d8-7b987515a44a'; // Table 2
  const restaurantId = '81fa8201-51d7-4da5-98f5-a52dbff4e6ae';

  try {
    const res = await fetch('http://localhost:3000/api/customer/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        restaurantId,
        tableId: table2Id,
        orderType: 'dine_in',
        items: [
          { menuItemId: '9f67eb2c-9d2d-4643-8414-2c84e15516d6', quantity: 1, price: 180 }
        ]
      })
    });

    console.log('Localhost Status:', res.status);
    const body = await res.text();
    console.log('Localhost Body:', body);
  } catch (err) {
    console.log('Localhost error:', err.message);
  }
}

testLocalTable2();
